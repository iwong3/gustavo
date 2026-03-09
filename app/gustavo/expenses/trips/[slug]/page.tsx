'use client'

import { colors } from '@/lib/colors'
import { Box } from '@mui/material'
import { resetAllMenuItemStores } from 'components/menu/menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useToolsMenuStore } from 'components/menu/tools/tools-menu'
import { useParams } from 'next/navigation'
import { TripDataProvider } from 'providers/trip-data-provider'
import { useCallback, useEffect, useState } from 'react'
import { fetchExpenses, fetchTripBySlug } from 'utils/api'
import { getTablerIcon } from 'utils/icons'
import { Gustavo } from 'views/gustavo'
import { useTripsStore } from 'views/trips'

import type { Expense, TripSummary } from '@/lib/types'

export default function TripDetailPage() {
    const { slug } = useParams<{ slug: string }>()

    const [trip, setTrip] = useState<TripSummary | null>(null)
    const [expenses, setExpenses] = useState<Expense[]>([])

    const setCurrentTrip = useTripsStore((s) => s.setCurrentTrip)
    const setLoading = useTripsStore((s) => s.setLoading)
    const setFetchDataError = useTripsStore((s) => s.setFetchDataError)
    const setCurrencyConversionError = useTripsStore(
        (s) => s.setCurrencyConversionError
    )
    const fetchDataError = useTripsStore((s) => s.fetchDataError)

    const resetSearchBarStore = useSearchBarStore((s) => s.reset)
    const resetToolsMenuStore = useToolsMenuStore((s) => s.reset)
    useEffect(() => {
        if (!slug) return
        let ignore = false

        setLoading(true)
        setFetchDataError(false)
        setExpenses([])
        setTrip(null)

        async function loadTrip() {
            try {
                const tripData = await fetchTripBySlug(slug)
                if (ignore) return

                const expensesData = await fetchExpenses(tripData.id)
                if (ignore) return

                const participantNames = tripData.participants.map(
                    (p) => p.firstName
                )
                const categoryNames = Array.from(
                    new Set(expensesData.map((e) => e.categoryName ?? 'Other'))
                )
                const locationNames = Array.from(
                    new Set(
                        expensesData
                            .map((e) => e.locationName)
                            .filter((l): l is string => l != null)
                    )
                )

                // Reset Zustand stores FIRST so Gustavo mounts into clean filter state
                setCurrentTrip(tripData.name)
                resetAllMenuItemStores({
                    participantNames,
                    categoryNames,
                    locationNames,
                })
                resetSearchBarStore()
                resetToolsMenuStore()

                // Then set React state to mount Gustavo with correct data
                setTrip(tripData)
                setExpenses(expensesData)
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
    }, [slug])

    const refreshData = useCallback(async () => {
        if (!trip) return
        try {
            const data = await fetchExpenses(trip.id)
            setExpenses(data)
        } catch (err) {
            console.error('Error refreshing expenses:', err)
        }
    }, [trip])

    if (fetchDataError) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    margin: 5,
                    width: '100%',
                    border: `1.5px solid ${colors.primaryRed}`,
                    borderRadius: '10px',
                    backgroundColor: colors.primaryWhite,
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingY: 4,
                        borderTopLeftRadius: '10px',
                        borderTopRightRadius: '10px',
                        backgroundColor: colors.primaryRed,
                    }}>
                    {getTablerIcon({
                        name: 'IconExclamationCircle',
                        fill: colors.primaryRed,
                        color: colors.primaryWhite,
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
                        backgroundColor: colors.primaryWhite,
                        fontSize: 16,
                        textAlign: 'center',
                    }}>
                    There was an error loading trip data. Please refresh to try
                    again.
                </Box>
            </Box>
        )
    }

    if (!trip) {
        return null
    }

    return (
        <TripDataProvider expenses={expenses} trip={trip}>
            <Gustavo key={slug} onRefresh={refreshData} />
        </TripDataProvider>
    )
}
