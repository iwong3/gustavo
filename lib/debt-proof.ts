/**
 * The debts page's two settle plans and the "proof" behind them.
 *
 *   plans      — 'fewest' (simplifyDebts: may route money through a third
 *                person) and 'direct' (pay who you owe: each pair's net, with
 *                loops cancelled — never pays anyone you don't owe).
 *   waterfall  — one person's balance, built from what they owe / are owed by
 *                each person directly (expenses only) plus the payments they've
 *                recorded. It always lands on exactly what the plan asks.
 *   expenses   — every expense's effect on that balance, per counterparty.
 *   hand-offs  — why a plan payment goes to someone other than who you owe:
 *                the difference between the plan and the direct debts, as
 *                chains of people.
 *
 * Money is handled in integer cents so every level adds up to the cent.
 * Ids are opaque keys (BIGINT strings at runtime): compared via String().
 *
 * Pure — no React, no DB. Tested in tests/debt-proof.test.ts.
 */

import { directPairwiseSettlements, simplifyDebts, type Settlement } from './debt'
import type { SettlementRecord, SettlePlan, UserSummary } from './types'

export type { SettlePlan }

type DebtMap = Map<number, Map<number, number>>
type Participant = Pick<UserSummary, 'id'>

// --- Plans ---

export const isSettlePlan = (v: unknown): v is SettlePlan =>
    v === 'fewest' || v === 'direct'

/** Legacy rows (before plans were recorded) settled under 'fewest'. */
export const planOf = (r: { plan?: string | null }): SettlePlan =>
    isSettlePlan(r.plan) ? r.plan : 'fewest'

/** The plan a trip is locked to: whatever its recorded payments used. */
export function lockedPlan(records: { plan?: string | null }[]): SettlePlan | null {
    return records.length > 0 ? planOf(records[0]) : null
}

export const toCents = (usd: number) => Math.round(usd * 100)

const key = (id: number | string) => String(id)

/** Walk a cents graph for any cycle; returns its nodes in order, or null. */
function findCycle(graph: Map<string, Map<string, number>>, order: string[]): string[] | null {
    const state = new Map<string, 1 | 2>() // 1 = on the stack, 2 = done
    const stack: string[] = []
    const visit = (node: string): string[] | null => {
        state.set(node, 1)
        stack.push(node)
        for (const [next, cents] of Array.from(graph.get(node)?.entries() ?? [])) {
            if (cents <= 0) continue
            const s = state.get(next)
            if (s === 1) return stack.slice(stack.indexOf(next))
            if (s === undefined) {
                const found = visit(next)
                if (found) return found
            }
        }
        stack.pop()
        state.set(node, 2)
        return null
    }
    for (const node of order) {
        if (state.has(node)) continue
        const found = visit(node)
        if (found) return found
    }
    return null
}

/**
 * "Pay who you owe": each pair's direct net, then any loop of debts
 * (A owes B, B owes C, C owes A) cancelled by its smallest link. Every
 * payment goes to someone the payer really owes, for no more than they owe
 * them, and each person's balance is unchanged by the cancelling.
 */
export function directPlan(debtMap: DebtMap, participants: Participant[]): Settlement[] {
    const graph = new Map<string, Map<string, number>>()
    const idOf = new Map<string, number>()
    for (const p of participants) idOf.set(key(p.id), p.id)
    for (const s of directPairwiseSettlements(debtMap, participants)) {
        const cents = toCents(s.amount)
        if (cents <= 0) continue
        const out = graph.get(key(s.debtorId)) ?? new Map<string, number>()
        out.set(key(s.creditorId), cents)
        graph.set(key(s.debtorId), out)
    }
    const order = participants.map((p) => key(p.id))
    for (let cycle = findCycle(graph, order); cycle; cycle = findCycle(graph, order)) {
        const links = cycle.map((from, i) => [from, cycle[(i + 1) % cycle.length]] as const)
        const smallest = Math.min(...links.map(([a, b]) => graph.get(a)!.get(b)!))
        for (const [a, b] of links) {
            const left = graph.get(a)!.get(b)! - smallest
            if (left > 0) graph.get(a)!.set(b, left)
            else graph.get(a)!.delete(b)
        }
    }
    const out: Settlement[] = []
    graph.forEach((tos, from) =>
        tos.forEach((cents, to) =>
            out.push({ debtorId: idOf.get(from)!, creditorId: idOf.get(to)!, amount: cents / 100 })
        )
    )
    return out
}

/** The payments a plan asks for, from the current (settlement-applied) debts. */
export function planSettlements(
    plan: SettlePlan,
    debtMap: DebtMap,
    participants: Participant[]
): Settlement[] {
    return plan === 'direct' ? directPlan(debtMap, participants) : simplifyDebts(debtMap, participants)
}

/** A person's net under a plan, in cents: + they receive, − they pay. */
export function planNetCents(plan: Settlement[], personId: number): number {
    let cents = 0
    for (const s of plan) {
        if (key(s.creditorId) === key(personId)) cents += toCents(s.amount)
        else if (key(s.debtorId) === key(personId)) cents -= toCents(s.amount)
    }
    return cents
}

