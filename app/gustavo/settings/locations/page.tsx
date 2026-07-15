'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { useScrollFocusedInput } from 'hooks/useScrollFocusedInput'
import { fetchTrips } from 'utils/api'
import { queryKeys } from '@/lib/query-keys'
import type { TripSummary } from '@/lib/types'

type LocationItem = {
    id: number
    name: string
}

export default function LocationsPage() {
    const queryClient = useQueryClient()
    const focusScroll = useScrollFocusedInput()
    const [selectedTripId, setSelectedTripId] = useState<number | ''>('')
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editName, setEditName] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<LocationItem | null>(null)
    const editRef = useRef<HTMLInputElement>(null)

    const { data: trips = [], isLoading: tripsLoading } = useQuery({
        queryKey: queryKeys.trips.list(),
        queryFn: fetchTrips,
    })

    const { data: locations = [], isLoading: loading } = useQuery({
        queryKey:
            selectedTripId === ''
                ? ['locations', 'none']
                : queryKeys.trips.locations(selectedTripId),
        queryFn: async () => {
            const res = await fetch(`/api/trips/${selectedTripId}/locations`)
            if (!res.ok) throw new Error('Failed to fetch')
            return (await res.json()) as LocationItem[]
        },
        enabled: selectedTripId !== '',
    })

    const invalidateLocations = () => {
        if (selectedTripId === '') return
        queryClient.invalidateQueries({
            queryKey: queryKeys.trips.locations(selectedTripId),
        })
    }

    useEffect(() => {
        if (editingId !== null && editRef.current) {
            editRef.current.focus()
            editRef.current.select()
        }
    }, [editingId])

    const addMutation = useMutation({
        mutationFn: (name: string) =>
            fetch(`/api/trips/${selectedTripId}/locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            }),
        onSuccess: () => {
            setNewName('')
            invalidateLocations()
        },
        onError: (err) => console.error('Failed to add location:', err),
    })

    const renameMutation = useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) =>
            fetch(`/api/trips/${selectedTripId}/locations/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            }),
        onSuccess: () => {
            setEditingId(null)
            invalidateLocations()
        },
        onError: (err) => console.error('Failed to rename location:', err),
    })

    const deleteLocationMutation = useMutation({
        mutationFn: (id: number) =>
            fetch(`/api/trips/${selectedTripId}/locations/${id}`, {
                method: 'DELETE',
            }),
        onSuccess: () => {
            setDeleteTarget(null)
            invalidateLocations()
        },
        onError: (err) => console.error('Failed to delete location:', err),
    })

    const handleAdd = () => {
        if (selectedTripId === '') return
        const trimmed = newName.trim()
        if (!trimmed) return
        addMutation.mutate(trimmed)
    }

    const handleRename = (id: number) => {
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
        renameMutation.mutate({ id, name: trimmed })
    }

    const handleDelete = () => {
        if (!deleteTarget || selectedTripId === '') return
        deleteLocationMutation.mutate(deleteTarget.id)
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
        <Box
            {...focusScroll}
            sx={{ paddingX: 2, paddingTop: 3, paddingBottom: 10, maxWidth: 500, margin: '0 auto' }}>
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
                    <Box sx={{ marginBottom: 2 }}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="New location name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAdd()
                            }}
                            slotProps={{
                                htmlInput: { maxLength: 200 },
                                input: {
                                    endAdornment: (
                                        <Box
                                            onClick={handleAdd}
                                            sx={{
                                                'display': 'flex',
                                                'cursor': newName.trim() ? 'pointer' : 'default',
                                                'opacity': newName.trim() ? 1 : 0.3,
                                                '&:active': newName.trim() ? { transform: 'scale(0.9)' } : {},
                                            }}>
                                            <IconPlus size={18} stroke={2.5} />
                                        </Box>
                                    ),
                                },
                            }}
                            sx={{
                                '& .MuiInputBase-root': { backgroundColor: '#FFFFEF' },
                            }}
                        />
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
