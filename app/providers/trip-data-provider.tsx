'use client'

import { createContext, useContext } from 'react'

import type { TripSummary, Expense } from '@/lib/types'

type TripData = {
    expenses: Expense[]
    trip: TripSummary
}

const TripDataContext = createContext<TripData | null>(null)

export function TripDataProvider({
    expenses,
    trip,
    children,
}: {
    expenses: Expense[]
    trip: TripSummary
    children: React.ReactNode
}) {
    return (
        <TripDataContext.Provider value={{ expenses, trip }}>
            {children}
        </TripDataContext.Provider>
    )
}

export function useTripData(): TripData {
    const ctx = useContext(TripDataContext)
    if (!ctx) {
        throw new Error('useTripData must be used within TripDataProvider')
    }
    return ctx
}