// --- Rounding that adds up ---

/**
 * Round dollar amounts to cents so they sum to exactly `targetCents`:
 * round each to the nearest cent, then hand the leftover cents to the
 * values whose rounding moved them furthest. Without this, rows rounded
 * one by one can disagree with their total by a cent — the kind of
 * "mistake" that makes people distrust the numbers.
 */
export function roundToTotal(values: number[], targetCents: number): number[] {
    const exact = values.map((v) => v * 100)
    const cents = exact.map((v) => Math.round(v))
    let diff = targetCents - cents.reduce((t, c) => t + c, 0)
    if (values.length === 0) return cents
    // Largest shortfall first when adding, largest overshoot first when taking
    const order = exact
        .map((v, i) => ({ i, err: v - cents[i] }))
        .sort((a, b) => (diff > 0 ? b.err - a.err : a.err - b.err))
    for (let n = 0; diff !== 0; n++) {
        const step = diff > 0 ? 1 : -1
        cents[order[n % order.length].i] += step
        diff -= step
    }
    return cents
}

// --- Per-expense effects ---

/**
 * How one expense moves `personId`'s balance, per counterparty (dollars):
 * + that person owes them for it, − they owe that person. Mirrors
 * computeDebtMap (lib/spend.ts) rule for rule, so summing it over every
 * expense gives exactly the debt map's pair nets.
 */
export function expenseBalanceEffects(
    exp: {
        paidBy: { id: number }
        splitBetween: { id: number }[]
        coveredParticipants: { id: number }[]
        isEveryone: boolean
    },
    personId: number,
    usdValue: number,
    participantCount: number
): Map<string, number> {
    const effects = new Map<string, number>()
    const splitCount = exp.isEveryone ? participantCount : exp.splitBetween.length
    if (splitCount === 0) return effects
    const splitCost = usdValue / splitCount
    const payer = key(exp.paidBy.id)
    const me = key(personId)
    const covered = new Set(exp.coveredParticipants.map((p) => key(p.id)))
    for (const p of exp.splitBetween) {
        const other = key(p.id)
        if (other === payer || covered.has(other)) continue
        if (payer === me) effects.set(other, (effects.get(other) ?? 0) + splitCost)
        else if (other === me) effects.set(payer, (effects.get(payer) ?? 0) - splitCost)
    }
    return effects
}

// --- The waterfall ---

export type BalanceStep =
    /** Expenses between this person and `userId`: + they owe you, − you owe them. */
    | { kind: 'person'; userId: number; cents: number }
    /** Payments recorded with `userId`: + you paid them, − they paid you. */
    | { kind: 'paid'; userId: number; cents: number; count: number }

/**
 * One person's balance as a waterfall: expense nets per counterparty
 * (largest first, the direction of the result leading), then recorded
 * payments. The steps sum to exactly `totalCents` — pass the plan's net for
 * the person (planNetCents) so the chart ends where the payments start.
 */
export function balanceSteps(
    personId: number,
    expenseDebtMap: DebtMap,
    records: SettlementRecord[],
    participants: Participant[],
    totalCents: number
): BalanceStep[] {
    const me = key(personId)
    type Raw = { kind: 'person' | 'paid'; userId: number; usd: number; count: number }
    const raw: Raw[] = []
    for (const p of participants) {
        if (key(p.id) === me) continue
        const theyOwe = expenseDebtMap.get(p.id)?.get(personId) ?? 0
        const iOwe = expenseDebtMap.get(personId)?.get(p.id) ?? 0
        const net = theyOwe - iOwe
        if (Math.abs(net) >= 0.005) raw.push({ kind: 'person', userId: p.id, usd: net, count: 0 })
    }
    const paid = new Map<string, Raw>()
    for (const r of records) {
        if (!Number.isFinite(r.amountUsd)) continue
        const iPaid = key(r.fromUserId) === me
        if (!iPaid && key(r.toUserId) !== me) continue
        const other = iPaid ? r.toUserId : r.fromUserId
        const k = `${key(other)}:${iPaid ? 'out' : 'in'}`
        const row = paid.get(k) ?? { kind: 'paid', userId: other, usd: 0, count: 0 }
        row.usd += iPaid ? r.amountUsd : -r.amountUsd
        row.count++
        paid.set(k, row)
    }
    const sign = totalCents < 0 ? -1 : 1
    raw.sort((a, b) => {
        const lead = Number(Math.sign(b.usd) === sign) - Number(Math.sign(a.usd) === sign)
        return lead !== 0 ? lead : Math.abs(b.usd) - Math.abs(a.usd)
    })
    const all = [...raw, ...Array.from(paid.values())]
    const cents = roundToTotal(all.map((r) => r.usd), totalCents)
    return all.map((r, i) =>
        r.kind === 'person'
            ? { kind: 'person', userId: r.userId, cents: cents[i] }
            : { kind: 'paid', userId: r.userId, cents: cents[i], count: r.count }
    )
}

// --- Hand-offs: why a payment goes where it goes ---

