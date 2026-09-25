'use client'

import { Box } from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'

import TripForm from 'components/trip-form'

import { queryKeys } from '@/lib/query-keys'
import { useExitTo } from 'hooks/use-exit-to'

export default function NewTripPage() {
    const exitTo = useExitTo()
    const queryClient = useQueryClient()

    const listUrl = '/gustavo/trips'

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <TripForm
                mode="create"
                onCancel={() => exitTo(listUrl)}
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
                    exitTo(listUrl)
                }}
            />
        </Box>
    )
}
