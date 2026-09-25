'use client'

import { colors } from '@/lib/colors'
import { formatUsd } from 'utils/currency'
import { Box, Typography } from '@mui/material'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTrip } from 'utils/api'
import { deleteErrorMessage } from 'utils/delete-error'
import { useExitTo } from 'hooks/use-exit-to'
import { InitialsIcon } from 'utils/icons'
import { canDeleteTrip, canEditTrip } from 'utils/permissions'

import DeleteTripDialog from 'components/delete-trip-dialog'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'

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
    const exitTo = useExitTo()
    const queryClient = useQueryClient()

    // Dialog state
    const [deleteOpen, setDeleteOpen] = useState(false)

    const showEdit = canEditTrip(trip.userRole, trip.isAdmin)

    // Warm the edit form so tapping Edit opens it instantly
    useEffect(() => {
        if (showEdit) router.prefetch(`/gustavo/trips/${trip.slug}/edit`)
    }, [router, trip.slug, showEdit])
    const showDelete = canDeleteTrip(trip.userRole, trip.isAdmin)

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

    const handleDeleteConfirm = async () => {
        deleteMutation.mutate()
    }

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
            {/* Action bar — same as the expense detail: Delete | Edit,
                permission-gated, in the bottom bar instead of the page body */}
            {(showEdit || showDelete) && (
                <PageActionBar>
                    {showDelete && (
                        <PageActionButton
                            onClick={() => setDeleteOpen(true)}
                            icon={<IconTrash size={22} />}
                            label="Delete"
                            color={colors.primaryRed}
                        />
                    )}
                    {showEdit && (
                        <PageActionButton
                            onClick={() => router.push(`/gustavo/trips/${trip.slug}/edit`)}
                            icon={<IconEdit size={22} />}
                            label="Edit"
                        />
                    )}
                </PageActionBar>
            )}

            {/* Delete trip confirmation */}
            <DeleteTripDialog
                open={deleteOpen}
                trip={trip}
                onClose={() => {
                    setDeleteOpen(false)
                    deleteMutation.reset()
                }}
                onConfirm={handleDeleteConfirm}
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
