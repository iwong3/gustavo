/**
 * DB-backed data fetching.
 * All types are DB-driven — no enum mappings.
 */

import type { TripSummary, UserSummary, Expense, ExpenseCategory, Location } from '@/lib/types'

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

export const updateTrip = async (tripId: number, data: Partial<CreateTripData>): Promise<void> => {
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

// ── Locations ──

export const fetchLocations = async (tripId: number): Promise<Location[]> => {
    const res = await fetch(`/api/trips/${tripId}/locations`)
    if (!res.ok) throw new Error(`Failed to fetch locations: ${res.status}`)
    return res.json()
}
