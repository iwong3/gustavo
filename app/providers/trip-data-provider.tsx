'use client'

import { createContext, useContext } from 'react'

import type { TripSummary, Expense, SettlementRecord } from '@/lib/types'

type TripData = {
    expenses: Expense[]
    settlements: SettlementRecord[]
    trip: TripSummary
}

const TripDataContext = createContext<TripData | null>(null)

export function TripDataProvider({
    expenses,
    settlements = [],
    trip,
    children,
}: {
    expenses: Expense[]
    /** Recorded debt payments; optional so gallery fixtures can omit it. */
    settlements?: SettlementRecord[]
    trip: TripSummary
    children: React.ReactNode
}) {
    return (
        <TripDataContext.Provider value={{ expenses, settlements, trip }}>
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
