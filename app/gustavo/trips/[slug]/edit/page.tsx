'use client'

import { Box, Button, Typography } from '@mui/material'
import { IconTrash } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { useDebtsView } from 'components/debt/debts-view-store'
import DeleteTripDialog from 'components/delete-trip-dialog'
import TripForm, { type RemovalImpact } from 'components/trip-form'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { deleteTrip } from 'utils/api'
import { getBackHref } from 'utils/back-href'
import { deleteErrorMessage } from 'utils/delete-error'
import { canDeleteTrip, canEditTrip } from 'utils/permissions'

import { colors, toneColors } from '@/lib/colors'
import { lockedPlan, planNetCents, planSettlements } from '@/lib/debt-proof'
import { secondaryButtonSx } from '@/lib/form-styles'
import { queryKeys } from '@/lib/query-keys'
import { useExitTo } from 'hooks/use-exit-to'

export default function EditTripPage() {
    const exitTo = useExitTo()
    const queryClient = useQueryClient()
    const { trip } = useTripData()
    const { expenses, debtMap, participants, settlementRecords, getUsdValue } = useSpendData()
    const debtsView = useDebtsView(trip.id)

    // Back to the trip page this was opened from (?from, set by the header's
    // trip name), else the expenses list
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const backUrl =
        getBackHref(pathname, searchParams) ??
        `/gustavo/trips/${trip.slug}/expenses`

    // Delete lives here, at the bottom of the form — there's no trip details
    // page any more, and deleting a trip is rare enough to sit a level deep
    const showDelete = canDeleteTrip(trip.userRole, trip.isAdmin)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const deleteMutation = useMutation({
        mutationFn: () => deleteTrip(trip.id, trip.updatedAt),
        onSuccess: () => {
            setDeleteOpen(false)
            // Inactive only: refetching this (now deleted) trip's own active
            // queries would 404 and flash the not-found state before we leave
            queryClient.invalidateQueries({
                queryKey: queryKeys.trips.all,
                refetchType: 'inactive',
            })
            // Pop back to the list so the deleted trip sits ahead in history,
            // not behind it where swipe-back would land on it
            exitTo('/gustavo/trips')
        },
    })

    // Removing someone drops them from the debts: the form warns with their
    // expenses and their balance under the trip's plan (as the Debts page shows)
    const plan = lockedPlan(settlementRecords) ?? debtsView.plan
    const payments = useMemo(
        () => planSettlements(plan, debtMap, participants),
        [plan, debtMap, participants]
    )
    const describeRemoval = useCallback(
        (userId: number): RemovalImpact => {
            const id = String(userId)
            const theirs = expenses
                .filter(
                    (e) =>
                        String(e.paidBy.id) === id ||
                        e.splitBetween.some((p) => String(p.id) === id)
                )
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((e) => ({
                    id: e.id,
                    name: e.name,
                    date: e.date,
                    usd: getUsdValue(e),
                    paid: String(e.paidBy.id) === id,
                }))
            return { expenses: theirs, netCents: planNetCents(payments, userId) }
        },
        [expenses, getUsdValue, payments]
    )

    if (!canEditTrip(trip.userRole, trip.isAdmin)) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: 450,
                    padding: 4,
                }}>
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    You don&apos;t have permission to edit this trip.
                </Typography>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <TripForm
                mode="edit"
                trip={trip}
                describeRemoval={describeRemoval}
                onCancel={() => exitTo(backUrl)}
                onSuccess={async () => {
                    // Refresh before leaving (the form keeps showing
                    // "Saving…") so we land on up-to-date data, not a stale
                    // list that changes a moment later. The list is off
                    // screen, so it needs an explicit refetch.
                    await Promise.all([
                        queryClient.invalidateQueries({
                            queryKey: queryKeys.trips.all,
                        }),
                        queryClient.refetchQueries({
                            queryKey: queryKeys.trips.list(),
                        }),
                    ])
                    exitTo(backUrl)
                }}
                footer={
                    showDelete && (
                        // Its own section under a divider: a rare, separate
                        // action, not one of the edits Save applies
                        <Box
                            sx={{
                                borderTop: `1px solid ${colors.primaryBlack}20`,
                                marginTop: 1,
                                paddingTop: 3,
                                // + the form's 16px bottom padding = 24px,
                                // matching the 24px between divider and button
                                paddingBottom: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                            }}>
                            {/* Full width like the fields above; soft red
                                fill (opaque — the page is yellow underneath)
                                in the house border + hard shadow */}
                            <Button
                                fullWidth
                                onClick={() => setDeleteOpen(true)}
                                startIcon={<IconTrash size={18} stroke={2} />}
                                sx={{
                                    ...secondaryButtonSx,
                                    'height': 40,
                                    'fontSize': 14,
                                    'fontWeight': 700,
                                    'color': colors.primaryRed,
                                    'backgroundColor': toneColors.negativeBg,
                                    '&:hover': {
                                        backgroundColor: toneColors.negativeBg,
                                    },
                                }}>
                                Delete trip
                            </Button>
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: colors.primaryBrown,
                                    textAlign: 'center',
                                }}>
                                Removes the trip and all its expenses for
                                everyone on it.
                            </Typography>
                        </Box>
                    )
                }
            />
            <DeleteTripDialog
                open={deleteOpen}
                trip={trip}
                onClose={() => {
                    setDeleteOpen(false)
                    deleteMutation.reset()
                }}
                onConfirm={() => deleteMutation.mutate()}
                busy={deleteMutation.isPending}
                error={
                    deleteMutation.error
                        ? deleteErrorMessage(deleteMutation.error, 'trip')
                        : null
                }
            />
        </Box>
    )
}
