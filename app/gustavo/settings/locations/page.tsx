'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    List,
    ListItem,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { IconCheck, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { fetchTrips } from 'utils/api'
import type { TripSummary } from '@/lib/types'

type LocationItem = {
    id: number
    name: string
}

export default function LocationsPage() {
    const [trips, setTrips] = useState<TripSummary[]>([])
    const [selectedTripId, setSelectedTripId] = useState<number | ''>('')
    const [locations, setLocations] = useState<LocationItem[]>([])
    const [loading, setLoading] = useState(false)
    const [tripsLoading, setTripsLoading] = useState(true)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<LocationItem | null>(null)
    const editRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchTrips()
            .then(setTrips)
            .catch((err: unknown) => console.error('Failed to fetch trips:', err))
            .finally(() => setTripsLoading(false))
    }, [])

    const fetchLocations = useCallback(async (tripId: number) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/trips/${tripId}/locations`)
            if (!res.ok) throw new Error('Failed to fetch')
            const data: LocationItem[] = await res.json()
            setLocations(data)
        } catch (err) {
            console.error('Failed to fetch locations:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (selectedTripId !== '') {
            fetchLocations(selectedTripId)
        } else {
            setLocations([])
        }
    }, [selectedTripId, fetchLocations])

    useEffect(() => {
        if (editingId !== null && editRef.current) {
            editRef.current.focus()
            editRef.current.select()
        }
    }, [editingId])

    const handleAdd = async () => {
        if (selectedTripId === '') return
        const trimmed = newName.trim()
        if (!trimmed) return
        try {
            await fetch(`/api/trips/${selectedTripId}/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            })
            setNewName('')
            await fetchLocations(selectedTripId)
        } catch (err) {
            console.error('Failed to add location:', err)
        }
    }

    const handleRename = async (id: number) => {
        if (selectedTripId === '') return
        const trimmed = editName.trim()
        if (!trimmed) {
            setEditingId(null)
            return
        }
        const original = locations.find((l) => l.id === id)
        if (original && original.name === trimmed) {
            setEditingId(null)
            return
        }
        try {
            await fetch(`/api/trips/${selectedTripId}/locations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            })
            setEditingId(null)
            await fetchLocations(selectedTripId)
        } catch (err) {
            console.error('Failed to rename location:', err)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget || selectedTripId === '') return
        try {
            await fetch(`/api/trips/${selectedTripId}/locations/${deleteTarget.id}`, {
                method: 'DELETE',
            })
            setDeleteTarget(null)
            await fetchLocations(selectedTripId)
        } catch (err) {
            console.error('Failed to delete location:', err)
        }
    }

    const startEdit = (loc: LocationItem) => {
        setEditingId(loc.id)
        setEditName(loc.name)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
    }

    return (
        <Box sx={{ paddingX: 2, paddingTop: 3, paddingBottom: 10, maxWidth: 500, margin: '0 auto' }}>
            <Typography sx={{ fontSize: 20, fontWeight: 600, marginBottom: 2 }}>
                Manage Locations
            </Typography>

            {/* Trip selector */}
            {tripsLoading ? (
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    Loading trips...
                </Typography>
            ) : (
                <FormControl fullWidth size="small" sx={{ marginBottom: 2 }}>
                    <InputLabel>Select a trip</InputLabel>
                    <Select
                        value={selectedTripId}
                        label="Select a trip"
                        onChange={(e) => {
                            setSelectedTripId(e.target.value as number)
                            setEditingId(null)
                            setNewName('')
                        }}
                        sx={{ backgroundColor: '#FFFFEF' }}>
                        {trips.map((trip) => (
                            <MenuItem key={trip.id} value={trip.id}>
                                {trip.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}

            {selectedTripId !== '' && (
                <>
                    {/* Add location */}
                    <Box sx={{ display: 'flex', gap: 1, marginBottom: 2 }}>
                        <TextField
                            size="small"
                            placeholder="New location name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAdd()
                            }}
                            slotProps={{ htmlInput: { maxLength: 200 } }}
                            sx={{
                                flex: 1,
                                '& .MuiInputBase-root': { backgroundColor: '#FFFFEF' },
                            }}
                        />
                        <IconButton
                            onClick={handleAdd}
                            disabled={!newName.trim()}
                            sx={{ color: '#FBBC04' }}>
                            <IconPlus size={20} />
                        </IconButton>
                    </Box>

                    {loading ? (
                        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                            Loading...
                        </Typography>
                    ) : locations.length === 0 ? (
                        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                            No locations yet for this trip.
                        </Typography>
                    ) : (
                        <List disablePadding>
                            {locations.map((loc) => (
                                <ListItem
                                    key={loc.id}
                                    disablePadding
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        paddingY: 0.75,
                                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                                    }}>
                                    {editingId === loc.id ? (
                                        <>
                                            <TextField
                                                size="small"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                inputRef={editRef}
                                                slotProps={{ htmlInput: { maxLength: 200 } }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRename(loc.id)
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                onBlur={() => handleRename(loc.id)}
                                                sx={{
                                                    flex: 1,
                                                    '& .MuiInputBase-root': {
                                                        backgroundColor: '#FFFFEF',
                                                    },
                                                }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRename(loc.id)}
                                                sx={{ color: 'green' }}>
                                                <IconCheck size={18} />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={cancelEdit}
                                                sx={{ color: 'text.secondary' }}>
                                                <IconX size={18} />
                                            </IconButton>
                                        </>
                                    ) : (
                                        <>
                                            <Typography
                                                onClick={() => startEdit(loc)}
                                                sx={{
                                                    flex: 1,
                                                    fontSize: 15,
                                                    cursor: 'pointer',
                                                    '&:hover': { color: '#FBBC04' },
                                                }}>
                                                {loc.name}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => setDeleteTarget(loc)}
                                                sx={{ color: '#C1121F' }}>
                                                <IconTrash size={18} />
                                            </IconButton>
                                        </>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    )}
                </>
            )}

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>Delete location</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Delete &quot;{deleteTarget?.name}&quot;?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
