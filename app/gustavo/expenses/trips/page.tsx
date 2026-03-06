'use client'

import { Box, CircularProgress, Fab, IconButton, Menu, MenuItem } from '@mui/material'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { IconPlus, IconDots } from '@tabler/icons-react'

import { fetchTrips, deleteTrip } from 'utils/api'
import TripFormDialog from 'components/trip-form-dialog'
import DeleteTripDialog from 'components/delete-trip-dialog'

import type { TripSummary } from '@/lib/types'

// Static background images for known trips (by slug)
import Japan2024Image from '../../../images/japan-2024.jpg'
import Japan2025Image from '../../../images/japan-2025.jpg'
import SouthKorea2025Image from '../../../images/south-korea-2025.jpg'
import Vancouver2024Image from '../../../images/vancouver-2024.jpg'

const tripBackgrounds: Record<string, typeof Japan2024Image> = {
    'japan-2024': Japan2024Image,
    'vancouver-2024': Vancouver2024Image,
    'south-korea-2025': SouthKorea2025Image,
    'japan-2025': Japan2025Image,
}

type TripCardProps = {
    trip: TripSummary
    onEdit: (trip: TripSummary) => void
    onDelete: (trip: TripSummary) => void
}

const TripCard = ({ trip, onEdit, onDelete }: TripCardProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const menuOpen = Boolean(anchorEl)

    return (
        <Box
            sx={{
                'position': 'relative',
                'display': 'flex',
                'alignItems': 'flex-end',
                'padding': 2,
                'width': '39%',
                'height': '10svh',
                'border': '1px solid #FBBC04',
                'borderRadius': '10px',
                'backgroundColor': 'rgba(0, 0, 0, 0.4)',
                'backgroundImage': tripBackgrounds[trip.slug]
                    ? `url(${tripBackgrounds[trip.slug].src})`
                    : undefined,
                'backgroundSize': 'cover',
                'backgroundBlendMode': 'darken',
                'boxShadow': 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                'color': 'white',
                'fontSize': 18,
                'fontWeight': 'bold',
                'textDecoration': 'none',
                '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                },
                'transition': 'background-color 0.2s ease-out',
            }}>
            <Box
                component={Link}
                href={`/gustavo/expenses/trips/${trip.slug}`}
                sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 2,
                    color: 'white',
                    textDecoration: 'none',
                }}>
                {trip.name}
            </Box>

            <IconButton
                size="small"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setAnchorEl(e.currentTarget)
                }}
                sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    padding: '2px',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' },
                }}>
                <IconDots size={16} />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={() => setAnchorEl(null)}>
                <MenuItem
                    onClick={() => {
                        setAnchorEl(null)
                        onEdit(trip)
                    }}>
                    Edit
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setAnchorEl(null)
                        onDelete(trip)
                    }}
                    sx={{ color: '#C1121F' }}>
                    Delete
                </MenuItem>
            </Menu>
        </Box>
    )
}

type TripRowProps = {
    trips: TripSummary[]
    onEdit: (trip: TripSummary) => void
    onDelete: (trip: TripSummary) => void
}

const TripRow = ({ trips, onEdit, onDelete }: TripRowProps) => {
    const rows: TripSummary[][] = []
    let row: TripSummary[] = []

    for (let i = 0; i < trips.length; i++) {
        row.push(trips[i])
        if (row.length === 2 || i === trips.length - 1) {
            rows.push(row)
            row = []
        }
    }

    return (
        <>
            {rows.map((r, idx) => (
                <Box
                    key={'trip-row-' + idx}
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 1,
                        width: '100%',
                    }}>
                    {r.map((t) => (
                        <TripCard key={t.id} trip={t} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </Box>
            ))}
        </>
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

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                <CircularProgress sx={{ color: '#FBBC04' }} />
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                marginX: 2,
                marginTop: 2,
                width: '100%',
                height: '100%',
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
                            fontFamily: 'Spectral',
                        }}>
                        Upcoming Trips
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            marginBottom: 2,
                        }}>
                        <TripRow trips={activeTrips} onEdit={handleEdit} onDelete={handleDeleteClick} />
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
                            fontFamily: 'Spectral',
                        }}>
                        Past Trips
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            marginBottom: 2,
                        }}>
                        <TripRow trips={pastTrips} onEdit={handleEdit} onDelete={handleDeleteClick} />
                    </Box>
                </>
            )}

            {/* New Trip FAB */}
            <Fab
                onClick={() => {
                    setEditTrip(undefined)
                    setFormMode('create')
                    setFormOpen(true)
                }}
                size="medium"
                sx={{
                    'position': 'fixed',
                    'bottom': 140,
                    'right': 16,
                    'backgroundColor': '#FBBC04',
                    '&:hover': { backgroundColor: '#E5A800' },
                    'zIndex': 9,
                }}>
                <IconPlus size={24} />
            </Fab>

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
