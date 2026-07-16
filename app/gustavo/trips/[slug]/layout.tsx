'use client'

import { colors } from '@/lib/colors'
import { Box } from '@mui/material'
import { resetAllMenuItemStores } from 'components/menu/menu'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useParams, useRouter } from 'next/navigation'
import { RefreshProvider } from 'providers/refresh-provider'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'
import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchExpenses, fetchSettlements } from 'utils/api'
import { getTablerIcon } from 'utils/icons'

import { ReceiptsListSkeleton } from 'components/receipts/receipts-list-skeleton'
import { useTripBySlug } from 'hooks/use-trip-by-slug'
import { queryKeys } from '@/lib/query-keys'
import { tripTools } from '@/lib/trip-tools'

export default function TripLayout({ children }: { children: React.ReactNode }) {
    const { slug } = useParams<{ slug: string }>()
    const queryClient = useQueryClient()
    const router = useRouter()

    const resetSearchBarStore = useSearchBarStore((s) => s.reset)

    // Warm the client router cache for this trip's other tools so switching
    // between Expenses/Debts/Insights/... is instant rather than re-fetching the
    // route on each tap. Pairs with experimental.staleTimes (next.config), which
    // keeps these prefetched segments cached client-side.
    useEffect(() => {
        if (!slug) return
        for (const tool of tripTools) {
            router.prefetch(`/gustavo/trips/${slug}/${tool.path}`)
        }
    }, [slug, router])

    const tripQuery = useTripBySlug(slug, { enabled: Boolean(slug) })
    const trip = tripQuery.data ?? null

    const expensesQuery = useQuery({
        queryKey: trip ? queryKeys.trips.expenses(trip.id) : ['trip-expenses', 'pending'],
        queryFn: () => fetchExpenses(trip!.id),
        enabled: Boolean(trip),
    })
    const expenses = expensesQuery.data ?? []

    const settlementsQuery = useQuery({
        queryKey: trip ? queryKeys.trips.settlements(trip.id) : ['trip-settlements', 'pending'],
        queryFn: () => fetchSettlements(trip!.id),
        enabled: Boolean(trip),
    })
    const settlements = settlementsQuery.data ?? []

    const loading =
        tripQuery.isLoading ||
        (Boolean(trip) && expensesQuery.isLoading) ||
        (Boolean(trip) && !expensesQuery.data && !expensesQuery.isError) ||
        (Boolean(trip) && !settlementsQuery.data && !settlementsQuery.isError)
    const error = tripQuery.isError || expensesQuery.isError || settlementsQuery.isError

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
        // Parent key: refreshes expenses, settlements, locations together
        await queryClient.invalidateQueries({
            queryKey: queryKeys.trips.detail(trip.id),
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
        return <ReceiptsListSkeleton />
    }

    return (
        <TripDataProvider expenses={expenses} settlements={settlements} trip={trip}>
            <SpendDataProvider>
                <RefreshProvider onRefresh={refreshData}>
                    {children}
                </RefreshProvider>
            </SpendDataProvider>
        </TripDataProvider>
    )
}