/** A payment between two people: `from` pays `to`. */
export type Move = { from: number; to: number }

type ChainLink = Move & { verb: 'owes' | 'pays' }

/**
 * One swap: "$X — instead of `dropped` (direct debts), `added` (plan
 * payments)". Loops in Pay who you owe have no `added`: they just cancel.
 */
export type Handoff = {
    cents: number
    /** The counterparty on the person's in-link (whose debt moves on). */
    from: number
    /** The counterparty on their out-link (where it goes instead). */
    to: number
    /** Direct debts this swap replaces — the person's own first. */
    dropped: Move[]
    /** Plan payments that replace them — the person's own first. */
    added: Move[]
}

/**
 * Explain a plan to one person: every way their payments differ from their
 * direct debts. The plan minus the direct debts is a set of loops (every
 * person's total is the same under both); each loop through this person is
 * one hand-off. Loops that don't touch them don't change their payments.
 */
export function planHandoffs(
    personId: number,
    debtMap: DebtMap,
    plan: Settlement[],
    participants: Participant[]
): Handoff[] {
    // Signed cents along a→b: + means a → b
    const along = (list: Settlement[]) => {
        const m = new Map<string, number>()
        for (const s of list) {
            const c = toCents(s.amount)
            const ab = `${key(s.debtorId)}>${key(s.creditorId)}`
            const ba = `${key(s.creditorId)}>${key(s.debtorId)}`
            m.set(ab, (m.get(ab) ?? 0) + c)
            m.set(ba, (m.get(ba) ?? 0) - c)
        }
        return m
    }
    const planAlong = along(plan)
    const directAlong = along(directPairwiseSettlements(debtMap, participants))
    const ids = participants.map((p) => key(p.id))
    const idOf = new Map(participants.map((p) => [key(p.id), p.id]))
    // The difference: how much more the plan moves along a→b than the direct debts
    const diff = new Map<string, Map<string, number>>()
    for (const a of ids) {
        for (const b of ids) {
            if (a === b) continue
            const d = (planAlong.get(`${a}>${b}`) ?? 0) - (directAlong.get(`${a}>${b}`) ?? 0)
            if (d > 0) {
                const out = diff.get(a) ?? new Map<string, number>()
                out.set(b, d)
                diff.set(a, out)
            }
        }
    }
    const planPays = (a: string, b: string) => (planAlong.get(`${a}>${b}`) ?? 0) > 0
    // A diff link a→b is either the plan paying a→b, or b's direct debt to a going unpaid
    const link = (a: string, b: string): ChainLink =>
        planPays(a, b)
            ? { from: idOf.get(a)!, to: idOf.get(b)!, verb: 'pays' }
            : { from: idOf.get(b)!, to: idOf.get(a)!, verb: 'owes' }

    const me = key(personId)
    const found = new Map<string, Handoff>()
    // Each out-link from me sits on a loop back to me (the diff is balanced)
    for (let guard = 0; guard < 1000; guard++) {
        const outs = diff.get(me)
        const first = outs ? Array.from(outs.entries()).find(([, c]) => c > 0) : undefined
        if (!first) break
        const [w] = first
        // Shortest path w → … → me
        const prev = new Map<string, string>([[w, w]])
        const queue = [w]
        while (queue.length && !prev.has(me)) {
            const at = queue.shift()!
            for (const [next, c] of Array.from(diff.get(at)?.entries() ?? [])) {
                if (c > 0 && !prev.has(next)) {
                    prev.set(next, at)
                    queue.push(next)
                }
            }
        }
        if (!prev.has(me)) {
            // Rounding left a stray cent with no way back — drop it
            outs!.delete(w)
            continue
        }
        const path = [me]
        for (let at = me; at !== w; at = prev.get(at)!) path.unshift(prev.get(at)!)
        const loop = [me, ...path] // me → w → … → u → me
        const links = loop.slice(0, -1).map((a, i) => [a, loop[i + 1]] as const)
        const cents = Math.min(...links.map(([a, b]) => diff.get(a)!.get(b)!))
        for (const [a, b] of links) {
            const left = diff.get(a)!.get(b)! - cents
            if (left > 0) diff.get(a)!.set(b, left)
            else diff.get(a)!.delete(b)
        }
        const u = loop[loop.length - 2]
        // Each link is a plan payment that's added, or a direct debt that's
        // dropped. Dropped ones read from my side (my own debt first).
        const added: Move[] = []
        const dropped: Move[] = []
        for (const [a, b] of links) {
            const l = link(a, b)
            if (l.verb === 'pays') added.push({ from: l.from, to: l.to })
            else dropped.unshift({ from: l.from, to: l.to })
        }
        const k = [...dropped, { from: -1, to: -1 }, ...added].map((m) => `${m.from}>${m.to}`).join(',')
        const existing = found.get(k)
        if (existing) existing.cents += cents
        else found.set(k, { cents, from: idOf.get(u)!, to: idOf.get(w)!, dropped, added })
    }
    return Array.from(found.values()).sort((a, b) => b.cents - a.cents)
}
