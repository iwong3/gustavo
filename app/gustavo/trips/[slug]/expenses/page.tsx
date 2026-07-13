'use client'

import { Box } from '@mui/material'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { TripToolbar } from 'components/menu/trip-toolbar'
import { PullToRefresh } from 'components/pull-to-refresh'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { useRegisterFab } from 'providers/fab-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canAddExpense } from 'utils/permissions'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'

export default function ExpensesPage() {
    const { trip } = useTripData()
    const router = useRouter()
    const queryClient = useQueryClient()
    const handlePullRefresh = () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.trips.expenses(trip.id),
        })
    const showAddExpense = canAddExpense(trip.userRole)

    const fabCallback = useCallback(
        () => router.push(`/gustavo/trips/${trip.slug}/expenses/new`),
        [router, trip.slug]
    )
    useRegisterFab(showAddExpense ? fabCallback : null)

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                // Fill the scroll container so pull-to-refresh works in the
                // empty space below the rows too
                minHeight: '100%',
            }}>
            <TripToolbar />
            {/* Pull-to-refresh covers everything below the toolbar */}
            <PullToRefresh onRefresh={handlePullRefresh} sx={{ flex: 1 }}>
                <Box sx={{ maxWidth: 450, width: '100%' }}>
                    <ReceiptsList />
                </Box>
            </PullToRefresh>
        </Box>
    )
}
