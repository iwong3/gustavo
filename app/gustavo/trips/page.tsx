'use client'

import { cardSx, colors } from '@/lib/colors'
import { dropdownMenuItemSx, dropdownPaperSx } from '@/lib/form-styles'
import {
    Box,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem,
} from '@mui/material'
import { IconDots } from '@tabler/icons-react'
import Link from 'next/link'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect, useState } from 'react'

import DeleteTripDialog from 'components/delete-trip-dialog'
import TripFormDialog from 'components/trip-form-dialog'
import { deleteTrip, fetchTrips } from 'utils/api'
import { InitialsIcon } from 'utils/icons'
import { canDeleteTrip, canEditTrip } from 'utils/permissions'

import type { TripSummary } from '@/lib/types'

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

type TripCardProps = {
    trip: TripSummary
    onEdit: (trip: TripSummary) => void
    onDelete: (trip: TripSummary) => void
}

const TripCard = ({ trip, onEdit, onDelete }: TripCardProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const menuOpen = Boolean(anchorEl)

    const showEdit = canEditTrip(trip.userRole, trip.isAdmin)
    const showDelete = canDeleteTrip(trip.userRole, trip.isAdmin)
    const showMenu = showEdit || showDelete

    return (
        <Box
            sx={{
                'position': 'relative',
                'display': 'flex',
                'flexDirection': 'column',
                'width': '100%',
                ...cardSx,
                'color': colors.primaryBlack,
                'textDecoration': 'none',
                '&:active': {
                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                    transform: 'translate(1px, 1px)',
                },
                'transition':
                    'box-shadow 0.1s ease-out, transform 0.1s ease-out',
            }}>
            {/* Tap area covering full card */}
            <Box
                component={Link}
                href={`/gustavo/trips/${trip.slug}`}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    padding: 2,
                    paddingTop: 1,
                    paddingRight: showMenu ? 5 : 2,
                    color: colors.primaryBlack,
                    textDecoration: 'none',
                }}>
                {/* Top: trip name + dates */}
                <Box>
                    <Box sx={{ fontSize: 18 }}>{trip.name}</Box>
                    <Box sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {formatDateRange(trip.startDate, trip.endDate, trip.name)}
                    </Box>
                </Box>
                {/* Bottom: participant initials — stacked overlap */}
                <Box sx={{ display: 'flex' }}>
                    {trip.participants.map((p, i) => (
                        <InitialsIcon
                            key={p.id}
                            name={p.firstName}
                            initials={p.initials}
                            iconColor={p.iconColor}
                            sx={{
                                width: 28,
                                height: 28,
                                fontSize: 10,
                                marginLeft: i === 0 ? 0 : -0.5,
                                zIndex: trip.participants.length - i,
                                border: `1px solid ${colors.primaryBlack}`,
                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {/* Three-dots menu — only for users with edit or delete permission */}
            {showMenu && (
                <>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setAnchorEl(e.currentTarget)
                        }}
                        sx={{
                            'position': 'absolute',
                            'top': 8,
                            'right': 8,
                            'color': colors.primaryBlack,
                            'padding': '2px',
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.08)' },
                        }}>
                        <IconDots size={16} />
                    </IconButton>

                    <Menu
                        anchorEl={anchorEl}
                        open={menuOpen}
                        onClose={() => setAnchorEl(null)}
                        slotProps={{
                            paper: { sx: dropdownPaperSx },
                        }}>
                        {showEdit && (
                            <MenuItem
                                onClick={() => {
                                    setAnchorEl(null)
                                    onEdit(trip)
                                }}
                                sx={dropdownMenuItemSx}>
                                Edit
                            </MenuItem>
                        )}
                        {showDelete && (
                            <MenuItem
                                onClick={() => {
                                    setAnchorEl(null)
                                    onDelete(trip)
                                }}
                                sx={{
                                    ...dropdownMenuItemSx,
                                    'color': colors.primaryRed,
                                    '&:hover': {
                                        backgroundColor: `${colors.primaryRed}18`,
                                    },
                                }}>
                                Delete
                            </MenuItem>
                        )}
                    </Menu>
                </>
            )}
        </Box>
    )
}

export default function TripsPage() {
    const [trips, setTrips] = useState<TripSummary[]>([])
    const [loading, setLoading] = useState(true)

    // Dialog state
    const [formOpen, setFormOpen] = useState(false)
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
    const [editTrip, setEditTrip] = useState<TripSummary | undefined>()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<TripSummary | null>(null)

    const loadTrips = useCallback(() => {
        fetchTrips()
            .then(setTrips)
            .catch((err) => console.error('Failed to fetch trips:', err))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        loadTrips()
    }, [loadTrips])

    const handleEdit = (trip: TripSummary) => {
        setEditTrip(trip)
        setFormMode('edit')
        setFormOpen(true)
    }

    const handleDeleteClick = (trip: TripSummary) => {
        setDeleteTarget(trip)
        setDeleteOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        try {
            await deleteTrip(deleteTarget.id)
            setDeleteOpen(false)
            setDeleteTarget(null)
            loadTrips()
        } catch (err) {
            console.error('Failed to delete trip:', err)
        }
    }

    const now = new Date().toISOString().slice(0, 10)
    const myTrips = trips.filter((t) => t.userRole !== null)
    const otherTrips = trips.filter((t) => t.userRole === null)
    const activeTrips = myTrips.filter((t) => t.endDate >= now)
    const pastTrips = myTrips.filter((t) => t.endDate < now)

    useRegisterFab(
        useCallback(() => {
            setEditTrip(undefined)
            setFormMode('create')
            setFormOpen(true)
        }, [])
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
        activeTrips.length === 0 &&
        pastTrips.length === 0 &&
        otherTrips.length === 0

    return (
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
            {activeTrips.length > 0 && (
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
                        Upcoming Trips
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            width: '100%',
                            marginBottom: 2,
                        }}>
                        {activeTrips.map((t) => (
                            <TripCard
                                key={t.id}
                                trip={t}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </Box>
                </>
            )}
            {pastTrips.length > 0 && (
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
                        Past Trips
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            width: '100%',
                            marginBottom: 2,
                        }}>
                        {pastTrips.map((t) => (
                            <TripCard
                                key={t.id}
                                trip={t}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </Box>
                </>
            )}

            {otherTrips.length > 0 && (
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
                        Other Trips
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            width: '100%',
                            marginBottom: 2,
                        }}>
                        {otherTrips.map((t) => (
                            <TripCard
                                key={t.id}
                                trip={t}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                            />
                        ))}
                    </Box>
                </>
            )}

            <TripFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={loadTrips}
                mode={formMode}
                trip={editTrip}
            />

            <DeleteTripDialog
                open={deleteOpen}
                trip={deleteTarget}
                onClose={() => {
                    setDeleteOpen(false)
                    setDeleteTarget(null)
                }}
                onConfirm={handleDeleteConfirm}
            />
        </Box>
    )
}
