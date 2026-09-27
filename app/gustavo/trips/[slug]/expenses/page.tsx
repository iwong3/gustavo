'use client'

import { Box } from '@mui/material'
import { IconCheck, IconRestore } from '@tabler/icons-react'
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { colors } from '@/lib/colors'
import { TripToolbar } from 'components/menu/trip-toolbar'
import { REFINE_EXIT_MS, RefinePanel } from 'components/menu/refine-panel'
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
    const handlePullRefresh = useCallback(
        () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.trips.expenses(trip.id),
            }),
        [queryClient, trip.id]
    )
    const showAddExpense = canAddExpense(trip.userRole)

    const refineOpen = useRefineStore((s) => s.open)
    const closeRefine = useRefineStore((s) => s.close)
    const refineCount = useRefineCount()

    // The panel is pre-mounted, hidden, just after the page first paints — in
    // a transition, so it never blocks a scroll or tap — and then stays
    // mounted. Mounting it on the ⚙ tap cost a long frame (every option row
    // counting its expenses), so the tap now only flips visibility. Set during
    // render if refine opens before the pre-mount lands: same commit as hiding
    // the rows, never a blank frame between.
    const [panelMounted, setPanelMounted] = useState(refineOpen)
    if (refineOpen && !panelMounted) setPanelMounted(true)
    useEffect(() => {
        const t = setTimeout(() => startTransition(() => setPanelMounted(true)), 0)
        return () => clearTimeout(t)
    }, [])

    // Keep the panel showing through its exit animation: on close, refineOpen
    // flips false at once but the panel lingers for one quick fade-out over
    // the returning rows. `closing` (shown but not open) drives that animation.
    const [panelShown, setPanelShown] = useState(refineOpen)
    if (refineOpen && !panelShown) setPanelShown(true)
    useEffect(() => {
        if (refineOpen || !panelShown) return
        const t = setTimeout(() => setPanelShown(false), REFINE_EXIT_MS)
        return () => clearTimeout(t)
    }, [refineOpen, panelShown])

    const fabCallback = useCallback(
        () => router.push(`/gustavo/trips/${trip.slug}/expenses/new`),
        [router, trip.slug]
    )
    // No FAB while refining. Gated on refineOpen, not panelShown: the FAB
    // (like the tab bar) should be back the instant Done is tapped, not after
    // the panel's exit fade.
    useRegisterFab(showAddExpense && !refineOpen ? fabCallback : null)

    // Warm the add-expense route so the FAB opens the form instantly
    useEffect(() => {
        if (!showAddExpense) return
        router.prefetch(`/gustavo/trips/${trip.slug}/expenses/new`)
    }, [router, trip.slug, showAddExpense])

    // The list stays mounted while refining — hidden, not unmounted. Remounting
    // 150 rows on Done blocked the tap for a long frame (and a second one when
    // the progressive mount filled in the rest), so the ⚙ toggle felt laggy.
    // Memoized so toggling refine doesn't re-render it either; it follows the
    // filters itself, through context.
    const list = useMemo(
        () => (
            /* Pull-to-refresh covers everything below the toolbar */
            <PullToRefresh onRefresh={handlePullRefresh} sx={{ flex: 1 }}>
                <Box sx={{ maxWidth: 450, width: '100%' }}>
                    <ReceiptsList />
                </Box>
            </PullToRefresh>
        ),
        [handlePullRefresh]
    )

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
                <Box
                    sx={{
                        display: refineOpen ? 'none' : 'flex',
                        flexDirection: 'column',
                        flex: 1,
                    }}>
                    {list}
                </Box>
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
                            display: panelShown ? 'flex' : 'none',
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
                panelShown) so the tab bar is back the instant Done is tapped
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
