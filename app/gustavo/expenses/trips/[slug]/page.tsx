'use client'

import { Box } from '@mui/material'
import { useParams, notFound } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useDebtCalculatorStore } from 'components/debt/debt-calculator'
import { resetAllMenuItemStores } from 'components/menu/menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useToolsMenuStore } from 'components/menu/tools/tools-menu'
import { TripDataProvider } from 'providers/trip-data-provider'
import { fetchExpenses } from 'utils/api'
import { getTablerIcon } from 'utils/icons'
import { Spend } from 'utils/spend'
import { slugToTrip } from 'utils/trips'
import { Gustavo } from 'views/gustavo'
import { useTripsStore } from 'views/trips'

export default function TripDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const trip = slugToTrip(slug)

    // Trip data owned by React state — guaranteed re-renders on change.
    // Passed to children via TripDataProvider (React Context).
    const [spendData, setSpendData] = useState<Spend[]>([])

    // Zustand stores for layout display only (header title, loading spinner)
    const setCurrentTrip = useTripsStore((s) => s.setCurrentTrip)
    const setLoading = useTripsStore((s) => s.setLoading)
    const setFetchDataError = useTripsStore((s) => s.setFetchDataError)
    const setCurrencyConversionError = useTripsStore(
        (s) => s.setCurrencyConversionError
    )
    const fetchDataError = useTripsStore((s) => s.fetchDataError)

    // Zustand stores for UI state resets
    const resetSearchBarStore = useSearchBarStore((s) => s.reset)
    const resetToolsMenuStore = useToolsMenuStore((s) => s.reset)
    const resetDebtCalculatorStore = useDebtCalculatorStore((s) => s.reset)

    useEffect(() => {
        if (!trip) return
        let ignore = false

        setLoading(true)
        setSpendData([])

        async function loadTrip() {
            try {
                const [data, currencyConversionError] =
                    await fetchExpenses(trip!)

                if (ignore) return

                if (currencyConversionError) {
                    setCurrencyConversionError(true)
                }

                // Reset UI stores for the new trip
                setCurrentTrip(trip!)
                resetAllMenuItemStores(trip!)
                resetSearchBarStore()
                resetToolsMenuStore()
                resetDebtCalculatorStore()

                // Set data via React state — triggers page re-render,
                // which updates TripDataProvider's context value,
                // which propagates to all consumers.
                setSpendData(data)
                setLoading(false)
            } catch (err) {
                console.error(err)
                if (!ignore) {
                    setFetchDataError(true)
                }
            }
        }

        loadTrip()

        return () => {
            ignore = true
        }
    }, [trip])

    const refreshData = useCallback(async () => {
        if (!trip) return
        try {
            const [data, convError] = await fetchExpenses(trip)
            if (convError) setCurrencyConversionError(true)
            setSpendData(data)
        } catch (err) {
            console.error('Error refreshing expenses:', err)
        }
    }, [trip])

    if (!trip) {
        notFound()
    }

    if (fetchDataError) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    margin: 5,
                    width: '100%',
                    border: '1px solid #C1121F',
                    borderRadius: '10px',
                    backgroundColor: '#FFFCEE',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingY: 4,
                        borderTopLeftRadius: '10px',
                        borderTopRightRadius: '10px',
                        backgroundColor: '#f4978e',
                    }}>
                    {getTablerIcon({
                        name: 'IconExclamationCircle',
                        fill: '#f4978e',
                        color: '#FFFCEE',
                        size: 42,
                    })}
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 2,
                        borderBottomLeftRadius: '10px',
                        borderBottomRightRadius: '10px',
                        backgroundColor: '#FFFCEE',
                        fontSize: 16,
                        textAlign: 'center',
                    }}>
                    There was an error loading trip data. Please refresh to try
                    again.
                </Box>
            </Box>
        )
    }

    return (
        <TripDataProvider spendData={spendData} trip={trip}>
            <Gustavo key={slug} onRefresh={refreshData} />
        </TripDataProvider>
    )
}
