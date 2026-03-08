'use client'

import { useEffect, useState } from 'react'
import {
    Box,
    Button,
    Chip,
    FormControl,
    MenuItem,
    Select,
    Skeleton,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'

import { createTrip, updateTrip, fetchUsers, fetchUserPreferences, updateParticipantRole } from 'utils/api'
import { useCurrentUser } from 'hooks/useCurrentUser'
import { canManageRoles } from 'utils/permissions'
import { Currency, formatCurrencyLabel } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { colors } from '@/lib/colors'
import FormDrawer from 'components/form-drawer'
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
    const currentUser = useCurrentUser()
    const [allUsers, setAllUsers] = useState<UserSummary[]>([])
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState(todayISO())
    const [endDate, setEndDate] = useState(todayISO())
    const [description, setDescription] = useState('')
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
    const [currency, setCurrency] = useState<Currency>(Currency.USD)
    const [visibility, setVisibility] = useState<'participants' | 'all_users'>('participants')
    const [participantRoles, setParticipantRoles] = useState<Map<number, TripRole>>(new Map())
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open) {
            fetchUsers()
                .then((users) => {
                    setAllUsers(users)
                    // Pre-select current user in create mode
                    if (mode === 'create' && currentUser) {
                        setSelectedUserIds((prev) => prev.includes(currentUser.id) ? prev : [currentUser.id])
                    }
                })
                .catch(() => {})
        }
    }, [open, mode, currentUser])

    useEffect(() => {
        if (open && mode === 'edit' && trip) {
            setName(trip.name)
            setStartDate(trip.startDate)
            setEndDate(trip.endDate)
            setDescription(trip.description ?? '')
            setCurrency((trip.currency ?? 'USD') as Currency)
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
        setCurrency(Currency.USD)
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
                    currency,
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
                    currency,
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

    const tripLabelSx = { fontWeight: 600, fontSize: 13, color: colors.primaryBlack, marginBottom: 0.5 }

    const fieldShadow = `2px 2px 0px ${colors.primaryBlack}`
    const fieldSx = {
        'backgroundColor': colors.primaryWhite,
        'borderRadius': '4px',
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primaryBlack,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.primaryBlack,
        },
        '& .MuiOutlinedInput-root': {
            boxShadow: fieldShadow,
        },
        '&.MuiOutlinedInput-root': {
            boxShadow: fieldShadow,
        },
        '& input[type="date"]': {
            textAlign: 'left',
        },
        '& input[type="date"]::-webkit-date-and-time-value': {
            textAlign: 'left',
        },
    }

    return (
        <FormDrawer open={open} onClose={handleClose}>
            <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: colors.primaryBlack, padding: '16px 24px 0' }}
            >
                {isEdit ? 'Edit Trip' : 'New Trip'}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '16px 24px',
                    flex: 1,
                    overflowY: 'auto',
                }}>
                <Box>
                    <Typography sx={tripLabelSx}>Trip name *</Typography>
                    <TextField
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Japan 2025"
                        required
                        fullWidth
                        size="small"
                        sx={fieldSx}
                    />
                </Box>

                <Box>
                    <Typography sx={tripLabelSx}>Start date *</Typography>
                    <TextField
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={fieldSx}
                    />
                </Box>

                <Box>
                    <Typography sx={tripLabelSx}>End date *</Typography>
                    <TextField
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={fieldSx}
                    />
                </Box>

                <Box>
                    <Typography sx={tripLabelSx}>Description</Typography>
                    <TextField
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional"
                        multiline
                        rows={2}
                        fullWidth
                        size="small"
                        sx={fieldSx}
                    />
                </Box>

                <Box>
                    <Typography sx={tripLabelSx}>Local Currency</Typography>
                    <FormControl size="small" fullWidth>
                        <Select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as Currency)}
                            displayEmpty
                            sx={fieldSx}>
                            {Object.values(Currency).map((c) => (
                                <MenuItem key={c} value={c}>
                                    {formatCurrencyLabel(c)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box>
                    <Typography sx={tripLabelSx}>Participants</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {allUsers.length === 0
                            ? Array.from({ length: 5 }, (_, i) => (
                                <Skeleton
                                    key={i}
                                    variant="circular"
                                    width={32}
                                    height={32}
                                />
                            ))
                            : allUsers.map((u) => {
                                const selected = selectedUserIds.includes(u.id)
                                return (
                                    <Box
                                        key={u.id}
                                        onClick={() => toggleUser(u.id)}
                                        sx={{
                                            cursor: 'pointer',
                                            opacity: selected ? 1 : 0.4,
                                            transition: 'opacity 0.15s',
                                        }}>
                                        <InitialsIcon
                                            name={u.firstName}
                                            initials={u.initials}
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                fontSize: 12,
                                            }}
                                        />
                                    </Box>
                                )
                            })}
                    </Box>
                </Box>

                {/* Role management — only for owner/admin in edit mode */}
                {showRoleManagement && (
                    <Box>
                        <Typography sx={tripLabelSx}>
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
                                                        border: `1px solid ${colors.primaryBlack}`,
                                                        boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
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
                                                        boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: colors.primaryBlack,
                                                        },
                                                    }}>
                                                    <MenuItem value="admin" sx={{ fontSize: 13 }}>Admin</MenuItem>
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
                    <Typography sx={tripLabelSx}>
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
                            boxShadow: fieldShadow,
                            '& .MuiToggleButton-root': {
                                'textTransform': 'none',
                                'fontSize': 13,
                                'border': `1px solid ${colors.primaryBlack}`,
                                'color': colors.primaryBlack,
                                'backgroundColor': colors.primaryWhite,
                                '&:hover': { backgroundColor: colors.primaryWhite },
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
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, padding: '16px 24px', paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))` }}>
                <Button onClick={handleClose} disabled={submitting} size="large">
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    size="large"
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
            </Box>
        </FormDrawer>
    )
}
