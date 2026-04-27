'use client'

import { colors } from '@/lib/colors'
import { Box, CircularProgress } from '@mui/material'
import { resetAllMenuItemStores } from 'components/menu/menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useParams } from 'next/navigation'
import { RefreshProvider } from 'providers/refresh-provider'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'
import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchExpenses, fetchTripBySlug } from 'utils/api'
import { getTablerIcon } from 'utils/icons'

import { queryKeys } from '@/lib/query-keys'

export default function TripLayout({ children }: { children: React.ReactNode }) {
    const { slug } = useParams<{ slug: string }>()
    const queryClient = useQueryClient()

    const resetSearchBarStore = useSearchBarStore((s) => s.reset)

    const tripQuery = useQuery({
        queryKey: queryKeys.trips.bySlug(slug),
        queryFn: () => fetchTripBySlug(slug),
        enabled: Boolean(slug),
    })
    const trip = tripQuery.data ?? null

    const expensesQuery = useQuery({
        queryKey: trip ? queryKeys.trips.expenses(trip.id) : ['trip-expenses', 'pending'],
        queryFn: () => fetchExpenses(trip!.id),
        enabled: Boolean(trip),
    })
    const expenses = expensesQuery.data ?? []

    const loading =
        tripQuery.isLoading ||
        (Boolean(trip) && expensesQuery.isLoading) ||
        (Boolean(trip) && !expensesQuery.data && !expensesQuery.isError)
    const error = tripQuery.isError || expensesQuery.isError

    // Reset menu/search stores once per loaded (trip, expenses) pair so
    // sub-pages mount into clean filter state. Keyed by trip.id + expenses
    // identity so we don't reset on every background refetch.
    const resetKeyRef = useRef<string | null>(null)
    useEffect(() => {
        if (!trip || !expensesQuery.data) return
        const key = `${trip.id}:${expensesQuery.dataUpdatedAt}`
        if (resetKeyRef.current === key) return
        // Only do the reset on the first load for this trip (not on background refetches)
        const tripChanged = !resetKeyRef.current?.startsWith(`${trip.id}:`)
        resetKeyRef.current = key
        if (!tripChanged) return

        const participantNames = trip.participants.map((p) => p.firstName)
        const categoryNames = Array.from(
            new Set(expensesQuery.data.map((e) => e.categoryName ?? 'Other'))
        )
        const locationNames = Array.from(
            new Set(
                expensesQuery.data
                    .map((e) => e.locationName)
                    .filter((l): l is string => l != null)
            )
        )
        resetAllMenuItemStores({ participantNames, categoryNames, locationNames })
        resetSearchBarStore()
    }, [trip, expensesQuery.data, expensesQuery.dataUpdatedAt, resetSearchBarStore])

    const refreshData = useCallback(async () => {
        if (!trip) return
        await queryClient.invalidateQueries({
            queryKey: queryKeys.trips.expenses(trip.id),
        })
    }, [trip, queryClient])

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
