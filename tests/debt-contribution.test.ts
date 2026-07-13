/**
 * Tests for per-expense debt contribution (lib/debt.ts), used by the debt
 * pair-detail page. Must mirror computeDebtMap's per-expense rule in
 * app/providers/spend-data-provider.tsx: even split, no debt for the payer
 * or for covered ("treat") participants.
 */
import { describe, expect, it } from 'vitest'

import { expenseDebtContribution } from '../lib/debt'
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

describe('expenseDebtContribution', () => {
    it('charges a split participant their even share', () => {
        const exp = baseExpense({})
        expect(expenseDebtContribution(exp, ivan.id, jenny.id, 100, 4)).toBeCloseTo(25)
    })

    it('is zero when the named payer did not pay', () => {
        const exp = baseExpense({ paidBy: jenny })
        expect(expenseDebtContribution(exp, ivan.id, sam.id, 100, 4)).toBe(0)
    })

    it('is zero for the payer themselves and for non-participants', () => {
        const exp = baseExpense({ isEveryone: false, splitBetween: [ivan, jenny] })
        expect(expenseDebtContribution(exp, ivan.id, ivan.id, 100, 4)).toBe(0)
        expect(expenseDebtContribution(exp, ivan.id, alex.id, 100, 4)).toBe(0)
    })

    it('is zero for covered (treat) participants', () => {
        const exp = baseExpense({ coveredParticipants: [jenny] })
        expect(expenseDebtContribution(exp, ivan.id, jenny.id, 100, 4)).toBe(0)
        expect(expenseDebtContribution(exp, ivan.id, alex.id, 100, 4)).toBeCloseTo(25)
    })

    it('uses trip participant count for everyone expenses (provider parity)', () => {
        const exp = baseExpense({ isEveryone: true, splitBetween: [ivan, jenny, alex] })
        expect(expenseDebtContribution(exp, ivan.id, jenny.id, 90, 4)).toBeCloseTo(22.5)
    })

    it('handles an empty split without dividing by zero', () => {
        const exp = baseExpense({ isEveryone: false, splitBetween: [] })
        expect(expenseDebtContribution(exp, ivan.id, jenny.id, 100, 0)).toBe(0)
    })
})
