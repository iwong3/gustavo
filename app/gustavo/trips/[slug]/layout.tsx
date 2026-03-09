'use client'

import { colors } from '@/lib/colors'
import { Box, CircularProgress } from '@mui/material'
import { resetAllMenuItemStores } from 'components/menu/menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useParams } from 'next/navigation'
import { RefreshProvider } from 'providers/refresh-provider'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'
import { useCallback, useEffect, useState } from 'react'
import { fetchExpenses, fetchTripBySlug } from 'utils/api'
import { getTablerIcon } from 'utils/icons'

import type { Expense, TripSummary } from '@/lib/types'

export default function TripLayout({ children }: { children: React.ReactNode }) {
    const { slug } = useParams<{ slug: string }>()

    const [trip, setTrip] = useState<TripSummary | null>(null)
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const resetSearchBarStore = useSearchBarStore((s) => s.reset)

    useEffect(() => {
        if (!slug) return
        let ignore = false

        setLoading(true)
        setError(false)
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

                // Reset filter stores so sub-pages mount into clean state
                resetAllMenuItemStores({
                    participantNames,
                    categoryNames,
                    locationNames,
                })
                resetSearchBarStore()

                setTrip(tripData)
                setExpenses(expensesData)
                setLoading(false)
            } catch (err) {
                console.error(err)
                if (!ignore) {
                    setError(true)
                    setLoading(false)
                }
            }
        }

        loadTrip()

        return () => {
            ignore = true
        }
    }, [slug, resetSearchBarStore])

    const refreshData = useCallback(async () => {
        if (!trip) return
        try {
            const data = await fetchExpenses(trip.id)
            setExpenses(data)
        } catch (err) {
            console.error('Error refreshing expenses:', err)
        }
    }, [trip])

    if (error) {
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

    if (loading || !trip) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: 4,
                }}>
                <CircularProgress sx={{ color: colors.primaryYellow }} />
            </Box>
        )
    }

    return (
        <TripDataProvider expenses={expenses} trip={trip}>
            <SpendDataProvider>
                <RefreshProvider onRefresh={refreshData}>
                    {children}
                </RefreshProvider>
            </SpendDataProvider>
        </TripDataProvider>
    )
}
