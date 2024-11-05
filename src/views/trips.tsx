import { Box } from '@mui/material'
import { create } from 'zustand'

import { useDebtCalculatorStore } from 'components/debt/debt-calculator'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { useMainStore } from 'views/main'
import { useShallow } from 'zustand/react/shallow'

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
    const { setShowTripsMenu } = useMainStore(useShallow((state) => state))

    // filter stores
    const { reset: resetFilterSplitBetweenStore } = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )
    const { reset: resetFilterPaidByStore } = useFilterPaidByStore(
        useShallow((state) => state)
    )

    // tools stores
    const { reset: resetDebtCalculatorStore } = useDebtCalculatorStore(
        useShallow((state) => state)
    )

    const handleTripClick = (trip: Trip) => {
        setCurrentTrip(trip)
        setShowTripsMenu(false)

        // reset all filter stores
        resetFilterSplitBetweenStore(trip)
        resetFilterPaidByStore(trip)

        // reset all tools stores
        resetDebtCalculatorStore()
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
