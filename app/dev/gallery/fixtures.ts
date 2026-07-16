/**
 * Mock data for the dev component gallery (/dev/gallery).
 * Pure fixtures — never imported by production code.
 */
import type {
    AddressComponent,
    Expense,
    PlaceInfo,
    SettlementRecord,
    TripStats,
    TripSummary,
    UserSummary,
} from '@/lib/types'

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

const comp = (
    longText: string,
    types: string[],
    shortText = longText
): AddressComponent => ({ longText, shortText, types })

/** Fully-populated place — the "Google knew everything" case. Its components are
 *  shaped like a real Tokyo response (ward in `locality`, prefecture in
 *  admin_1), so the area line renders "Shibuya, Tokyo". */
export const shibuyaPlace: PlaceInfo = {
    googlePlaceId: 'fixture-place-shibuya',
    name: 'Ichiran Shibuya',
    address: '1-22-7 Jinnan, Shibuya City, Tokyo 150-0042, Japan',
    lat: 35.6614,
    lng: 139.7005,
    priceLevel: 2,
    priceRange: {
        startPrice: { currencyCode: 'JPY', units: '1000' },
        endPrice: { currencyCode: 'JPY', units: '2000' },
    },
    rating: 4.6,
    userRatingCount: 2431,
    primaryType: 'ramen_restaurant',
    types: ['ramen_restaurant', 'restaurant', 'food'],
    website: 'https://ichiran.com/',
    hoursJson: null,
    photoRefs: null,
    addressComponents: [
        comp('Jinnan', ['sublocality_level_2', 'sublocality', 'political']),
        comp('Shibuya City', ['locality', 'political']),
        comp('Tokyo', ['administrative_area_level_1', 'political']),
        comp('Japan', ['country', 'political'], 'JP'),
    ],
}

/** Sparse place — every optional Google field absent, and a Kyoto address whose
 *  locality and prefecture are the same word (area collapses to just "Kyoto").
 *  Guards the chips/area line against nulls and duplicate levels. */
export const kyotoPlace: PlaceInfo = {
    googlePlaceId: 'fixture-place-kyoto',
    name: 'Nishiki Market',
    address: 'Nishiki Market, Nakagyo Ward, Kyoto',
    lat: 35.005,
    lng: 135.765,
    priceLevel: null,
    priceRange: null,
    rating: null,
    userRatingCount: null,
    primaryType: 'market',
    types: ['market'],
    website: null,
    hoursJson: null,
    photoRefs: null,
    addressComponents: [
        comp('Kyoto', ['locality', 'political']),
        comp('Kyoto', ['administrative_area_level_1', 'political']),
        comp('Japan', ['country', 'political'], 'JP'),
    ],
}

/** Pre-00039 place: saved before address_components/priceRange existed, so the
 *  area line must fall back to the trip's location name. */
export const legacyPlace: PlaceInfo = {
    googlePlaceId: 'fixture-place-legacy',
    name: 'Don Quijote Shibuya',
    address: '28-6 Udagawacho, Shibuya City, Tokyo',
    lat: 35.6612,
    lng: 139.6982,
    priceLevel: 2,
    priceRange: null,
    rating: 4.1,
    userRatingCount: null,
    primaryType: 'store',
    types: ['store'],
    website: null,
    hoursJson: null,
    photoRefs: null,
    addressComponents: null,
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
        categoryId: 2,
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
        categoryId: 3,
        categoryName: 'Lodging',
        categorySlug: 'lodging',
        costOriginal: 612,
        paidBy: marco,
        isEveryone: true,
        splitBetween: participants,
    }),
    makeExpense({
        name: 'Street market souvenirs',
        categoryId: 4,
        categoryName: 'Shopping',
        categorySlug: 'shopping',
        costOriginal: 8500,
        currency: 'JPY',
        costConvertedUsd: 0,
        conversionError: true,
        paidBy: priya,
        splitBetween: [priya],
        googlePlaceId: kyotoPlace.googlePlaceId,
        place: kyotoPlace,
    }),
    makeExpense({
        name: 'Ichiran Ramen',
        date: '2026-07-05',
        costOriginal: 4200,
        currency: 'JPY',
        costConvertedUsd: 28.5,
        exchangeRate: 147.4,
        paidBy: jenny,
        splitBetween: participants,
        coveredParticipants: [priya],
        isEveryone: true,
        notes: 'Best ramen of the trip — get the kaedama refill.',
        googlePlaceId: shibuyaPlace.googlePlaceId,
        place: shibuyaPlace,
    }),
    makeExpense({
        name: 'Don Quijote run',
        date: '2026-07-05',
        categoryId: 4,
        categoryName: 'Shopping',
        categorySlug: 'shopping',
        costOriginal: 2760,
        currency: 'JPY',
        costConvertedUsd: 18.75,
        exchangeRate: 147.4,
        paidBy: ivan,
        splitBetween: [ivan, jenny],
        googlePlaceId: legacyPlace.googlePlaceId,
        place: legacyPlace,
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

// --- Boarding pass fixtures (trips list) ---

/** Pinned "today" for pass-state determinism — pass to BoardingPass. */
export const GALLERY_TODAY = '2026-07-14'

export function makeTripStats(overrides: Partial<TripStats> = {}): TripStats {
    return {
        expenseCount: 12,
        totalSpendUsd: 1284,
        todaySpendUsd: 96,
        yourShareUsd: 512,
        yourNetUsd: 63,
        isSettled: false,
        latestExpense: {
            name: 'Ramen Yokocho',
            byFirstName: 'Jenny',
            reportedAt: '2026-07-14T08:40:00Z',
        },
        ...overrides,
    }
}

let nextTripId = 200

export function makePassTrip(overrides: Partial<TripSummary> = {}): TripSummary {
    return {
        ...trip,
        id: asId(String(nextTripId++)),
        stats: makeTripStats(),
        ...overrides,
    }
}
