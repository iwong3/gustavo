/**
 * Tests for the debts page's plans and proof (lib/debt-proof.ts). The page
 * promises that every level adds up — plan payments, the balance waterfall,
 * the per-expense list — so these check those invariants on random trips,
 * with runtime-truth string ids.
 */
import { describe, expect, it } from 'vitest'

import { applySettlements, directPairwiseSettlements, simplifyDebts } from '../lib/debt'
import {
    balanceSteps,
    directPlan,
    expenseBalanceEffects,
    lockedPlan,
    planHandoffs,
    planNetCents,
    planSettlements,
    roundToTotal,
    toCents,
    type SettlePlan,
} from '../lib/debt-proof'
import { computeDebtMap, type SpendExpense } from '../lib/spend'
import type { SettlementRecord } from '../lib/types'

type Id = number
const id = (n: number) => String(n) as unknown as Id
const people = [1, 2, 3, 4, 5, 6].map((n) => ({ id: id(n) }))

/** Deterministic PRNG so failures reproduce. */
function rng(seed: number) {
    let s = seed
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296
        return s / 4294967296
    }
}

function randomTrip(seed: number, count = 25) {
    const r = rng(seed)
    const n = 3 + Math.floor(r() * 4)
    const who = people.slice(0, n)
    const expenses: SpendExpense[] = []
    for (let i = 0; i < count; i++) {
        const payer = who[Math.floor(r() * n)]
        const everyone = r() < 0.4
        const split = everyone ? who : who.filter(() => r() < 0.6)
        if (split.length === 0) continue
        const covered = split.filter((p) => p.id !== payer.id && r() < 0.1)
        const cost = Math.round(r() * 30000) / 100
        expenses.push({
            currency: 'USD',
            costOriginal: cost,
            costConvertedUsd: cost,
            categorySlug: 'food',
            localCurrencyReceived: null,
            paidBy: payer,
            isEveryone: everyone,
            splitBetween: split,
            coveredParticipants: covered,
        })
    }
    return { who, expenses }
}

const record = (from: number, to: number, amountUsd: number, plan: SettlePlan = 'fewest'): SettlementRecord => ({
    id: id(900 + from * 10 + to),
    fromUserId: id(from),
    toUserId: id(to),
    amountUsd,
    plan,
    note: null,
    settledOn: '2026-07-10',
    createdBy: id(from),
    createdAt: '2026-07-10T00:00:00Z',
})

describe('roundToTotal', () => {
    it('always sums to the target, even when rounding one by one would not', () => {
        const thirds = [100 / 3, 100 / 3, 100 / 3]
        expect(thirds.map((v) => Math.round(v * 100)).reduce((a, b) => a + b)).toBe(9999)
        const cents = roundToTotal(thirds, 10000)
        expect(cents.reduce((a, b) => a + b)).toBe(10000)
        expect(cents.every((c) => c === 3333 || c === 3334)).toBe(true)
    })

    it('handles negative totals', () => {
        const cents = roundToTotal([-10.005, -5.004, 2.001], -1301)
        expect(cents.reduce((a, b) => a + b)).toBe(-1301)
    })
})

describe('directPlan (pay who you owe)', () => {
    it('cancels a loop without anyone paying a stranger', () => {
        // you(1) owe Jenny(2) 39.60, Jenny owes Priya(3) 51, Priya owes you 47
        const map = new Map([
            [id(1), new Map([[id(2), 39.6]])],
            [id(2), new Map([[id(3), 51]])],
            [id(3), new Map([[id(1), 47]])],
        ])
        const plan = directPlan(map, people.slice(0, 3))
        const byPair = new Map(plan.map((s) => [`${s.debtorId}>${s.creditorId}`, s.amount]))
        expect(byPair.get('2>3')).toBeCloseTo(11.4)
        expect(byPair.get('3>1')).toBeCloseTo(7.4)
        expect(byPair.has('1>2')).toBe(false)
        expect(plan).toHaveLength(2)
    })

    it('only pays people you owe, never more than you owe them', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const { who, expenses } = randomTrip(seed)
            const { debtMap } = computeDebtMap(expenses, who.length)
            const direct = directPairwiseSettlements(debtMap, who)
            const owed = new Map(direct.map((s) => [`${s.debtorId}>${s.creditorId}`, s.amount]))
            for (const s of directPlan(debtMap, who)) {
                const max = owed.get(`${s.debtorId}>${s.creditorId}`)
                expect(max).toBeDefined()
                expect(s.amount).toBeLessThanOrEqual(max! + 1e-9)
            }
        }
    })
})

describe('both plans settle everyone exactly', () => {
    it('every person ends at their balance, and everyone nets to zero', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const { who, expenses } = randomTrip(seed)
            const { debtMap } = computeDebtMap(expenses, who.length)
            const direct = directPairwiseSettlements(debtMap, who)
            for (const plan of ['fewest', 'direct'] as const) {
                const payments = planSettlements(plan, debtMap, who)
                let sum = 0
                for (const p of who) {
                    const net = planNetCents(payments, p.id)
                    sum += net
                    // Balance from the direct pair nets, in cents
                    const balance = planNetCents(direct, p.id)
                    // Greedy rounds each payment on its own — at most a cent per payment
                    expect(Math.abs(net - balance)).toBeLessThanOrEqual(who.length)
                }
                if (plan === 'direct') expect(sum).toBe(0)
                else expect(Math.abs(sum)).toBeLessThanOrEqual(who.length)
            }
        }
    })
})

