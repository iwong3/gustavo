'use client'

import { resetAllFilterStores } from 'components/menu/filter/filter-stores'
import { useRefineStore } from 'components/menu/refine-store'
import { useSearchBarStore } from 'components/menu/search/search-bar'
import { useSortStore } from 'components/menu/sort/sort-store'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { RefreshProvider } from 'providers/refresh-provider'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { TripDataProvider } from 'providers/trip-data-provider'
import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchExpenses, fetchSettlements, NotFoundError } from 'utils/api'

import { TripPageSkeleton } from 'components/skeleton/trip-skeletons'
import { useTripBySlug } from 'hooks/use-trip-by-slug'
import { useExitTo } from 'hooks/use-exit-to'
import { GoneState } from 'components/gone-state'
import { queryKeys } from '@/lib/query-keys'
import { tripTools } from '@/lib/trip-tools'

export default function TripLayout({ children }: { children: React.ReactNode }) {
    const { slug } = useParams<{ slug: string }>()
    const pathname = usePathname()
    const queryClient = useQueryClient()
    const exitTo = useExitTo()
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
        tripQuery.isPending ||
        (Boolean(trip) && expensesQuery.isPending) ||
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
        resetAllFilterStores({ participantNames, categoryNames, locationNames })
        resetSearchBarStore()
        useSortStore.getState().reset()
        // A fresh trip shouldn't open onto the refine panel.
        useRefineStore.getState().close()
    }, [trip, expensesQuery.data, expensesQuery.dataUpdatedAt, resetSearchBarStore])

    const refreshData = useCallback(async () => {
        if (!trip) return
        // Parent key: refreshes expenses, settlements, locations together
        await queryClient.invalidateQueries({
            queryKey: queryKeys.trips.detail(trip.id),
        })
    }, [trip, queryClient])

    if (error) {
        // Deleted (or never existed / no access) — a calm dead end with a way
        // out. Anything else is a load failure worth retrying.
        if (tripQuery.error instanceof NotFoundError) {
            return (
                <GoneState
                    title="This trip isn't here anymore"
                    detail="It may have been deleted, or you no longer have access."
                    action={{
                        label: 'Back to trips',
                        onClick: () => exitTo('/gustavo/trips'),
                    }}
                />
            )
        }
        return (
            <GoneState
                title="Couldn't load this trip"
                detail="Check your connection and try again."
                action={{
                    label: 'Try again',
                    onClick: () => {
                        if (tripQuery.isError) tripQuery.refetch()
                        if (expensesQuery.isError) expensesQuery.refetch()
                        if (settlementsQuery.isError) settlementsQuery.refetch()
                    },
                }}
                secondaryAction={{
                    label: 'Back to trips',
                    onClick: () => exitTo('/gustavo/trips'),
                }}
            />
        )
    }

    if (loading || !trip) {
        // The skeleton for whichever tool is opening, not always the list
        return <TripPageSkeleton pathname={pathname} />
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
