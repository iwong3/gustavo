import { create } from 'zustand'

import { Trip } from 'utils/trips'

type TripsState = {
    currentTrip: Trip

    loading: boolean
    fetchDataError: boolean
    currencyConversionError: boolean
}

type TripsActions = {
    setCurrentTrip: (trip: Trip) => void

    setLoading: (isLoading: boolean) => void
    setFetchDataError: (error: boolean) => void
    setCurrencyConversionError: (error: boolean) => void
}

const initialState: TripsState = {
    currentTrip: Trip.Japan2024,

    loading: true,
    fetchDataError: false,
    currencyConversionError: false,
}

export const useTripsStore = create<TripsState & TripsActions>((set) => ({
    ...initialState,

    setCurrentTrip: (trip) => set({ currentTrip: trip }),

    setLoading: (loading) => set({ loading }),
    setFetchDataError: (fetchDataError: boolean) =>
        set(() => ({ fetchDataError })),
    setCurrencyConversionError: (currencyConversionError: boolean) =>
        set(() => ({ currencyConversionError })),
}))
