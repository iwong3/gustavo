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
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'

import { createTrip, updateTrip, fetchUsers, fetchUserPreferences, updateParticipantRole } from 'utils/api'
import { canManageRoles } from 'utils/permissions'
import { colors } from '@/lib/colors'
import type { TripSummary, TripRole, UserSummary } from '@/lib/types'

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
    const [visibility, setVisibility] = useState<'participants' | 'all_users'>('participants')
    const [participantRoles, setParticipantRoles] = useState<Map<number, TripRole>>(new Map())
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
            setVisibility(trip.visibility)
            setParticipantRoles(new Map(trip.participants.map((p) => [p.id, p.role])))
            setError('')
        } else if (open && mode === 'create') {
            resetForm()
            // Load user's default visibility preference
            fetchUserPreferences()
                .then((prefs) => setVisibility(prefs.defaultTripVisibility))
                .catch(() => {})
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
        setVisibility('participants')
        setParticipantRoles(new Map())
        setError('')
    }

    const handleClose = () => {
        onClose()
        setTimeout(resetForm, 300)
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
                // Update basic trip info + visibility
                await updateTrip(trip.id, {
                    name: name.trim(),
                    startDate,
                    endDate,
                    description: description.trim() || undefined,
                    visibility,
                })

                // Manage participants: compute additions and removals
                const existingIds = new Set(trip.participants.map((p) => p.id))
                const nextIds = new Set(selectedUserIds)

                const toAdd = selectedUserIds.filter((id) => !existingIds.has(id))
                const toRemove = trip.participants
                    .map((p) => p.id)
                    .filter((id) => !nextIds.has(id))

                // Role changes (only for existing participants that weren't added/removed)
                const roleChanges: Promise<void>[] = []
                if (showRoleManagement) {
                    for (const p of trip.participants) {
                        const newRole = participantRoles.get(p.id)
                        if (newRole && newRole !== p.role && p.role !== 'owner' && nextIds.has(p.id)) {
                            roleChanges.push(updateParticipantRole(trip.id, p.id, newRole))
                        }
                    }
                }

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
                    ...roleChanges,
                ])
            } else {
                await createTrip({
                    name: name.trim(),
                    startDate,
                    endDate,
                    description: description.trim() || undefined,
                    participantIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
                    visibility,
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
    const showRoleManagement = isEdit && trip && canManageRoles(trip.userRole, trip.isAdmin)

    const fieldSx = {
        'backgroundColor': colors.primaryWhite,
        'borderRadius': '4px',
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primaryBlack,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primaryBlack,
        },
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        backgroundColor: colors.secondaryYellow,
                        border: `1px solid ${colors.primaryBlack}`,
                        boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                        borderRadius: '6px',
                    },
                },
            }}>
            <DialogTitle sx={{ fontWeight: 700, color: colors.primaryBlack }}>
                {isEdit ? 'Edit Trip' : 'New Trip'}
            </DialogTitle>
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
                    sx={fieldSx}
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
                    sx={fieldSx}
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
                    sx={fieldSx}
                />

                <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                    size="small"
                    sx={fieldSx}
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
                                size="small"
                                sx={{
                                    'border': `1px solid ${colors.primaryBlack}`,
                                    'backgroundColor': selectedUserIds.includes(u.id)
                                        ? colors.primaryYellow
                                        : colors.primaryWhite,
                                    'fontWeight': selectedUserIds.includes(u.id) ? 600 : 400,
                                    '&:hover': {
                                        backgroundColor: selectedUserIds.includes(u.id)
                                            ? colors.primaryYellow
                                            : colors.primaryWhite,
                                    },
                                }}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Role management — only for owner/admin in edit mode */}
                {showRoleManagement && (
                    <Box>
                        <Typography variant="body2" sx={{ marginBottom: 0.5 }}>
                            Participant Roles
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {trip.participants
                                .filter((p) => selectedUserIds.includes(p.id))
                                .map((p) => {
                                    const currentRole = participantRoles.get(p.id) ?? p.role
                                    const isOwner = p.role === 'owner'
                                    return (
                                        <Box
                                            key={p.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingY: 0.25,
                                            }}>
                                            <Typography variant="body2" sx={{ fontSize: 14 }}>
                                                {p.firstName}
                                            </Typography>
                                            {isOwner ? (
                                                <Chip
                                                    label="Owner"
                                                    size="small"
                                                    sx={{
                                                        fontSize: 12,
                                                        height: 24,
                                                        backgroundColor: colors.primaryYellow,
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            ) : (
                                                <Select
                                                    value={currentRole}
                                                    onChange={(e) => {
                                                        const newRole = e.target.value as TripRole
                                                        setParticipantRoles((prev) => {
                                                            const next = new Map(prev)
                                                            next.set(p.id, newRole)
                                                            return next
                                                        })
                                                    }}
                                                    size="small"
                                                    sx={{
                                                        fontSize: 12,
                                                        height: 28,
                                                        backgroundColor: colors.primaryWhite,
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: colors.primaryBlack,
                                                        },
                                                    }}>
                                                    <MenuItem value="editor" sx={{ fontSize: 13 }}>Editor</MenuItem>
                                                    <MenuItem value="viewer" sx={{ fontSize: 13 }}>Viewer</MenuItem>
                                                </Select>
                                            )}
                                        </Box>
                                    )
                                })}
                        </Box>
                    </Box>
                )}

                <Box>
                    <Typography variant="body2" sx={{ marginBottom: 0.5 }}>
                        Trip Visibility
                    </Typography>
                    <ToggleButtonGroup
                        value={visibility}
                        exclusive
                        onChange={(_, val) => {
                            if (val) setVisibility(val)
                        }}
                        size="small"
                        fullWidth
                        sx={{
                            '& .MuiToggleButton-root': {
                                'textTransform': 'none',
                                'fontSize': 13,
                                'border': `1px solid ${colors.primaryBlack}`,
                                'color': colors.primaryBlack,
                                '&.Mui-selected': {
                                    backgroundColor: colors.primaryYellow,
                                    fontWeight: 600,
                                    '&:hover': { backgroundColor: colors.primaryYellow },
                                },
                            },
                        }}>
                        <ToggleButton value="participants">Participants only</ToggleButton>
                        <ToggleButton value="all_users">All users</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {error && (
                    <Typography color="error" variant="body2">
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ padding: 2, paddingTop: 0 }}>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{
                        backgroundColor: colors.primaryYellow,
                        fontWeight: 600,
                    }}>
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
