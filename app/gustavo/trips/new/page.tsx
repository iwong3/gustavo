'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import TripForm from 'components/trip-form'

import { queryKeys } from '@/lib/query-keys'

export default function NewTripPage() {
    const router = useRouter()
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
                onCancel={() => router.replace(listUrl)}
                onSuccess={() => {
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.trips.all,
                    })
                    router.replace(listUrl)
                }}
            />
        </Box>
    )
}
