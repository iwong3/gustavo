/**
 * Tests for directPairwiseSettlements (lib/debt.ts) — the debts page shows
 * direct pair-to-pair nets, NOT the group-simplified plan. These lock in that
 * debts are never rerouted through a third person, and that lookups are correct
 * for the BIGINT-string ids that arrive at runtime.
 */
import { describe, expect, it } from 'vitest'

import { directPairwiseSettlements, simplifyDebts } from '../lib/debt'
import type { UserSummary } from '../lib/types'

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
