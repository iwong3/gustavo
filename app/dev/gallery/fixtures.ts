/**
 * Mock data for the dev component gallery (/dev/gallery).
 * Pure fixtures — never imported by production code.
 */
import type { Expense, SettlementRecord, TripSummary, UserSummary } from '@/lib/types'

/** users.id is BIGINT — the API returns it as a STRING at runtime even though
 *  lib/types.ts says number. Fixtures model the runtime truth so id-comparison
 *  bugs (e.g. Number(param) === p.id never matching) surface in the gallery. */
const asId = (id: string) => id as unknown as number

export const ivan: UserSummary = {
    id: asId('1'),
    name: 'Ivan Wong',
    firstName: 'Ivan',
    email: 'ivan@example.com',
    avatarUrl: null,
    initials: 'IW',
    iconColor: '#4b6981',
    venmoUrl: null,
}

export const jenny: UserSummary = {
    id: asId('2'),
    name: 'Jenny Lee',
    firstName: 'Jenny',
    email: 'jenny@example.com',
    avatarUrl: null,
    initials: 'JL',
    iconColor: '#f7cd83',
    venmoUrl: null,
}

export const marco: UserSummary = {
    id: asId('3'),
    name: 'Marco Rossi',
    firstName: 'Marco',
    email: 'marco@example.com',
    avatarUrl: null,
    initials: 'MR',
    iconColor: '#393a10',
    venmoUrl: 'https://venmo.com/u/marco-fixture',
}

export const priya: UserSummary = {
    id: asId('4'),
    name: 'Priya Patel',
    firstName: 'Priya',
    email: 'priya@example.com',
    avatarUrl: null,
    initials: 'PP',
    iconColor: '#74150f',
    venmoUrl: null,
}

export const participants: UserSummary[] = [ivan, jenny, marco, priya]

export const participantById = new Map(participants.map((p) => [p.id, p]))

export const currentUserId = ivan.id

/** id 42 keeps it off LEGACY_TRIP_IDS (1-4), so forms use the Places autocomplete path. */
export const trip: TripSummary = {
    id: 42,
    name: 'Japan 2026',
    slug: 'japan-2026',
    startDate: '2026-07-02',
    endDate: '2026-07-11',
    description: 'Fixture trip for the component gallery',
    currency: 'JPY',
    currencies: ['USD', 'JPY'],
    countries: ['JP'],
    visibility: 'participants',
    userRole: 'owner',
    isAdmin: true,
    currentUserId: ivan.id,
    participants: participants.map((p) => ({
        ...p,
        role: p.id === ivan.id ? ('owner' as const) : ('editor' as const),
    })),
    updatedAt: '2026-07-04T12:00:00Z',
}

let nextExpenseId = 100

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
    return {
        id: nextExpenseId++,
        name: 'Ramen dinner',
        date: '2026-07-04',
        costOriginal: 42.5,
        currency: 'USD',
        costConvertedUsd: 42.5,
        exchangeRate: null,
        conversionError: false,
        categoryId: 1,
        categoryName: 'Food',
        categorySlug: 'food',
        locationId: 1,
        locationName: 'Tokyo',
        paidBy: ivan,
        reportedBy: ivan,
        reportedAt: '2026-07-04T12:00:00Z',
        splitBetween: [ivan, jenny],
        coveredParticipants: [],
        isEveryone: false,
        notes: '',
        receiptImageUrl: null,
        localCurrencyReceived: null,
        googlePlaceId: null,
        place: null,
        updatedAt: '2026-07-04T12:00:00Z',
        ...overrides,
    }
}

export const expenses: Expense[] = [
    makeExpense(),
    makeExpense({
        name: 'Shinkansen to Kyoto',
        categoryName: 'Transit',
        categorySlug: 'transit',
        costOriginal: 13800,
        currency: 'JPY',
        costConvertedUsd: 92.4,
        exchangeRate: 0.0067,
        paidBy: jenny,
        isEveryone: true,
        splitBetween: participants,
    }),
    makeExpense({
        name: 'Hotel Gracery — 3 nights, city view upgrade, late checkout',
        categoryName: 'Lodging',
        categorySlug: 'lodging',
        costOriginal: 612,
        paidBy: marco,
        isEveryone: true,
        splitBetween: participants,
    }),
    makeExpense({
        name: 'Street market souvenirs',
        categoryName: 'Shopping',
        categorySlug: 'shopping',
        costOriginal: 8500,
        currency: 'JPY',
        costConvertedUsd: 0,
        conversionError: true,
        paidBy: priya,
        splitBetween: [priya],
        place: {
            googlePlaceId: 'fixture-place',
            name: 'Nishiki Market',
            address: 'Nishiki Market, Nakagyo Ward, Kyoto',
            lat: 35.005,
            lng: 135.765,
            priceLevel: 2,
            rating: 4.4,
            primaryType: 'market',
            types: ['market'],
            website: null,
            hoursJson: null,
            photoRefs: null,
        },
    }),
]

/** debtor -> creditor -> amount (USD). Covers owed / owes / settled cases. */
export const debtMap: Map<number, Map<number, number>> = new Map([
    [jenny.id, new Map([[ivan.id, 182.5], [priya.id, 30]])],
    [marco.id, new Map([[ivan.id, 45]])],
    [ivan.id, new Map([[marco.id, 12.25]])],
    [priya.id, new Map([[jenny.id, 30]])],
])

/** Recorded debt payments (string ids = runtime truth). Directions match the
 *  fixture expenses: Jenny owes Ivan (sushi), Ivan owes Marco (hotel). */
export const settlementRecords: SettlementRecord[] = [
    {
        id: asId('9001'),
        fromUserId: jenny.id,
        toUserId: ivan.id,
        amountUsd: 20,
        note: null,
        settledOn: '2026-07-10',
        createdBy: jenny.id,
        createdAt: '2026-07-10T09:00:00Z',
    },
    {
        id: asId('9002'),
        fromUserId: ivan.id,
        toUserId: marco.id,
        amountUsd: 50,
        note: null,
        settledOn: '2026-07-12',
        createdBy: ivan.id,
        createdAt: '2026-07-12T18:30:00Z',
    },
]
