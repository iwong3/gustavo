import { Box } from '@mui/material'
import { useEffect } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useDebtCalculatorStore } from 'components/debt/debt-calculator'
import { resetAllMenuItemStores } from 'components/menu/menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useToolsMenuStore } from 'components/menu/tools/tools-menu'
import { getFromCache, saveInCache } from 'utils/cache'
import { fetchData } from 'utils/data-mapping'
import { ActiveTrips, Trip } from 'utils/trips'
import { useGustavoStore } from 'views/gustavo'
import { useMainStore } from 'views/main'
// import Japan2024Image from '../images/japan-2024.jpg'
// import Vancouver2024Image from '../images/vancouver-2024.png'

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

export const Trips = () => {
    const {
        setCurrentTrip,
        loading,
        setLoading,
        setFetchDataError,
        setCurrencyConversionError,
    } = useTripsStore(useShallow((state) => state))

    const {
        setSpendData,
        setFilteredSpendData,
        setFilteredSpendDataWithoutSplitBetween,
        setFilteredSpendDataWithoutSpendType,
        setFilteredSpendDataWithoutLocation,
    } = useGustavoStore(useShallow((state) => state))
    const { setShowTripsMenu } = useMainStore(useShallow((state) => state))

    // search store
    const { reset: resetSearchBarStore } = useSearchBarStore(
        useShallow((state) => state)
    )

    // tools stores
    const { reset: resetToolsMenuStore } = useToolsMenuStore(
        useShallow((state) => state)
    )
    const { reset: resetDebtCalculatorStore } = useDebtCalculatorStore(
        useShallow((state) => state)
    )

    const initializeCurrentTripData = async (trip: Trip) => {
        try {
            const results = await fetchData(trip)
            const data = results[0]
            const currencyConversionError = results[1]

            if (currencyConversionError) {
                setCurrencyConversionError(true)
            }

            // set data
            setSpendData(data)
            setFilteredSpendData(data)
            setFilteredSpendDataWithoutSplitBetween(data)
            setFilteredSpendDataWithoutSpendType(data)
            setFilteredSpendDataWithoutLocation(data)

            // reset all menu item stores
            resetAllMenuItemStores(trip)

            // reset search bar store
            resetSearchBarStore()

            // reset all tools stores
            resetToolsMenuStore()
            resetDebtCalculatorStore()
        } catch (err) {
            throw err
        }
    }

    // on first load, check cache for current trip
    // if it exists, initialize current trip data
    useEffect(() => {
        async function runInitializeCurrentTripData(trip: Trip) {
            try {
                await initializeCurrentTripData(trip)

                // set the current trip
                setCurrentTrip(trip)
                setShowTripsMenu(false)
            } catch (err) {
                setFetchDataError(true)
            } finally {
                setLoading(false)
            }
        }

        const currentTrip = getFromCache('currentTrip', '')
        if (currentTrip) {
            runInitializeCurrentTripData(currentTrip as Trip)
        } else {
            setLoading(false)
        }
    }, [])

    const handleTripClick = async (trip: Trip) => {
        try {
            await initializeCurrentTripData(trip)

            // set the current trip
            setCurrentTrip(trip)
            saveInCache('currentTrip', trip)
            setShowTripsMenu(false)
        } catch (err) {
            setFetchDataError(true)
        } finally {
            setLoading(false)
        }
    }

    const renderTrips = () => {
        const trips = []
        let row = []
        const rowLength = 2

        for (let i = 0; i < ActiveTrips.length; i++) {
            row.push(renderTrip(ActiveTrips[i]))

            if (row.length === rowLength || i === ActiveTrips.length - 1) {
                trips.push(
                    <Box
                        key={'trip-row-' + trips.length}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                        }}>
                        {row}
                    </Box>
                )
                row = []
            }
        }

        return trips
    }

    const renderTrip = (trip: Trip) => {
        const key = 'trip-' + trip

        return (
            <Box
                key={key}
                onClick={() => handleTripClick(trip)}
                sx={{
                    'display': 'flex',
                    'alignItems': 'flex-end',
                    'padding': 2,
                    'width': '39%',
                    'height': window.innerHeight * 0.1,
                    'border': '1px solid #FBBC04',
                    'borderRadius': '10px',
                    'backgroundColor': 'rgba(0, 0, 0, 0.4)',
                    'backgroundImage': `url(${getBackgroundImageUrlForTrip(
                        trip
                    )})`,
                    'backgroundSize': 'cover',
                    'backgroundBlendMode': 'darken',
                    'boxShadow': 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                    'color': 'white',
                    'fontSize': 18,
                    'fontWeight': 'bold',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    },
                    'transition': 'background-color 0.2s ease-out',
                }}>
                {trip}
            </Box>
        )
    }

    const getBackgroundImageUrlForTrip = (trip: Trip) => {
        switch (trip) {
            case Trip.Japan2024:
                return '' // Japan2024Image
            case Trip.Vancouver2024:
                return '' // Vancouver2024Image
            default:
                return ''
        }
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                marginX: 2,
                marginTop: 2,
                width: '100%',
                height: '100%',
            }}>
            {!loading && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 2,
                        width: '100%',
                        fontSize: 24,
                        fontFamily: 'Spectral',
                    }}>
                    Upcoming Trips
                </Box>
            )}
            {!loading && renderTrips()}
        </Box>
    )
}
