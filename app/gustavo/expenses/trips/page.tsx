'use client'

import { cardSx, colors } from '@/lib/colors'
import {
    Box,
    CircularProgress,
    IconButton,
    Menu,
    MenuItem,
} from '@mui/material'
import { IconDots } from '@tabler/icons-react'
import { useRegisterFab } from 'providers/fab-provider'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import DeleteTripDialog from 'components/delete-trip-dialog'
import TripFormDialog from 'components/trip-form-dialog'
import { deleteTrip, fetchTrips } from 'utils/api'
import { canEditTrip, canDeleteTrip } from 'utils/permissions'
import { InitialsIcon } from 'utils/icons'

import type { TripSummary } from '@/lib/types'

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
                href={`/gustavo/expenses/trips/${trip.slug}`}
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
                {/* Top: trip name */}
                <Box
                    sx={{
                        fontSize: 18,
                    }}>
                    {trip.name}
                </Box>
                {/* Bottom: participant initials — stacked overlap */}
                <Box sx={{ display: 'flex' }}>
                    {trip.participants.map((p, i) => (
                        <InitialsIcon
                            key={p.id}
                            name={p.firstName}
                            initials={p.initials}
                            sx={{
                                width: 28,
                                height: 28,
                                fontSize: 10,
                                marginLeft: i === 0 ? 0 : -0.5,
                                zIndex: trip.participants.length - i,
                                outline: '2px solid white',
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
                        onClose={() => setAnchorEl(null)}>
                        {showEdit && (
                            <MenuItem
                                onClick={() => {
                                    setAnchorEl(null)
                                    onEdit(trip)
                                }}>
                                Edit
                            </MenuItem>
                        )}
                        {showDelete && (
                            <MenuItem
                                onClick={() => {
                                    setAnchorEl(null)
                                    onDelete(trip)
                                }}
                                sx={{ color: colors.primaryRed }}>
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
    const activeTrips = trips.filter((t) => t.endDate >= now)
    const pastTrips = trips.filter((t) => t.endDate < now)

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
