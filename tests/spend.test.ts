/**
 * Tests for per-person expense share attribution (lib/spend.ts), used by the
 * My Spend insights page. Must mirror the netSpendByPerson semantics in
 * app/providers/spend-data-provider.tsx: even split across participants,
 * covered ("treat") participants' shares absorbed by the payer.
 */
import { describe, expect, it } from 'vitest'

import { computeTripStats, expenseShareForUser, type SpendExpense } from '../lib/spend'
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

// --- computeTripStats (boarding-pass aggregates) ---

/** Runtime truth: BIGINT ids arrive as strings. */
const asId = (id: string) => id as unknown as number

const IVAN = asId('1')
const JENNY = asId('2')
const MARCO = asId('3')
const PARTICIPANTS = [IVAN, JENNY, MARCO]

type LeanExpense = SpendExpense & { date: string }

const leanExpense = (overrides: Partial<LeanExpense>): LeanExpense => ({
    date: '2026-07-13',
    costOriginal: 90,
    currency: 'USD',
    costConvertedUsd: 90,
    categorySlug: 'food',
    localCurrencyReceived: null,
    paidBy: { id: IVAN },
    isEveryone: false,
    splitBetween: [{ id: IVAN }, { id: JENNY }, { id: MARCO }],
    coveredParticipants: [],
    ...overrides,
})

const statsInput = (
    expenses: LeanExpense[],
    overrides: Partial<Parameters<typeof computeTripStats>[0]> = {}
) => ({
    expenses,
    participantIds: PARTICIPANTS,
    settlements: [],
    currentUserId: IVAN,
    todayIso: '2026-07-14',
    ...overrides,
})

describe('computeTripStats', () => {
    it('computes totals, share, and net position with string ids', () => {
        const stats = computeTripStats(statsInput([leanExpense({})]))
        expect(stats.expenseCount).toBe(1)
        expect(stats.totalSpendUsd).toBeCloseTo(90)
        expect(stats.yourShareUsd).toBeCloseTo(30)
        // Jenny and Marco each owe Ivan 30
        expect(stats.yourNetUsd).toBeCloseTo(60)
        expect(stats.isSettled).toBe(false)
    })

    it('buckets today spend by date', () => {
        const stats = computeTripStats(
            statsInput([
                leanExpense({ date: '2026-07-14', costOriginal: 40, costConvertedUsd: 40 }),
                leanExpense({ date: '2026-07-13' }),
            ])
        )
        expect(stats.todaySpendUsd).toBeCloseTo(40)
        expect(stats.totalSpendUsd).toBeCloseTo(130)
    })

    it('marks the trip settled once recorded payments cover the debts', () => {
        const stats = computeTripStats(
            statsInput([leanExpense({})], {
                settlements: [
                    { fromUserId: JENNY, toUserId: IVAN, amountUsd: 30 },
                    { fromUserId: MARCO, toUserId: IVAN, amountUsd: 30 },
                ],
            })
        )
        expect(stats.isSettled).toBe(true)
        expect(stats.yourNetUsd).toBeCloseTo(0)
    })

    it('absorbs covered shares into the payer and accrues no debt for them', () => {
        const stats = computeTripStats(
            statsInput([leanExpense({ coveredParticipants: [{ id: JENNY }] })])
        )
        // Ivan's own 30 + Jenny's covered 30
        expect(stats.yourShareUsd).toBeCloseTo(60)
        // only Marco owes Ivan
        expect(stats.yourNetUsd).toBeCloseTo(30)
    })

    it('reports a negative net when the user owes', () => {
        const stats = computeTripStats(
            statsInput([leanExpense({ paidBy: { id: JENNY } })])
        )
        expect(stats.yourNetUsd).toBeCloseTo(-30)
        expect(stats.isSettled).toBe(false)
    })

    it('treats non-finite USD values as zero instead of NaN-ing the pass', () => {
        const stats = computeTripStats(
            statsInput([
                leanExpense({}),
                leanExpense({ currency: 'JPY', costOriginal: 5000, costConvertedUsd: NaN }),
            ])
        )
        expect(stats.totalSpendUsd).toBeCloseTo(90)
        expect(Number.isFinite(stats.yourNetUsd)).toBe(true)
    })

    it('is settled and all-zero for a trip with no expenses', () => {
        const stats = computeTripStats(statsInput([]))
        expect(stats).toMatchObject({
            expenseCount: 0,
            totalSpendUsd: 0,
            todaySpendUsd: 0,
            yourShareUsd: 0,
            yourNetUsd: 0,
            isSettled: true,
        })
    })
})