describe('proof layers add up', () => {
    it('per-expense effects sum to the debt map pair nets', () => {
        for (let seed = 1; seed <= 20; seed++) {
            const { who, expenses } = randomTrip(seed)
            const { debtMap } = computeDebtMap(expenses, who.length)
            for (const me of who) {
                const totals = new Map<string, number>()
                for (const e of expenses) {
                    expenseBalanceEffects(e, me.id, e.costConvertedUsd, who.length).forEach((v, other) =>
                        totals.set(other, (totals.get(other) ?? 0) + v)
                    )
                }
                for (const other of who) {
                    if (other.id === me.id) continue
                    const net =
                        (debtMap.get(other.id)?.get(me.id) ?? 0) - (debtMap.get(me.id)?.get(other.id) ?? 0)
                    expect(totals.get(String(other.id)) ?? 0).toBeCloseTo(net, 6)
                }
            }
        }
    })

    it('the waterfall ends exactly on the plan, with payments recorded', () => {
        for (let seed = 1; seed <= 30; seed++) {
            const { who, expenses } = randomTrip(seed)
            const { debtMap: expenseMap } = computeDebtMap(expenses, who.length)
            // Settle the first payment of the plan, then re-plan
            const first = simplifyDebts(expenseMap, who)[0]
            const records = first ? [record(Number(first.debtorId), Number(first.creditorId), first.amount)] : []
            const debtMap = applySettlements(expenseMap, records)
            for (const plan of ['fewest', 'direct'] as const) {
                const payments = planSettlements(plan, debtMap, who)
                for (const me of who) {
                    const total = planNetCents(payments, me.id)
                    const steps = balanceSteps(me.id, expenseMap, records, who, total)
                    expect(steps.reduce((t, s) => t + s.cents, 0)).toBe(total)
                }
            }
        }
    })
})

describe('planHandoffs', () => {
    it('explains a reroute: you pay Sam part of what you owe Jenny', () => {
        // you(1) owe Jenny(2) 23; Jenny owes Sam(4) 23 → fewest: you pay Sam
        const map = new Map([
            [id(1), new Map([[id(2), 23]])],
            [id(2), new Map([[id(4), 23]])],
        ])
        const who = [{ id: id(1) }, { id: id(2) }, { id: id(4) }]
        const plan = simplifyDebts(map, who)
        expect(plan).toHaveLength(1)
        const [h] = planHandoffs(id(1), map, plan, who)
        expect(h.cents).toBe(2300)
        expect(String(h.from)).toBe('2')
        expect(String(h.to)).toBe('4')
        // Instead of you paying Jenny and Jenny paying Sam, you pay Sam
        expect(h.dropped).toEqual([
            { from: id(1), to: id(2) },
            { from: id(2), to: id(4) },
        ])
        expect(h.added).toEqual([{ from: id(1), to: id(4) }])
    })

    it('a cancelled loop drops debts and adds no payments', () => {
        // you(1) owe Jenny(2), Jenny owes Priya(3), Priya owes you — 10 each
        const map = new Map([
            [id(1), new Map([[id(2), 10]])],
            [id(2), new Map([[id(3), 10]])],
            [id(3), new Map([[id(1), 10]])],
        ])
        const who = people.slice(0, 3)
        expect(directPlan(map, who)).toHaveLength(0)
        const [h] = planHandoffs(id(1), map, [], who)
        expect(h.cents).toBe(1000)
        expect(h.added).toEqual([])
        expect(h.dropped[0]).toEqual({ from: id(1), to: id(2) })
        expect(h.dropped).toHaveLength(3)
    })

    it('accounts for every difference between plan and direct debts', () => {
        let seen = 0
        for (let seed = 1; seed <= 40; seed++) {
            const { who, expenses } = randomTrip(seed)
            const { debtMap } = computeDebtMap(expenses, who.length)
            const direct = directPairwiseSettlements(debtMap, who)
            for (const plan of ['fewest', 'direct'] as const) {
                const payments = planSettlements(plan, debtMap, who)
                for (const me of who) {
                    const handoffs = planHandoffs(me.id, debtMap, payments, who)
                    seen += handoffs.length
                    for (const other of who) {
                        if (other.id === me.id) continue
                        const along = (list: typeof payments) =>
                            list.reduce((t, s) => {
                                const c = toCents(s.amount)
                                if (s.debtorId === me.id && s.creditorId === other.id) return t + c
                                if (s.creditorId === me.id && s.debtorId === other.id) return t - c
                                return t
                            }, 0)
                        const gap = along(payments) - along(direct)
                        const explained = handoffs.reduce(
                            (t, h) => t + (h.to === other.id ? h.cents : 0) - (h.from === other.id ? h.cents : 0),
                            0
                        )
                        // Stray rounding cents may go unexplained
                        expect(Math.abs(gap - explained)).toBeLessThanOrEqual(who.length)
                    }
                }
            }
        }
        // The random trips really do reroute money
        expect(seen).toBeGreaterThan(40)
    })
})

describe('lockedPlan', () => {
    it('follows the recorded payments; legacy rows count as fewest', () => {
        expect(lockedPlan([])).toBeNull()
        expect(lockedPlan([record(1, 2, 5, 'direct')])).toBe('direct')
        expect(lockedPlan([{ plan: null }])).toBe('fewest')
    })
})
