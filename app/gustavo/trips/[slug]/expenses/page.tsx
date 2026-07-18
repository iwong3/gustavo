'use client'

import { Box } from '@mui/material'
import { IconCheck, IconRestore } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
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

    // Keep the panel mounted through its exit animation: on close, refineOpen
    // flips false at once but the panel lingers for one quick fade-out before
    // the rows return. `closing` (mounted but not open) drives that animation.
    const [panelMounted, setPanelMounted] = useState(refineOpen)
    useEffect(() => {
        if (refineOpen) {
            setPanelMounted(true)
            return
        }
        if (!panelMounted) return
        const t = setTimeout(() => setPanelMounted(false), 150)
        return () => clearTimeout(t)
    }, [refineOpen, panelMounted])

    const fabCallback = useCallback(
        () => router.push(`/gustavo/trips/${trip.slug}/expenses/new`),
        [router, trip.slug]
    )
    // No FAB while refining. Gated on refineOpen, not panelMounted: the FAB
    // (like the tab bar) should be back the instant Done is tapped, not after
    // the panel's exit fade.
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
            {/* One relative surface below the toolbar. While the panel closes,
                the rows are already back in flow and the (opaque) panel fades
                out as an absolute overlay ON TOP of them — a crossfade, not a
                fade to blank and a pop. */}
            <Box
                sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0,
                }}>
                {!refineOpen && (
                    /* Pull-to-refresh covers everything below the toolbar */
                    <PullToRefresh onRefresh={handlePullRefresh} sx={{ flex: 1 }}>
                        <Box sx={{ maxWidth: 450, width: '100%' }}>
                            <ReceiptsList />
                        </Box>
                    </PullToRefresh>
                )}
                {panelMounted && (
                    // While open, the panel takes the rows' place rather than
                    // covering them: no scrim, no portal, and no position:fixed
                    // to get clipped by #main-scroll on iOS.
                    //
                    // Reserve the action bar's slot so the last section clears
                    // it, and so the panel measures the room it actually has
                    // when it decides how many sections to open.
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
                            ...(refineOpen
                                ? { flex: 1, minHeight: 0 }
                                : { position: 'absolute', inset: 0, zIndex: 2 }),
                        }}>
                        <RefinePanel
                            expenses={expenses}
                            participants={trip.participants}
                            getUsdValue={getUsdValue}
                            closing={!refineOpen}
                        />
                    </Box>
                )}
            </Box>

            {/* While refining, the panel's actions take over the tab bar's slot —
                the same trade expense detail and the forms make. Reset dims
                rather than disappears: a two-slot bar that reflows would move
                Done out from under your thumb. Gated on refineOpen (not
                panelMounted) so the tab bar is back the instant Done is tapped
                rather than after the exit fade. */}
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
