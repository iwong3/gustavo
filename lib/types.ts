/** DB-driven types — replaces all hardcoded enums (Trip, Person, Location, SpendType). */

export type TripRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type TripSummary = {
    id: number
    name: string
    slug: string
    startDate: string  // ISO YYYY-MM-DD
    endDate: string    // ISO YYYY-MM-DD
    description: string | null
    /** Legacy single-currency field; superseded by `currencies`. Kept until
     *  migration drops the column. New code should read from `currencies`. */
    currency: string
    /** Currencies available on this trip's expense form (always includes USD). */
    currencies: string[]
    /** ISO 3166-1 alpha-2 country codes the user picked at trip creation. */
    countries: string[]
    visibility: 'participants' | 'all_users'
    userRole: TripRole | null  // current user's role, null if non-participant viewing public trip
    isAdmin: boolean
    currentUserId: number
    participants: ParticipantSummary[]
    /** ISO timestamp of the last update — used for optimistic concurrency on PUT/DELETE. */
    updatedAt: string
    /** Boarding-pass aggregates — present on the trips LIST response only. */
    stats?: TripStats
}

/** Most recent expense added to a trip — the boarding-pass activity footer. */
export type TripLatestExpense = {
    name: string
    /** First name of whoever reported the expense; null for legacy rows. */
    byFirstName: string | null
    /** ISO timestamp; null for legacy rows with no reported_at. */
    reportedAt: string | null
}

/** Per-trip aggregates for the trips-list boarding passes (computed in
 *  lib/spend.ts § computeTripStats + the trips API route). USD amounts use
 *  the same blended-exchange-rate math as the debts page. */
export type TripStats = {
    expenseCount: number
    /** Whole-group total spend. */
    totalSpendUsd: number
    /** Whole-group spend dated today (server UTC date). */
    todaySpendUsd: number
    /** Current user's share of expenses (covered shares absorbed by payer). */
    yourShareUsd: number
    /** Current user's net debt position: + = owed to you, − = you owe. */
    yourNetUsd: number
    /** True when no pairwise debts remain after recorded settlements. */
    isSettled: boolean
    latestExpense: TripLatestExpense | null
}

export type UserSummary = {
    id: number
    name: string        // full name
    firstName: string   // derived: split_part(name, ' ', 1)
    email: string | null
    avatarUrl: string | null
    initials: string | null
    iconColor: string | null
    venmoUrl: string | null
}

export type ParticipantSummary = UserSummary & {
    role: TripRole
}

export type Expense = {
    id: number
    name: string
    date: string        // ISO YYYY-MM-DD
    costOriginal: number
    currency: string
    costConvertedUsd: number
    exchangeRate: number | null
    conversionError: boolean
    categoryId: number | null
    categoryName: string | null
    categorySlug: string | null
    locationId: number | null
    locationName: string | null
    paidBy: UserSummary
    reportedBy: UserSummary | null
    reportedAt: string | null
    splitBetween: UserSummary[]
    coveredParticipants: UserSummary[]
    isEveryone: boolean
    notes: string
    receiptImageUrl: string | null
    localCurrencyReceived: number | null
    googlePlaceId: string | null
    place: PlaceInfo | null
    /** ISO timestamp of the last update — used for optimistic concurrency on PUT/DELETE. */
    updatedAt: string
}

/** A recorded debt payment between two trip participants ("mark as paid").
 *  Offsets the debt map: fromUser paid toUser this much outside the app. */
export type SettlementRecord = {
    id: number
    fromUserId: number
    toUserId: number
    amountUsd: number
    note: string | null
    settledOn: string   // ISO YYYY-MM-DD
    createdBy: number
    createdAt: string
}

/** Raw Google `priceRange`. `units` is an int64-as-string in proto3 JSON.
 *  Stored raw in place_details.price_range; format via lib/place-display.ts. */
export type PlacePriceRange = {
    startPrice?: { currencyCode?: string; units?: string } | null
    endPrice?: { currencyCode?: string; units?: string } | null
}

/** Place data from the place_details table, returned via JOIN on expenses. */
export type PlaceInfo = {
    googlePlaceId: string
    name: string
    address: string | null
    lat: number | null
    lng: number | null
    priceLevel: number | null        // 0-4
    priceRange: PlacePriceRange | null
    rating: number | null            // e.g. 4.2
    userRatingCount: number | null   // N behind `rating`, e.g. 2431
    primaryType: string | null       // e.g. 'japanese_restaurant'
    types: string[] | null
    website: string | null
    hoursJson: Record<string, unknown> | null
    photoRefs: string[] | null
    /** Raw Google address components. The area display ("Shibuya, Tokyo") is
     *  derived from these in lib/place-display.ts — the rule is per-country, so
     *  it stays in code rather than baked in at save time. Null for places saved
     *  before migration 00039. */
    addressComponents: AddressComponent[] | null
}

export type ExpenseCategory = {
    id: number
    name: string
    slug: string | null
    updatedAt: string
}

export type ExpenseCategoryWithMeta = ExpenseCategory & {
    usageCount: number
    canEdit: boolean
}

export type Location = {
    id: number
    name: string
}

export type ActivityEntry = {
    id: number
    tableName: string
    recordId: number
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    oldData: Record<string, unknown> | null
    newData: Record<string, unknown> | null
    changedBy: {
        id: number
        name: string
        initials: string | null
        iconColor: string | null
    } | null
    changedAt: string // ISO timestamp
    summary: string   // human-readable description
    intent: 'create' | 'update' | 'delete' | 'restore' // semantic action (soft-deletes/left_at folded in)
}

// Google Places API types
export type PlacePrediction = {
    placeId: string
    name: string
    address: string
}

export type PlaceDetails = {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
    addressComponents: AddressComponent[]
    types: string[]
    primaryType: string | null
    priceLevel: number | null
    priceRange: PlacePriceRange | null
    rating: number | null
    userRatingCount: number | null
    website: string | null
    hoursJson: Record<string, unknown> | null
    photoRefs: string[] | null
}

export type AddressComponent = {
    longText: string
    shortText: string
    types: string[]
}

export type UserPreferences = {
    defaultTripVisibility: 'participants' | 'all_users'
    defaultParticipantRole: 'editor' | 'viewer'
    initials: string | null
    iconColor: string | null
    isAdmin: boolean
    alphabetIndexSide: 'left' | 'right'
}
