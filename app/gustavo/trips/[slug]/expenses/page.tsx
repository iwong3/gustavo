'use client'

import { Box } from '@mui/material'
import { IconCheck, IconRestore } from '@tabler/icons-react'
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { colors } from '@/lib/colors'
import { TripToolbar } from 'components/menu/trip-toolbar'
import { RefinePanel } from 'components/menu/refine-panel'
import {
    resetRefine,
    useRefineCount,
    useRefineStore,
} from 'components/menu/refine-store'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'
import { PullToRefresh } from 'components/pull-to-refresh'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { useRegisterFab } from 'providers/fab-provider'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canAddExpense } from 'utils/permissions'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'

export default function ExpensesPage() {
    const { trip } = useTripData()
    const { expenses, getUsdValue } = useSpendData()
    const router = useRouter()
    const queryClient = useQueryClient()
    const handlePullRefresh = () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.trips.expenses(trip.id),
        })
    const showAddExpense = canAddExpense(trip.userRole)

    const refineOpen = useRefineStore((s) => s.open)
    const closeRefine = useRefineStore((s) => s.close)
    const refineCount = useRefineCount()

    const fabCallback = useCallback(
        () => router.push(`/gustavo/trips/${trip.slug}/expenses/new`),
        [router, trip.slug]
    )
    // No FAB while refining — the panel is a full surface, not the list.
    useRegisterFab(showAddExpense && !refineOpen ? fabCallback : null)

    // Warm the add-expense route so the FAB opens the form instantly
    useEffect(() => {
        if (!showAddExpense) return
        router.prefetch(`/gustavo/trips/${trip.slug}/expenses/new`)
    }, [router, trip.slug, showAddExpense])

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
            {refineOpen ? (
                // The panel takes the rows' place rather than covering them: no
                // scrim, no portal, and no position:fixed to get clipped by
                // #main-scroll on iOS.
                //
                // Reserve the action bar's slot so the last section clears it,
                // and so the panel measures the room it actually has when it
                // decides how many sections to open.
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                        paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
                    }}>
                    <RefinePanel
                        expenses={expenses}
                        participants={trip.participants}
                        getUsdValue={getUsdValue}
                    />
                </Box>
            ) : (
                /* Pull-to-refresh covers everything below the toolbar */
                <PullToRefresh onRefresh={handlePullRefresh} sx={{ flex: 1 }}>
                    <Box sx={{ maxWidth: 450, width: '100%' }}>
                        <ReceiptsList />
                    </Box>
                </PullToRefresh>
            )}

            {/* While refining, the panel's actions take over the tab bar's slot —
                the same trade expense detail and the forms make. Reset dims
                rather than disappears: a two-slot bar that reflows would move
                Done out from under your thumb. */}
            {refineOpen && (
                <PageActionBar>
                    <PageActionButton
                        onClick={resetRefine}
                        icon={<IconRestore size={22} />}
                        label="Reset"
                        disabled={refineCount === 0}
                    />
                    <PageActionButton
                        onClick={closeRefine}
                        icon={<IconCheck size={22} />}
                        label="Done"
                        color={colors.primaryBlack}
                    />
                </PageActionBar>
            )}
        </Box>
    )
}
