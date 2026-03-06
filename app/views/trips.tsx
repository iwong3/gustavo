import { create } from 'zustand'

type TripsState = {
    currentTrip: string

    loading: boolean
    fetchDataError: boolean
    currencyConversionError: boolean
}

type TripsActions = {
    setCurrentTrip: (trip: string) => void

    setLoading: (isLoading: boolean) => void
    setFetchDataError: (error: boolean) => void
    setCurrencyConversionError: (error: boolean) => void
}

const initialState: TripsState = {
    currentTrip: '',

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
