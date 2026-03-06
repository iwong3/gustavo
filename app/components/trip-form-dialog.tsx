'use client'

import { useEffect, useState } from 'react'
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material'

import { createTrip, updateTrip, fetchUsers } from 'utils/api'
import type { TripSummary, UserSummary } from '@/lib/types'

const todayISO = () => new Date().toISOString().slice(0, 10)

type Props = {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    mode: 'create' | 'edit'
    trip?: TripSummary
}

export default function TripFormDialog({ open, onClose, onSuccess, mode, trip }: Props) {
    const [allUsers, setAllUsers] = useState<UserSummary[]>([])
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState(todayISO())
    const [endDate, setEndDate] = useState(todayISO())
    const [description, setDescription] = useState('')
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open) {
            fetchUsers()
                .then(setAllUsers)
                .catch(() => {})
        }
    }, [open])

    useEffect(() => {
        if (open && mode === 'edit' && trip) {
            setName(trip.name)
            setStartDate(trip.startDate)
            setEndDate(trip.endDate)
            setDescription(trip.description ?? '')
            setSelectedUserIds(trip.participants.map((p) => p.id))
            setError('')
        } else if (open && mode === 'create') {
            resetForm()
        }
    }, [open, mode, trip])

    const toggleUser = (userId: number) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        )
    }

    const resetForm = () => {
        setName('')
        setStartDate(todayISO())
        setEndDate(todayISO())
        setDescription('')
        setSelectedUserIds([])
        setError('')
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = async () => {
        if (!name.trim() || !startDate || !endDate) {
            setError('Please fill in all required fields.')
            return
        }
        if (endDate < startDate) {
            setError('End date must be on or after start date.')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            if (mode === 'edit' && trip) {
                // Update basic trip info
                await updateTrip(trip.id, {
                    name: name.trim(),
                    startDate,
                    endDate,
                    description: description.trim() || undefined,
                })

                // Manage participants: compute additions and removals
                const existingIds = new Set(trip.participants.map((p) => p.id))
                const nextIds = new Set(selectedUserIds)

                const toAdd = selectedUserIds.filter((id) => !existingIds.has(id))
                const toRemove = trip.participants
                    .map((p) => p.id)
                    .filter((id) => !nextIds.has(id))

                await Promise.all([
                    ...toAdd.map((userId) =>
                        fetch(`/api/trips/${trip.id}/participants`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId }),
                        })
                    ),
                    ...toRemove.map((userId) =>
                        fetch(`/api/trips/${trip.id}/participants`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId }),
                        })
                    ),
                ])
            } else {
                await createTrip({
                    name: name.trim(),
                    startDate,
                    endDate,
                    description: description.trim() || undefined,
                    participantIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
                })
            }

            resetForm()
            onClose()
            onSuccess()
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : mode === 'edit'
                      ? 'Failed to update trip'
                      : 'Failed to create trip'
            )
        } finally {
            setSubmitting(false)
        }
    }

    const isEdit = mode === 'edit'
    const inputSx = { backgroundColor: '#FFFFEF' }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? 'Edit Trip' : 'New Trip'}</DialogTitle>
            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    paddingTop: '8px !important',
                }}>
                <TextField
                    label="Trip name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    sx={inputSx}
                />

                <TextField
                    label="Start date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={inputSx}
                />

                <TextField
                    label="End date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={inputSx}
                />

                <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    sx={inputSx}
                />

                <Box>
                    <Typography variant="body2" sx={{ marginBottom: 0.5 }}>
                        Participants
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {allUsers.map((u) => (
                            <Chip
                                key={u.id}
                                label={u.firstName}
                                onClick={() => toggleUser(u.id)}
                                color={selectedUserIds.includes(u.id) ? 'primary' : 'default'}
                                variant={selectedUserIds.includes(u.id) ? 'filled' : 'outlined'}
                                size="small"
                            />
                        ))}
                    </Box>
                </Box>

                {error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
                    {submitting
                        ? isEdit
                            ? 'Saving...'
                            : 'Creating...'
                        : isEdit
                          ? 'Save'
                          : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
