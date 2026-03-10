/**
 * DB-backed data fetching.
 * All types are DB-driven — no enum mappings.
 */

import type { TripSummary, UserSummary, Expense, ExpenseCategory, ExpenseCategoryWithMeta, Location, UserPreferences, TripRole } from '@/lib/types'

// ── Trips ──

export const fetchTrips = async (): Promise<TripSummary[]> => {
    const res = await fetch('/api/trips')
    if (!res.ok) throw new Error(`Failed to fetch trips: ${res.status}`)
    return res.json()
}

export const fetchTripBySlug = async (slug: string): Promise<TripSummary> => {
    const res = await fetch(`/api/trips?slug=${encodeURIComponent(slug)}`)
    if (!res.ok) throw new Error(`Failed to fetch trip: ${res.status}`)
    return res.json()
}

export type CreateTripData = {
    name: string
    slug?: string
    startDate: string
    endDate: string
    description?: string
    participantIds?: number[]
    visibility?: 'participants' | 'all_users'
    currency?: string
}

export const createTrip = async (data: CreateTripData): Promise<{ id: number; slug: string }> => {
    const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create trip')
    }
    return res.json()
}

export const updateTrip = async (tripId: number, data: Partial<CreateTripData> & { visibility?: string }): Promise<void> => {
    const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update trip')
    }
}

export const deleteTrip = async (tripId: number): Promise<void> => {
    const res = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete trip')
    }
}

// ── Users ──

export const fetchUsers = async (): Promise<UserSummary[]> => {
    const res = await fetch('/api/users')
    if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`)
    return res.json()
}

// ── Expenses ──

export const fetchExpenses = async (tripId: number): Promise<Expense[]> => {
    const res = await fetch(`/api/trips/${tripId}/expenses`)
    if (!res.ok) throw new Error(`Failed to fetch expenses: ${res.status}`)
    return res.json()
}

export type AddExpenseData = {
    name: string
    date: string // YYYY-MM-DD
    cost: number
    currency: string
    category_id?: number
    paid_by: string // first name
    split_between: string[] // first names, or ["Everyone"]
    location?: string // location name
    notes?: string
}

export const addExpense = async (tripId: number, data: AddExpenseData): Promise<{ id: number }> => {
    const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add expense')
    }
    return res.json()
}

export type UpdateExpenseData = Partial<AddExpenseData>

export const updateExpense = async (
    tripId: number,
    expenseId: number,
    data: UpdateExpenseData
): Promise<void> => {
    const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update expense')
    }
}

export const deleteExpense = async (tripId: number, expenseId: number): Promise<void> => {
    const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: 'DELETE',
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete expense')
    }
}

// ── Categories ──

export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
    const res = await fetch('/api/expense-categories')
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
    return res.json()
}

export const fetchExpenseCategoriesWithMeta = async (): Promise<ExpenseCategoryWithMeta[]> => {
    const res = await fetch('/api/expense-categories?includeCount=true')
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
    return res.json()
}

// ── Locations ──

export const fetchLocations = async (tripId: number): Promise<Location[]> => {
    const res = await fetch(`/api/trips/${tripId}/locations`)
    if (!res.ok) throw new Error(`Failed to fetch locations: ${res.status}`)
    return res.json()
}

// ── Participant Roles ──

export const updateParticipantRole = async (
    tripId: number,
    userId: number,
    role: TripRole
): Promise<void> => {
    const res = await fetch(`/api/trips/${tripId}/participants/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update role')
    }
}

// ── User Preferences ──

export const fetchUserPreferences = async (): Promise<UserPreferences> => {
    const res = await fetch('/api/users/me/preferences')
    if (!res.ok) throw new Error(`Failed to fetch preferences: ${res.status}`)
    return res.json()
}

export const updateUserPreferences = async (data: Partial<UserPreferences>): Promise<void> => {
    const res = await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update preferences')
    }
}

// ── Activity Log ──

export type ActivityResponse = {
    entries: import('@/lib/types').ActivityEntry[]
    fieldLabels: Record<string, string>
    ignoredFields: string[]
}

export const fetchActivity = async (tripId: number): Promise<ActivityResponse> => {
    const res = await fetch(`/api/trips/${tripId}/activity`)
    if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`)
    return res.json()
}

// ── Allowed Emails (admin) ──

export type AllowedEmail = {
    id: number
    email: string
    createdAt: string
    addedByName: string | null
    hasAccount: boolean
    userName: string | null
}

export const fetchAllowedEmails = async (): Promise<AllowedEmail[]> => {
    const res = await fetch('/api/allowed-emails')
    if (!res.ok) throw new Error(`Failed to fetch allowed emails: ${res.status}`)
    return res.json()
}

export const addAllowedEmail = async (email: string): Promise<AllowedEmail> => {
    const res = await fetch('/api/allowed-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add email')
    }
    return res.json()
}

export const removeAllowedEmail = async (id: number): Promise<void> => {
    const res = await fetch(`/api/allowed-emails/${id}`, { method: 'DELETE' })
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to remove email')
    }
}
