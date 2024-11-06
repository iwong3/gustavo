import { Box } from '@mui/material'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useDebtCalculatorStore } from 'components/debt/debt-calculator'
import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { getFromCache, saveInCache } from 'helpers/cache'
import { fetchData } from 'helpers/data-mapping'
import { useEffect } from 'react'
import { useGustavoStore } from 'views/gustavo'
import { useMainStore } from 'views/main'

enum Trip {
    Japan2024 = 'Japan 2024',
    Vancouver2024 = 'Vancouver 2024',
}

type TripsState = {
    currentTrip: Trip
}

type TripsActions = {
    setCurrentTrip: (trip: Trip) => void
}

const initialState: TripsState = {
    currentTrip: Trip.Japan2024,
}

export const useTripsStore = create<TripsState & TripsActions>((set) => ({
    ...initialState,

    setCurrentTrip: (trip) => set({ currentTrip: trip }),
}))

export const Trips = () => {
    const { currentTrip, setCurrentTrip } = useTripsStore(
        useShallow((state) => state)
    )
    const {
        setSpendData,
        setFilteredSpendData,
        setFilteredSpendDataWithoutSplitBetween,
        setFilteredSpendDataWithoutSpendType,
        setFilteredSpendDataWithoutLocation,
        setError,
    } = useGustavoStore(useShallow((state) => state))
    const { setShowTripsMenu } = useMainStore(useShallow((state) => state))

    // filter stores
    const { reset: resetFilterSplitBetweenStore } = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )
    const { reset: resetFilterPaidByStore } = useFilterPaidByStore(
        useShallow((state) => state)
    )
    const { reset: resetFilterLocationStore } = useFilterLocationStore(
        useShallow((state) => state)
    )

    // tools stores
    const { reset: resetDebtCalculatorStore } = useDebtCalculatorStore(
        useShallow((state) => state)
    )

    const initializeCurrentTripData = async (trip: Trip) => {
        try {
            const data = await fetchData(trip)

            // set data
            setSpendData(data)
            setFilteredSpendData(data)
            setFilteredSpendDataWithoutSplitBetween(data)
            setFilteredSpendDataWithoutSpendType(data)
            setFilteredSpendDataWithoutLocation(data)

            // reset all filter stores
            resetFilterSplitBetweenStore(trip)
            resetFilterPaidByStore(trip)
            resetFilterLocationStore(trip)

            // // reset all tools stores
            resetDebtCalculatorStore()
        } catch (err) {
            // if error, we may still want to show gustavo
            // setError(true)
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
                // if error, we may still want to show gustavo
                // setError(true)
            }
        }

        const currentTrip = getFromCache('currentTrip', '')
        if (currentTrip) {
            runInitializeCurrentTripData(currentTrip as Trip)
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
            // if error, we may still want to show gustavo
            setError(true)
        }
    }

    const renderTrips = () => {
        return Object.values(Trip).map((trip) => {
            return (
                <Box
                    key={trip}
                    onClick={() => handleTripClick(trip)}
                    sx={{
                        cursor: 'pointer',
                        color: trip === currentTrip ? 'primary.main' : 'black',
                        border: trip === currentTrip ? '1px solid' : 'none',
                    }}>
                    {trip}
                </Box>
            )
        })
    }

    return (
        <Box>
            Trips
            {renderTrips()}
        </Box>
    )
}
