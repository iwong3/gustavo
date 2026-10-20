/**
 * Tests for the per-expense share rule (lib/expense-shares.ts) — shared treats
 * (00047): treated shares split across the coverers, the payer by default —
 * and that the debt map, the debt proof and the pair-detail contribution all
 * follow it.
 */
import { describe, expect, it } from 'vitest'

import { expenseDebtContribution } from '../lib/debt'
import { expenseBalanceEffects } from '../lib/debt-proof'
import { expenseShares, type ShareExpense } from '../lib/expense-shares'
import { computeDebtMap, type SpendExpense } from '../lib/spend'
import type { Expense } from '../lib/types'

// Runtime truth: BIGINT ids arrive as strings
const ivan = { id: '1' as unknown as number }
const jenny = { id: '2' as unknown as number }
const bob = { id: '3' as unknown as number }
const carol = { id: '4' as unknown as number }
const dave = { id: '5' as unknown as number }
const everyone = [ivan, jenny, bob, carol, dave]

const exp = (o: Partial<ShareExpense> = {}): ShareExpense => ({
    paidBy: ivan,
    isEveryone: false,
    splitBetween: everyone,
    coveredParticipants: [],
    ...o,
})

const shareOf = (e: ShareExpense, who: { id: number }) =>
    expenseShares(e, 100, 5).find((s) => String(s.id) === String(who.id))?.share ?? 0

const spend = (e: ShareExpense): SpendExpense => ({
    currency: 'USD',
    costOriginal: 100,
    costConvertedUsd: 100,
    categorySlug: null,
    localCurrencyReceived: null,
    ...e,
})

describe('expenseShares', () => {
    it('splits evenly with no treats', () => {
        for (const p of everyone) expect(shareOf(exp(), p)).toBeCloseTo(20)
    })

    it('puts a treated share on the payer when nobody is marked covering', () => {
        const e = exp({ coveredParticipants: [carol] })
        expect(shareOf(e, ivan)).toBeCloseTo(40)
        expect(shareOf(e, carol)).toBe(0)
        expect(shareOf(e, jenny)).toBeCloseTo(20)
    })

    it('splits a treated share across the coverers', () => {
        const e = exp({ coveredParticipants: [carol], coveringParticipants: [ivan, jenny] })
        expect(shareOf(e, ivan)).toBeCloseTo(30)
        expect(shareOf(e, jenny)).toBeCloseTo(30)
        expect(shareOf(e, bob)).toBeCloseTo(20)
        expect(shareOf(e, carol)).toBe(0)
    })

    it('lets coverers exclude the payer', () => {
        const e = exp({ coveredParticipants: [carol], coveringParticipants: [jenny, bob] })
        expect(shareOf(e, ivan)).toBeCloseTo(20)
        expect(shareOf(e, jenny)).toBeCloseTo(30)
        expect(shareOf(e, bob)).toBeCloseTo(30)
    })

    it('pools several treated shares across the coverers', () => {
        const e = exp({ coveredParticipants: [carol, dave], coveringParticipants: [jenny, bob] })
        expect(shareOf(e, jenny)).toBeCloseTo(40)
        expect(shareOf(e, bob)).toBeCloseTo(40)
        expect(shareOf(e, ivan)).toBeCloseTo(20)
    })

    it('ignores coverers who are treated or outside the split', () => {
        const e = exp({
            splitBetween: [ivan, jenny, carol],
            coveredParticipants: [carol],
            coveringParticipants: [carol, dave],
        })
        // No valid coverer left → the payer covers
        expect(expenseShares(e, 90, 5).find((s) => s.id === ivan.id)?.share).toBeCloseTo(60)
    })

    it('always sums to the expense value', () => {
        const e = exp({ coveredParticipants: [carol, dave], coveringParticipants: [jenny] })
        const total = expenseShares(e, 100, 5).reduce((a, s) => a + s.share, 0)
        expect(total).toBeCloseTo(100)
    })

    it('handles an empty split', () => {
        expect(expenseShares(exp({ splitBetween: [] }), 100, 0)).toEqual([])
    })
})

describe('debt follows the shares', () => {
    const e = exp({ coveredParticipants: [carol], coveringParticipants: [ivan, jenny] })

    it('computeDebtMap: coverers owe their share plus the treat, treated owe nothing', () => {
        const { debtMap } = computeDebtMap([spend(e)], 5)
        expect(debtMap.get(jenny.id)?.get(ivan.id)).toBeCloseTo(30)
        expect(debtMap.get(bob.id)?.get(ivan.id)).toBeCloseTo(20)
        expect(debtMap.has(carol.id)).toBe(false)
        expect(debtMap.has(ivan.id)).toBe(false)
    })

    it('expenseBalanceEffects matches the debt map', () => {
        const fx = expenseBalanceEffects(e, ivan.id, 100, 5)
        expect(fx.get('2')).toBeCloseTo(30)
        expect(fx.get('3')).toBeCloseTo(20)
        expect(fx.has('4')).toBe(false)
        expect(expenseBalanceEffects(e, jenny.id, 100, 5).get('1')).toBeCloseTo(-30)
    })

    it('expenseDebtContribution matches the debt map', () => {
        const full = e as unknown as Expense
        expect(expenseDebtContribution(full, ivan.id, jenny.id, 100, 5)).toBeCloseTo(30)
        expect(expenseDebtContribution(full, ivan.id, carol.id, 100, 5)).toBe(0)
        expect(expenseDebtContribution(full, jenny.id, bob.id, 100, 5)).toBe(0)
    })
})
