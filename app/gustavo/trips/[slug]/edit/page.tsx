'use client'

import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import TripForm from 'components/trip-form'
import { useTripData } from 'providers/trip-data-provider'
import { canEditTrip } from 'utils/permissions'

import { queryKeys } from '@/lib/query-keys'

export default function EditTripPage() {
    const router = useRouter()
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
                onCancel={() => router.replace(detailsUrl)}
                onSuccess={() => {
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.trips.all,
                    })
                    router.replace(detailsUrl)
                }}
            />
        </Box>
    )
}
