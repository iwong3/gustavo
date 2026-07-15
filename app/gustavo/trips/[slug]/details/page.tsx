'use client'

import { colors } from '@/lib/colors'
import { Box, IconButton, Typography } from '@mui/material'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTrip } from 'utils/api'
import { InitialsIcon } from 'utils/icons'
import { canDeleteTrip, canEditTrip } from 'utils/permissions'

import DeleteTripDialog from 'components/delete-trip-dialog'

import { queryKeys } from '@/lib/query-keys'

const formatDateRange = (start: string, end: string, tripName?: string) => {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const mo = (d: Date) => d.toLocaleString('en-US', { month: 'short' })
    const showYear = (d: Date) => !tripName || !tripName.includes(String(d.getFullYear()))
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
        const suffix = showYear(s) ? `, ${s.getFullYear()}` : ''
        return `${mo(s)} ${s.getDate()} – ${e.getDate()}${suffix}`
    }
    const fmt = (d: Date) => `${mo(d)} ${d.getDate()}`
    if (s.getFullYear() === e.getFullYear()) {
        const suffix = showYear(s) ? `, ${s.getFullYear()}` : ''
        return `${fmt(s)} – ${fmt(e)}${suffix}`
    }
    const yrS = showYear(s) ? `, ${s.getFullYear()}` : ''
    const yrE = showYear(e) ? `, ${e.getFullYear()}` : ''
    return `${fmt(s)}${yrS} – ${fmt(e)}${yrE}`
}

export default function TripDetailsPage() {
    const { trip } = useTripData()
    const { totalSpend, debtMap } = useSpendData()
    const router = useRouter()
    const queryClient = useQueryClient()

    // Dialog state
    const [deleteOpen, setDeleteOpen] = useState(false)

    const showEdit = canEditTrip(trip.userRole, trip.isAdmin)
    const showDelete = canDeleteTrip(trip.userRole, trip.isAdmin)

    const deleteMutation = useMutation({
        mutationFn: () => deleteTrip(trip.id, trip.updatedAt),
        onSuccess: () => {
            setDeleteOpen(false)
            queryClient.invalidateQueries({ queryKey: queryKeys.trips.all })
            router.push('/gustavo/trips')
        },
        onError: (err) => {
            console.error('Failed to delete trip:', err)
        },
    })

    const handleDeleteConfirm = async () => {
        deleteMutation.mutate()
    }

    const formatUsd = (n: number) =>
        n.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        })

    // Count total outstanding debts
    let totalDebts = 0
    debtMap.forEach((owes) => {
        owes.forEach((amount) => {
            if (amount > 0.01) totalDebts++
        })
    })

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                maxWidth: 450,
                paddingX: 4,
                paddingY: 2,
            }}>
            {/* Trip header */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: 3,
                }}>
                <Typography
                    sx={{
                        fontSize: 24,
                        fontFamily: 'var(--font-serif)',
                        textAlign: 'center',
                    }}>
                    {trip.name}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 13,
                        color: 'text.secondary',
                        marginBottom: 1.5,
                    }}>
                    {formatDateRange(trip.startDate, trip.endDate, trip.name)}
                </Typography>

                {/* Participant avatars */}
                <Box sx={{ display: 'flex', marginBottom: 2 }}>
                    {trip.participants.map((p, i) => (
                        <InitialsIcon
                            key={p.id}
                            name={p.firstName}
                            initials={p.initials}
                            iconColor={p.iconColor}
                            sx={{
                                width: 32,
                                height: 32,
                                fontSize: 11,
                                marginLeft: i === 0 ? 0 : -0.5,
                                zIndex: trip.participants.length - i,
                                border: `1px solid ${colors.primaryBlack}`,
                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                            }}
                        />
                    ))}
                </Box>

                {/* Quick stats */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 3,
                        fontSize: 13,
                        color: 'text.secondary',
                    }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <Box
                            sx={{
                                fontWeight: 700,
                                fontSize: 16,
                                color: colors.primaryBlack,
                            }}>
                            {formatUsd(totalSpend)}
                        </Box>
                        <Box>total spent</Box>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                        <Box
                            sx={{
                                fontWeight: 700,
                                fontSize: 16,
                                color: colors.primaryBlack,
                            }}>
                            {totalDebts}
                        </Box>
                        <Box>{totalDebts === 1 ? 'debt' : 'debts'}</Box>
                    </Box>
                </Box>
            </Box>

            {/* Edit / delete actions */}
            {(showEdit || showDelete) && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1.5,
                        width: '100%',
                        marginBottom: 1,
                    }}>
                    {showEdit && (
                        <IconButton
                            onClick={() =>
                                router.push(
                                    `/gustavo/trips/${trip.slug}/edit`
                                )
                            }
                            sx={{
                                'flex': 1,
                                'backgroundColor': colors.primaryWhite,
                                'border': `1px solid ${colors.primaryBlack}`,
                                'borderRadius': '4px',
                                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                'height': 44,
                                '&:hover': {
                                    backgroundColor: colors.primaryYellow,
                                },
                                '&:active': {
                                    boxShadow: 'none',
                                    transform: 'translate(2px, 2px)',
                                },
                                'transition':
                                    'transform 0.1s, box-shadow 0.1s, background-color 0.1s',
                            }}>
                            <IconPencil
                                size={20}
                                color={colors.primaryBlack}
                            />
                        </IconButton>
                    )}
                    {showDelete && (
                        <IconButton
                            onClick={() => setDeleteOpen(true)}
                            sx={{
                                'flex': 1,
                                'backgroundColor': colors.primaryWhite,
                                'border': `1px solid ${colors.primaryBlack}`,
                                'borderRadius': '4px',
                                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                'height': 44,
                                '&:hover': {
                                    backgroundColor: `${colors.primaryRed}18`,
                                },
                                '&:active': {
                                    boxShadow: 'none',
                                    transform: 'translate(2px, 2px)',
                                },
                                'transition':
                                    'transform 0.1s, box-shadow 0.1s, background-color 0.1s',
                            }}>
                            <IconTrash
                                size={20}
                                color={colors.primaryBlack}
                            />
                        </IconButton>
                    )}
                </Box>
            )}

            {/* Delete trip confirmation */}
            <DeleteTripDialog
                open={deleteOpen}
                trip={trip}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDeleteConfirm}
            />
        </Box>
    )
}
