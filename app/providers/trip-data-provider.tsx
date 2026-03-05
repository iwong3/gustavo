'use client'

import { createContext, useContext } from 'react'

import { Spend } from 'utils/spend'
import { Trip } from 'utils/trips'

type TripData = {
    spendData: Spend[]
    trip: Trip
}

const TripDataContext = createContext<TripData | null>(null)

export function TripDataProvider({
    spendData,
    trip,
    children,
}: {
    spendData: Spend[]
    trip: Trip
    children: React.ReactNode
}) {
    return (
        <TripDataContext.Provider value={{ spendData, trip }}>
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
