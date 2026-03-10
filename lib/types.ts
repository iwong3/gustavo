/** DB-driven types — replaces all hardcoded enums (Trip, Person, Location, SpendType). */

export type TripRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type TripSummary = {
    id: number
    name: string
    slug: string
    startDate: string  // ISO YYYY-MM-DD
    endDate: string    // ISO YYYY-MM-DD
    description: string | null
    currency: string
    visibility: 'participants' | 'all_users'
    userRole: TripRole | null  // current user's role, null if non-participant viewing public trip
    isAdmin: boolean
    currentUserId: number
    participants: ParticipantSummary[]
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
}

export type ExpenseCategory = {
    id: number
    name: string
    slug: string | null
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
}

export type UserPreferences = {
    defaultTripVisibility: 'participants' | 'all_users'
    defaultParticipantRole: 'editor' | 'viewer'
    initials: string | null
    iconColor: string | null
    isAdmin: boolean
}
