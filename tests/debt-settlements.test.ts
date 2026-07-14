/**
 * Tests for directPairwiseSettlements (lib/debt.ts) — the debts page shows
 * direct pair-to-pair nets, NOT the group-simplified plan. These lock in that
 * debts are never rerouted through a third person, and that lookups are correct
 * for the BIGINT-string ids that arrive at runtime.
 */
import { describe, expect, it } from 'vitest'

import { applySettlements, directPairwiseSettlements, simplifyDebts } from '../lib/debt'
import type { SettlementRecord, UserSummary } from '../lib/types'

const user = (id: number | string, firstName: string): UserSummary => ({
    // Cast to satisfy the number-typed field; runtime ids are strings (BIGINT).
    id: id as unknown as number,
    name: firstName,
    firstName,
    email: null,
    avatarUrl: null,
    initials: null,
    iconColor: null,
    venmoUrl: null,
})

/** Build a debtMap from [debtorId, creditorId, amount] gross-owed triples. */
function makeDebtMap(
    triples: [string | number, string | number, number][]
): Map<number, Map<number, number>> {
    const map = new Map<number, Map<number, number>>()
    for (const [d, c, amt] of triples) {
        const inner = map.get(d as never) ?? new Map()
        inner.set(c, (inner.get(c) ?? 0) + amt)
        map.set(d as never, inner)
    }
    return map
}

/** A recorded payment fixture with runtime-truth string ids. */
function payment(
    fromUserId: string,
    toUserId: string,
    amountUsd: number
): SettlementRecord {
    return {
        id: 99 as unknown as number,
        fromUserId: fromUserId as unknown as number,
        toUserId: toUserId as unknown as number,
        amountUsd,
        note: null,
        settledOn: '2026-07-14',
        createdBy: fromUserId as unknown as number,
        createdAt: '2026-07-14T00:00:00Z',
    }
}

describe('applySettlements', () => {
    it('offsets the debt without mutating the input map', () => {
        const original = makeDebtMap([['1', '2', 50]])
        const adjusted = applySettlements(original, [payment('1', '2', 20)])

        // Original untouched
        expect(original.get('1' as never)?.get('2' as never)).toBe(50)
        expect(original.get('2' as never)).toBeUndefined()
        // Adjusted map carries the reverse-direction offset
        expect(adjusted.get('2' as never)?.get('1' as never)).toBe(20)
    })

    it('a full payment settles the pair to zero', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        const debtMap = applySettlements(makeDebtMap([['1', '2', 50]]), [
            payment('1', '2', 50),
        ])
        expect(directPairwiseSettlements(debtMap, [a, b])).toHaveLength(0)
        expect(simplifyDebts(debtMap, [a, b])).toHaveLength(0)
    })

    it('an overpayment flips the direction of the debt', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        const debtMap = applySettlements(makeDebtMap([['1', '2', 50]]), [
            payment('1', '2', 80),
        ])
        const s = directPairwiseSettlements(debtMap, [a, b])
        expect(s).toHaveLength(1)
        expect(s[0]).toEqual({ debtorId: '2', creditorId: '1', amount: 30 })
    })

    it('multiple payments accumulate; the simplified plan sees them too', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        const c = user('3', 'Cy')
        // Ana owes Bo 20, Bo owes Cy 20. Ana pays Cy 20 directly (per the
        // simplified plan) in two installments → everyone settled.
        const debtMap = applySettlements(
            makeDebtMap([
                ['1', '2', 20],
                ['2', '3', 20],
            ]),
            [payment('1', '3', 10), payment('1', '3', 10)]
        )
        expect(simplifyDebts(debtMap, [a, b, c])).toHaveLength(0)
    })

    it('ignores payments with non-finite amounts (runtime NUMERIC-null truth)', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        const debtMap = applySettlements(makeDebtMap([['1', '2', 50]]), [
            payment('1', '2', NaN),
            payment('1', '2', null as unknown as number),
        ])
        const s = directPairwiseSettlements(debtMap, [a, b])
        expect(s).toHaveLength(1)
        expect(s[0].amount).toBe(50)
    })

    it('returns the same map instance when there is nothing to apply', () => {
        const original = makeDebtMap([['1', '2', 50]])
        expect(applySettlements(original, [])).toBe(original)
    })
})

describe('directPairwiseSettlements', () => {
    it('nets the two directions within a pair', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        // Ana owes Bo 30, Bo owes Ana 10 → Ana owes Bo 20
        const debtMap = makeDebtMap([
            ['1', '2', 30],
            ['2', '1', 10],
        ])
        const s = directPairwiseSettlements(debtMap, [a, b])
        expect(s).toHaveLength(1)
        expect(s[0]).toEqual({ debtorId: '1', creditorId: '2', amount: 20 })
    })

    it('does NOT reroute through a third person (unlike simplifyDebts)', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        const c = user('3', 'Cy')
        // Ana owes Bo 20; Bo owes Cy 20. Bo nets to zero overall.
        const debtMap = makeDebtMap([
            ['1', '2', 20],
            ['2', '3', 20],
        ])
        const direct = directPairwiseSettlements(debtMap, [a, b, c])
        // Two explicit debts, Bo still appears on both sides
        expect(direct).toHaveLength(2)
        expect(direct).toContainEqual({ debtorId: '1', creditorId: '2', amount: 20 })
        expect(direct).toContainEqual({ debtorId: '2', creditorId: '3', amount: 20 })

        // The simplifier collapses Bo out into a single Ana → Cy payment
        const simplified = simplifyDebts(debtMap, [a, b, c])
        expect(simplified).toHaveLength(1)
        expect(simplified[0]).toEqual({ debtorId: '1', creditorId: '3', amount: 20 })
    })

    it('omits pairs that net to (near) zero', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        const debtMap = makeDebtMap([
            ['1', '2', 15],
            ['2', '1', 15],
        ])
        expect(directPairwiseSettlements(debtMap, [a, b])).toHaveLength(0)
    })

    it('reflects recorded payments folded in via applySettlements', () => {
        const a = user('1', 'Ana')
        const b = user('2', 'Bo')
        // Ana owes Bo 50; Ana already paid back 20
        const debtMap = applySettlements(makeDebtMap([['1', '2', 50]]), [
            payment('1', '2', 20),
        ])
        const s = directPairwiseSettlements(debtMap, [a, b])
        expect(s).toHaveLength(1)
        expect(s[0]).toEqual({ debtorId: '1', creditorId: '2', amount: 30 })
    })

    it('derives direction from the net, not from id ordering', () => {
        // Non-numeric-friendly ids: "10" and "2". A numeric min/max on ids would
        // misorder the pair; direction must come from who owes more.
        const a = user('10', 'Ana') // owes less
        const b = user('2', 'Bo') // owes more
        const debtMap = makeDebtMap([
            ['2', '10', 40], // Bo owes Ana 40
            ['10', '2', 15], // Ana owes Bo 15
        ])
        const s = directPairwiseSettlements(debtMap, [a, b])
        expect(s).toHaveLength(1)
        // Net: Bo owes Ana 25
        expect(s[0]).toEqual({ debtorId: '2', creditorId: '10', amount: 25 })
    })
})
