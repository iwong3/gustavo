'use client'

import { Box, Typography } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'

import TripForm from 'components/trip-form'
import { useTripData } from 'providers/trip-data-provider'
import { canEditTrip } from 'utils/permissions'

import { queryKeys } from '@/lib/query-keys'
import { useExitTo } from 'hooks/use-exit-to'

export default function EditTripPage() {
    const exitTo = useExitTo()
    const queryClient = useQueryClient()
    const { trip } = useTripData()

    const detailsUrl = `/gustavo/trips/${trip.slug}/details`

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
