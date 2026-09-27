'use client'

import { Box, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { useDebtsView } from 'components/debt/debts-view-store'
import TripForm, { type RemovalImpact } from 'components/trip-form'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canEditTrip } from 'utils/permissions'

import { lockedPlan, planNetCents, planSettlements } from '@/lib/debt-proof'
import { queryKeys } from '@/lib/query-keys'
import { useExitTo } from 'hooks/use-exit-to'

export default function EditTripPage() {
    const exitTo = useExitTo()
    const queryClient = useQueryClient()
    const { trip } = useTripData()
    const { expenses, debtMap, participants, settlementRecords, getUsdValue } = useSpendData()
    const debtsView = useDebtsView(trip.id)

    const detailsUrl = `/gustavo/trips/${trip.slug}/details`

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
                onCancel={() => exitTo(detailsUrl)}
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
                    exitTo(detailsUrl)
                }}
            />
        </Box>
    )
}
