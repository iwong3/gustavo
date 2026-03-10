'use client'

import { cardSx, colors } from '@/lib/colors'
import { Box, IconButton, Typography } from '@mui/material'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { useState } from 'react'
import { deleteTrip } from 'utils/api'
import { getTablerIcon, InitialsIcon } from 'utils/icons'
import { canDeleteTrip, canEditTrip } from 'utils/permissions'

import DeleteTripDialog from 'components/delete-trip-dialog'
import TripFormDialog from 'components/trip-form-dialog'

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

const tools = [
    {
        name: 'Expenses',
        path: 'expenses',
        icon: 'IconReceipt',
        bg: '#dae6a3',
    },
    {
        name: 'Debts',
        path: 'debts',
        icon: 'IconPigMoney',
        bg: '#f0b8b4',
    },
    {
        name: 'Insights',
        path: 'graphs',
        icon: 'IconChartBar',
        bg: 'linear-gradient(135deg, #f0b490 0%, #cdbfdb 100%)',
    },
    {
        name: 'Links',
        path: 'links',
        icon: 'IconExternalLink',
        bg: '#b4cedf',
    },
    {
        name: 'Activity',
        path: 'activity',
        icon: 'IconLayoutList',
        bg: '#cdbfdb',
    },
]

export default function TripHubPage() {
    const { trip } = useTripData()
    const { totalSpend, debtMap } = useSpendData()
    const router = useRouter()

    // Dialog state
    const [formOpen, setFormOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const showEdit = canEditTrip(trip.userRole, trip.isAdmin)
    const showDelete = canDeleteTrip(trip.userRole, trip.isAdmin)

    const handleEditSuccess = () => {
        // Reload the page to pick up updated trip data from the layout
        router.refresh()
        window.location.reload()
    }

    const handleDeleteConfirm = async () => {
        try {
            await deleteTrip(trip.id)
            setDeleteOpen(false)
            router.push('/gustavo/trips')
        } catch (err) {
            console.error('Failed to delete trip:', err)
        }
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

            {/* Tool list — full-width stacked rows */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    width: '100%',
                }}>
                {tools.map((tool) => (
                    <Box
                        key={tool.name}
                        component={Link}
                        href={`/gustavo/trips/${trip.slug}/${tool.path}`}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 2,
                            'padding': 2,
                            ...cardSx,
                            'textDecoration': 'none',
                            'color': colors.primaryBlack,
                            '&:active': {
                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                transform: 'translate(1px, 1px)',
                            },
                            'transition': 'box-shadow 0.1s, transform 0.1s',
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background: tool.bg,
                                border: `1.5px solid ${colors.primaryBlack}`,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                flexShrink: 0,
                            }}>
                            {getTablerIcon({
                                name: tool.icon,
                                size: 22,
                                stroke: 1.8,
                                color: colors.primaryBlack,
                                fill: colors.primaryWhite,
                            })}
                        </Box>
                        <Typography
                            sx={{
                                fontSize: 16,
                                fontWeight: 600,
                            }}>
                            {tool.name}
                        </Typography>
                    </Box>
                ))}
            </Box>

            {/* Bottom action buttons */}
            {(showEdit || showDelete) && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1.5,
                        width: '100%',
                        marginTop: 3,
                        marginBottom: 1,
                    }}>
                    {showEdit && (
                        <IconButton
                            onClick={() => setFormOpen(true)}
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

            {/* Edit trip form */}
            <TripFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={handleEditSuccess}
                mode="edit"
                trip={trip}
            />

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
