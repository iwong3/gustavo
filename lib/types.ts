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

/** Place data from the place_details table, returned via JOIN on expenses. */
export type PlaceInfo = {
    googlePlaceId: string
    name: string
    address: string | null
    lat: number | null
    lng: number | null
    priceLevel: number | null        // 0-4
    rating: number | null            // e.g. 4.2
    primaryType: string | null       // e.g. 'japanese_restaurant'
    types: string[] | null
    website: string | null
    hoursJson: Record<string, unknown> | null
    photoRefs: string[] | null
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
    rating: number | null
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
