/**
 * Tests for per-person expense share attribution (lib/spend.ts), used by the
 * My Spend insights page. Must mirror the netSpendByPerson semantics in
 * app/providers/spend-data-provider.tsx: even split across participants,
 * covered ("treat") participants' shares absorbed by the payer.
 */
import { describe, expect, it } from 'vitest'

import { expenseShareForUser } from '../lib/spend'
import type { Expense, UserSummary } from '../lib/types'

const user = (id: number, firstName: string): UserSummary => ({
    id,
    name: firstName,
    firstName,
    email: null,
    avatarUrl: null,
    initials: null,
    iconColor: null,
    venmoUrl: null,
})

const ivan = user(1, 'Ivan')
const jenny = user(2, 'Jenny')
const alex = user(3, 'Alex')
const sam = user(4, 'Sam')

const baseExpense = (overrides: Partial<Expense>): Expense => ({
    id: 100,
    name: 'Test expense',
    date: '2026-07-03',
    costOriginal: 100,
    currency: 'USD',
    costConvertedUsd: 100,
    exchangeRate: null,
    conversionError: false,
    categoryId: null,
    categoryName: 'Food',
    categorySlug: 'food',
    locationId: null,
    locationName: 'Tokyo',
    paidBy: ivan,
    reportedBy: null,
    reportedAt: null,
    splitBetween: [ivan, jenny, alex, sam],
    coveredParticipants: [],
    isEveryone: true,
    notes: '',
    receiptImageUrl: null,
    localCurrencyReceived: null,
    googlePlaceId: null,
    place: null,
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...overrides,
})

describe('expenseShareForUser', () => {
    it('splits an everyone expense evenly', () => {
        const exp = baseExpense({})
        expect(expenseShareForUser(exp, ivan.id, 100, 4)).toBeCloseTo(25)
        expect(expenseShareForUser(exp, jenny.id, 100, 4)).toBeCloseTo(25)
    })

    it('gives zero to someone outside the split', () => {
        const exp = baseExpense({
            isEveryone: false,
            splitBetween: [ivan, jenny],
        })
        expect(expenseShareForUser(exp, ivan.id, 100, 4)).toBeCloseTo(50)
        expect(expenseShareForUser(exp, alex.id, 100, 4)).toBeCloseTo(0)
    })

    it('moves a covered participant share to the payer', () => {
        const exp = baseExpense({
            paidBy: ivan,
            coveredParticipants: [jenny],
        })
        // Ivan pays his own 25 + Jenny's covered 25
        expect(expenseShareForUser(exp, ivan.id, 100, 4)).toBeCloseTo(50)
        expect(expenseShareForUser(exp, jenny.id, 100, 4)).toBeCloseTo(0)
        expect(expenseShareForUser(exp, alex.id, 100, 4)).toBeCloseTo(25)
    })

    it('uses the trip participant count for everyone expenses (provider parity)', () => {
        // isEveryone uses participantCount even if splitBetween drifted
        const exp = baseExpense({
            isEveryone: true,
            splitBetween: [ivan, jenny, alex],
        })
        expect(expenseShareForUser(exp, ivan.id, 90, 4)).toBeCloseTo(22.5)
    })

    it('handles an empty split without dividing by zero', () => {
        const exp = baseExpense({ isEveryone: false, splitBetween: [] })
        expect(expenseShareForUser(exp, ivan.id, 100, 0)).toBe(0)
    })

    it('sums to the full expense value across all participants', () => {
        const exp = baseExpense({
            paidBy: jenny,
            coveredParticipants: [sam],
        })
        const total = [ivan, jenny, alex, sam]
            .map((p) => expenseShareForUser(exp, p.id, 100, 4))
            .reduce((a, b) => a + b, 0)
        expect(total).toBeCloseTo(100)
    })
})
