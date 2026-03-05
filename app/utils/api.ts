/**
 * DB-backed data fetching — replaces utils/data-mapping.ts fetchDataFromSheets().
 *
 * fetchExpenses() is a drop-in replacement: same signature, same Spend[] shape,
 * so all downstream Zustand stores, filters, and components work unchanged.
 */

import { Currency } from 'utils/currency'
import { Location } from 'utils/location'
import { getPersonFromEmail, getPersonFromFirstName, Person } from 'utils/person'
import { Spend, SpendType } from 'utils/spend'
import { Trip } from 'utils/trips'

// Trip enum value → DB trip ID
const TripToId: Record<Trip, number> = {
    [Trip.Japan2024]: 1,
    [Trip.Vancouver2024]: 2,
    [Trip.SouthKorea2025]: 3,
    [Trip.Japan2025]: 4,
}

// DB returns ISO dates (YYYY-MM-DD). The app expects M/D/YYYY to match
// the original Google Sheets format used by filters, sorting, and display.
function isoToAppDate(isoDate: string): string {
    const [year, month, day] = isoDate.slice(0, 10).split('-')
    return `${parseInt(month)}/${parseInt(day)}/${year}`
}

export const fetchExpenses = async (trip: Trip): Promise<[Spend[], boolean]> => {
    const res = await fetch(`/api/trips/${TripToId[trip]}/expenses`)
    if (!res.ok) {
        throw new Error(`Failed to fetch expenses for ${trip}: ${res.status}`)
    }

    const rows: Array<{
        id: number
        name: string
        date: string
        cost_original: string
        currency: string
        cost_converted_usd: string
        conversion_error: boolean
        category: string | null
        notes: string | null
        reported_at: string | null
        location_name: string | null
        paid_by_name: string
        reported_by_email: string | null
        split_between: string[] | null
        is_everyone: boolean
    }> = await res.json()

    let currencyConversionError = false

    const data: Spend[] = rows.map((row) => {
        if (row.conversion_error) {
            currencyConversionError = true
        }

        const paidBy =
            getPersonFromFirstName(row.paid_by_name.split(' ')[0]) ??
            (row.paid_by_name.split(' ')[0] as Person)

        let splitBetween: Person[]
        if (row.is_everyone) {
            splitBetween = [Person.Everyone]
        } else {
            splitBetween = (row.split_between ?? [])
                .map((name) => getPersonFromFirstName(name))
                .filter((p): p is Person => p !== undefined)
        }

        return {
            trip,
            name: row.name,
            date: isoToAppDate(row.date),
            originalCost: parseFloat(row.cost_original),
            currency: row.currency as Currency,
            convertedCost: parseFloat(row.cost_converted_usd),
            paidBy,
            splitBetween,
            location: (row.location_name as Location) ?? undefined,
            type: (row.category as SpendType) ?? undefined,
            notes: row.notes ?? '',
            reportedBy: row.reported_by_email
                ? getPersonFromEmail(row.reported_by_email.trim())
                : undefined,
            reportedAt: row.reported_at ?? undefined,
            receiptImageUrl: undefined, // not stored in DB yet
            error: row.conversion_error,
        }
    })

    return [data, currencyConversionError]
}

export type AddExpenseData = {
    name: string
    date: string // YYYY-MM-DD
    cost: number
    currency: string
    category?: string
    paid_by: string // first name
    split_between: string[] // first names, or ["Everyone"]
    location?: string // location name
    notes?: string
}

export const addExpense = async (trip: Trip, data: AddExpenseData): Promise<{ id: number }> => {
    const res = await fetch(`/api/trips/${TripToId[trip]}/expenses`, {
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
