'use client'

import { colors } from '@/lib/colors'
import { Box, CircularProgress } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import BoardingPass from 'components/boarding-pass'
import { PullToRefresh } from 'components/pull-to-refresh'
import { fetchTrips } from 'utils/api'

import { queryKeys } from '@/lib/query-keys'
import type { TripSummary } from '@/lib/types'

// Trip edit/delete live inside the trip (details page) — passes just navigate.
function TripSection({ title, trips }: { title: string; trips: TripSummary[] }) {
    if (trips.length === 0) return null
    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 2,
                    width: '100%',
                    fontSize: 24,
                    fontFamily: 'var(--font-serif)',
                }}>
                {title}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    width: '100%',
                    marginBottom: 2,
                }}>
                {trips.map((t) => (
                    <BoardingPass key={t.id} trip={t} />
                ))}
            </Box>
        </>
    )
}

export default function TripsPage() {
    const queryClient = useQueryClient()
    const router = useRouter()

    const { data: trips = [], isLoading: loading } = useQuery({
        queryKey: queryKeys.trips.list(),
        queryFn: fetchTrips,
    })

    const invalidateTrips = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all })
    }, [queryClient])

    const now = new Date().toISOString().slice(0, 10)
    const myTrips = trips.filter((t) => t.userRole !== null)
    const otherTrips = trips.filter((t) => t.userRole === null)
    const travellingTrips = myTrips.filter((t) => t.startDate <= now && t.endDate >= now)
    const upcomingTrips = myTrips.filter((t) => t.startDate > now)
    const pastTrips = myTrips.filter((t) => t.endDate < now)

    useRegisterFab(
        useCallback(() => {
            router.push('/gustavo/trips/new')
        }, [router])
    )

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: 4,
                }}>
                <CircularProgress sx={{ color: colors.primaryYellow }} />
            </Box>
        )
    }

    const noTrips =
        travellingTrips.length === 0 &&
        upcomingTrips.length === 0 &&
        pastTrips.length === 0 &&
        otherTrips.length === 0

    return (
        <PullToRefresh onRefresh={invalidateTrips} sx={{ minHeight: '100%' }}>
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingX: 4,
                paddingY: 2,
                width: '100%',
            }}>
            {noTrips && (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                        marginTop: 6,
                        textAlign: 'center',
                    }}>
                    <Box
                        sx={{
                            fontSize: 24,
                            fontFamily: 'var(--font-serif)',
                        }}>
                        No trips yet
                    </Box>
                    <Box
                        sx={{
                            fontSize: 14,
                            color: 'text.secondary',
                        }}>
                        Tap the + button to create your first trip.
                    </Box>
                </Box>
            )}
            <TripSection title="Now Travelling" trips={travellingTrips} />
            <TripSection title="Upcoming Trips" trips={upcomingTrips} />
            <TripSection title="Past Trips" trips={pastTrips} />
            <TripSection title="Other Trips" trips={otherTrips} />
        </Box>
        </PullToRefresh>
    )
}
