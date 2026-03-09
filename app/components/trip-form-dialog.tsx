'use client'

import {
    Box,
    Button,
    Chip,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    Skeleton,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { IconPencil, IconPlus, IconCheck, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { colors, hardShadow } from '@/lib/colors'
import { primaryButtonSx, secondaryButtonSx } from '@/lib/form-styles'
import {
    errorFieldSx,
    errorLabelSx,
    errorMessageSx,
    fieldShadow,
    fieldSx,
    labelSx,
} from '@/lib/form-styles'
import type { Location, TripRole, TripSummary, UserSummary } from '@/lib/types'
import FormDrawer from 'components/form-drawer'
import { useCurrentUser } from 'hooks/useCurrentUser'
import {
    createTrip,
    fetchLocations,
    fetchUserPreferences,
    fetchUsers,
    updateParticipantRole,
    updateTrip,
} from 'utils/api'
import { Currency, formatCurrencyLabel } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { canManageRoles } from 'utils/permissions'

const todayISO = () => new Date().toISOString().slice(0, 10)

// ── Location item for local state ───────────────────────────────────────────

type LocalLocation = {
    /** Negative IDs = new (unsaved), positive IDs = existing from DB */
    id: number
    name: string
    /** Original name for rename tracking (edit mode only) */
    originalName?: string
}

let nextLocalId = -1

// MUI small TextField rendered height (with size="small") is 40px
const INPUT_HEIGHT = 40

type Props = {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    mode: 'create' | 'edit'
    trip?: TripSummary
}

export default function TripFormDialog({
    open,
    onClose,
    onSuccess,
    mode,
    trip,
}: Props) {
    const currentUser = useCurrentUser()
    const [allUsers, setAllUsers] = useState<UserSummary[]>([])
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState(todayISO())
    const [endDate, setEndDate] = useState('')
    const [description, setDescription] = useState('')
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
    const [currency, setCurrency] = useState<Currency>(Currency.USD)
    const [visibility, setVisibility] = useState<'participants' | 'all_users'>(
        'participants'
    )
    const [participantRoles, setParticipantRoles] = useState<
        Map<number, TripRole>
    >(new Map())
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [attempted, setAttempted] = useState(false)

    // ── Location state ──────────────────────────────────────────────────────
    const [locations, setLocations] = useState<LocalLocation[]>([])
    const [deletedLocationIds, setDeletedLocationIds] = useState<number[]>([])
    const [newLocName, setNewLocName] = useState('')
    const [editingLocId, setEditingLocId] = useState<number | null>(null)
    const [editLocName, setEditLocName] = useState('')
    const editLocRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            fetchUsers()
                .then((users) => {
                    setAllUsers(users)
                    // Pre-select current user in create mode
                    if (mode === 'create' && currentUser) {
                        setSelectedUserIds((prev) =>
                            prev.includes(currentUser.id)
                                ? prev
                                : [currentUser.id]
                        )
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
            setParticipantRoles(
                new Map(trip.participants.map((p) => [p.id, p.role]))
            )
            setError('')
            setAttempted(false)

            // Load existing locations
            fetchLocations(trip.id)
                .then((locs) =>
                    setLocations(
                        locs.map((l) => ({
                            id: l.id,
                            name: l.name,
                            originalName: l.name,
                        }))
                    )
                )
                .catch(() => {})
            setDeletedLocationIds([])
        } else if (open && mode === 'create') {
            resetForm()
            // Load user's default visibility preference
            fetchUserPreferences()
                .then((prefs) => setVisibility(prefs.defaultTripVisibility))
                .catch(() => {})
        }
    }, [open, mode, trip])

    useEffect(() => {
        if (editingLocId !== null && editLocRef.current) {
            editLocRef.current.focus()
            editLocRef.current.select()
        }
    }, [editingLocId])

    const toggleUser = (userId: number) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        )
    }

    const resetForm = () => {
        setName('')
        setStartDate(todayISO())
        setEndDate('')
        setDescription('')
        setCurrency(Currency.USD)
        setSelectedUserIds([])
        setVisibility('participants')
        setParticipantRoles(new Map())
        setError('')
        setAttempted(false)
        setLocations([])
        setDeletedLocationIds([])
        setNewLocName('')
        setEditingLocId(null)
        setEditLocName('')
        nextLocalId = -1
    }

    const handleClose = () => {
        onClose()
        setTimeout(resetForm, 300)
    }

    // ── Location handlers ───────────────────────────────────────────────────

    const addLocation = () => {
        const trimmed = newLocName.trim()
        if (!trimmed) return
        // Prevent duplicates (case-insensitive)
        if (locations.some((l) => l.name.toLowerCase() === trimmed.toLowerCase())) {
            setNewLocName('')
            return
        }
        setLocations((prev) => [...prev, { id: nextLocalId--, name: trimmed }])
        setNewLocName('')
    }

    const removeLocation = (locId: number) => {
        setLocations((prev) => prev.filter((l) => l.id !== locId))
        // Track deletion of existing DB locations
        if (locId > 0) {
            setDeletedLocationIds((prev) => [...prev, locId])
        }
        if (editingLocId === locId) {
            setEditingLocId(null)
        }
    }

    const startEditLocation = (loc: LocalLocation) => {
        setEditingLocId(loc.id)
        setEditLocName(loc.name)
    }

    const confirmEditLocation = () => {
        if (editingLocId === null) return
        const trimmed = editLocName.trim()
        if (!trimmed) {
            setEditingLocId(null)
            return
        }
        // Check for duplicates (excluding current)
        const isDuplicate = locations.some(
            (l) =>
                l.id !== editingLocId &&
                l.name.toLowerCase() === trimmed.toLowerCase()
        )
        if (isDuplicate) {
            setEditingLocId(null)
            return
        }
        setLocations((prev) =>
            prev.map((l) =>
                l.id === editingLocId ? { ...l, name: trimmed } : l
            )
        )
        setEditingLocId(null)
    }

    const cancelEditLocation = () => {
        setEditingLocId(null)
        setEditLocName('')
    }

    // ── Save locations to API ───────────────────────────────────────────────

    const saveLocations = async (tripId: number) => {
        const promises: Promise<unknown>[] = []

        // Delete removed locations
        for (const id of deletedLocationIds) {
            promises.push(
                fetch(`/api/trips/${tripId}/locations/${id}`, {
                    method: 'DELETE',
                })
            )
        }

        // Add new locations (negative IDs)
        for (const loc of locations) {
            if (loc.id < 0) {
                promises.push(
                    fetch(`/api/trips/${tripId}/locations`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: loc.name }),
                    })
                )
            }
        }

        // Rename existing locations that changed
        for (const loc of locations) {
            if (
                loc.id > 0 &&
                loc.originalName &&
                loc.name !== loc.originalName
            ) {
                promises.push(
                    fetch(`/api/trips/${tripId}/locations/${loc.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: loc.name }),
                    })
                )
            }
        }

        await Promise.all(promises)
    }

    const handleSubmit = async () => {
        setAttempted(true)

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

                const toAdd = selectedUserIds.filter(
                    (id) => !existingIds.has(id)
                )
                const toRemove = trip.participants
                    .map((p) => p.id)
                    .filter((id) => !nextIds.has(id))

                // Role changes for existing participants
                const roleChanges: Promise<void>[] = []
                if (showRoleManagement) {
                    for (const p of trip.participants) {
                        const newRole = participantRoles.get(p.id)
                        if (
                            newRole &&
                            newRole !== p.role &&
                            p.role !== 'owner' &&
                            nextIds.has(p.id)
                        ) {
                            roleChanges.push(
                                updateParticipantRole(trip.id, p.id, newRole)
                            )
                        }
                    }
                }

                // Add/remove participants
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

                // Role changes for newly added participants (must happen after they're added)
                if (showRoleManagement && toAdd.length > 0) {
                    const newRoleChanges: Promise<void>[] = []
                    for (const userId of toAdd) {
                        const newRole = participantRoles.get(userId)
                        if (newRole && newRole !== 'viewer') {
                            newRoleChanges.push(
                                updateParticipantRole(trip.id, userId, newRole)
                            )
                        }
                    }
                    if (newRoleChanges.length > 0) {
                        await Promise.all(newRoleChanges)
                    }
                }

                // Save location changes
                await saveLocations(trip.id)
            } else {
                const created = await createTrip({
                    name: name.trim(),
                    startDate,
                    endDate,
                    description: description.trim() || undefined,
                    participantIds:
                        selectedUserIds.length > 0
                            ? selectedUserIds
                            : undefined,
                    visibility,
                    currency,
                })

                // Apply any non-default role assignments
                const roleUpdates: Promise<void>[] = []
                participantRoles.forEach((role, userId) => {
                    if (role !== 'viewer' && role !== 'owner') {
                        roleUpdates.push(
                            updateParticipantRole(created.id, userId, role)
                        )
                    }
                })
                if (roleUpdates.length > 0) {
                    await Promise.all(roleUpdates)
                }

                // Create locations for the new trip
                await saveLocations(created.id)
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
    const showRoleManagement =
        isEdit && trip && canManageRoles(trip.userRole, trip.isAdmin)

    // Validation state
    const nameError = attempted && !name.trim()
    const startDateError = attempted && !startDate
    const endDateError = attempted && !endDate

    // Compute sorted selected participants for the role list
    const ownerId =
        isEdit && trip
            ? trip.participants.find((p) => p.role === 'owner')?.id
            : currentUser?.id
    const selectedParticipants = allUsers
        .filter((u) => selectedUserIds.includes(u.id))
        .sort((a, b) => {
            if (a.id === ownerId) return -1
            if (b.id === ownerId) return 1
            return a.firstName.localeCompare(b.firstName)
        })

    return (
        <FormDrawer open={open} onClose={handleClose}>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 700,
                    color: colors.primaryBlack,
                    padding: '16px 24px 0',
                }}>
                {isEdit ? 'Edit trip' : 'Create trip'}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '16px 24px 0',
                    flex: 1,
                    overflowY: 'auto',
                }}>
                <Box>
                    <Typography sx={nameError ? errorLabelSx : labelSx}>
                        Trip name *
                    </Typography>
                    <TextField
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Japan 2025"
                        required
                        fullWidth
                        size="small"
                        sx={nameError ? errorFieldSx : fieldSx}
                    />
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography
                            sx={startDateError ? errorLabelSx : labelSx}>
                            Start date *
                        </Typography>
                        <TextField
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            fullWidth
                            size="small"
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={startDateError ? errorFieldSx : fieldSx}
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={endDateError ? errorLabelSx : labelSx}>
                            End date *
                        </Typography>
                        <TextField
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            fullWidth
                            size="small"
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={endDateError ? errorFieldSx : fieldSx}
                        />
                    </Box>
                </Box>

                <Box>
                    <Typography sx={labelSx}>Description</Typography>
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
                    <Typography sx={labelSx}>Local currency</Typography>
                    <FormControl size="small" sx={{ width: 120 }}>
                        <Select
                            value={currency}
                            onChange={(e) =>
                                setCurrency(e.target.value as Currency)
                            }
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

                {/* Participants — avatar grid + inline role list */}
                <Box>
                    <Typography sx={labelSx}>Participants</Typography>
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
                                  const selected = selectedUserIds.includes(
                                      u.id
                                  )
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
                                              iconColor={u.iconColor}
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

                    {/* Inline role list for selected participants */}
                    {selectedParticipants.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                mt: 1.5,
                            }}>
                            {selectedParticipants.map((u) => {
                                const isOwner = u.id === ownerId
                                const currentRole =
                                    participantRoles.get(u.id) ??
                                    (isOwner ? 'owner' : 'viewer')
                                const canEditRole =
                                    !isOwner && (showRoleManagement || !isEdit)
                                return (
                                    <Box
                                        key={u.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingY: 0.25,
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}>
                                            <InitialsIcon
                                                name={u.firstName}
                                                initials={u.initials}
                                                iconColor={u.iconColor}
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    fontSize: 10,
                                                }}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{ fontSize: 14 }}>
                                                {u.firstName}
                                            </Typography>
                                        </Box>
                                        {isOwner ? (
                                            <Chip
                                                label="Owner"
                                                size="small"
                                                sx={{
                                                    fontSize: 12,
                                                    height: 26,
                                                    backgroundColor:
                                                        colors.primaryYellow,
                                                    fontWeight: 600,
                                                    border: `1px solid ${colors.primaryBlack}`,
                                                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                                }}
                                            />
                                        ) : canEditRole ? (
                                            <Select
                                                value={currentRole}
                                                onChange={(e) => {
                                                    const newRole = e.target
                                                        .value as TripRole
                                                    setParticipantRoles(
                                                        (prev) => {
                                                            const next =
                                                                new Map(prev)
                                                            next.set(
                                                                u.id,
                                                                newRole
                                                            )
                                                            return next
                                                        }
                                                    )
                                                }}
                                                size="small"
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            'backgroundColor':
                                                                colors.primaryWhite,
                                                            'border': `1px solid ${colors.primaryBlack}`,
                                                            'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                                            'borderRadius':
                                                                '12px',
                                                            'marginTop': '4px',
                                                            '& .MuiMenuItem-root':
                                                                {
                                                                    'fontSize': 13,
                                                                    'minHeight': 32,
                                                                    '&:hover': {
                                                                        backgroundColor: `${colors.primaryYellow}40`,
                                                                    },
                                                                    '&.Mui-selected':
                                                                        {
                                                                            'backgroundColor':
                                                                                colors.primaryYellow,
                                                                            'fontWeight': 600,
                                                                            '&:hover':
                                                                                {
                                                                                    backgroundColor:
                                                                                        colors.primaryYellow,
                                                                                },
                                                                        },
                                                                },
                                                        },
                                                    },
                                                }}
                                                sx={{
                                                    'fontSize': 12,
                                                    'height': 26,
                                                    'width': 78,
                                                    'borderRadius': '16px',
                                                    'backgroundColor':
                                                        colors.primaryWhite,
                                                    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                    '&.Mui-focused': {
                                                        boxShadow: `1px 1px 0px ${colors.primaryYellow}`,
                                                    },
                                                    '& .MuiOutlinedInput-notchedOutline':
                                                        {
                                                            borderColor:
                                                                colors.primaryBlack,
                                                            borderRadius:
                                                                '16px',
                                                        },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline':
                                                        {
                                                            borderColor:
                                                                colors.primaryYellow,
                                                        },
                                                    '& .MuiSelect-select': {
                                                        paddingY: 0,
                                                        paddingLeft: '12px',
                                                        paddingRight:
                                                            '28px !important',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    },
                                                    '& .MuiSelect-icon': {
                                                        right: 4,
                                                        fontSize: 18,
                                                    },
                                                }}>
                                                <MenuItem value="admin">
                                                    Admin
                                                </MenuItem>
                                                <MenuItem value="editor">
                                                    Editor
                                                </MenuItem>
                                                <MenuItem value="viewer">
                                                    Viewer
                                                </MenuItem>
                                            </Select>
                                        ) : (
                                            <Chip
                                                label={
                                                    currentRole
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                    currentRole.slice(1)
                                                }
                                                size="small"
                                                sx={{
                                                    fontSize: 12,
                                                    height: 26,
                                                    border: `1px solid ${colors.primaryBlack}`,
                                                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                                }}
                                            />
                                        )}
                                    </Box>
                                )
                            })}
                        </Box>
                    )}
                </Box>

                <Box>
                    <Typography sx={labelSx}>Trip visibility</Typography>
                    <ToggleButtonGroup
                        value={visibility}
                        exclusive
                        onChange={(_, val) => {
                            if (val) setVisibility(val)
                        }}
                        size="small"
                        fullWidth
                        sx={{
                            'boxShadow': fieldShadow,
                            '& .MuiToggleButton-root': {
                                'textTransform': 'none',
                                'fontSize': 13,
                                'border': `1px solid ${colors.primaryBlack}`,
                                'color': colors.primaryBlack,
                                'backgroundColor': colors.primaryWhite,
                                '&:hover': {
                                    backgroundColor: colors.primaryWhite,
                                },
                                '&.Mui-selected': {
                                    'backgroundColor': colors.primaryYellow,
                                    'fontWeight': 600,
                                    '&:hover': {
                                        backgroundColor: colors.primaryYellow,
                                    },
                                },
                            },
                        }}>
                        <ToggleButton value="participants">
                            Participants only
                        </ToggleButton>
                        <ToggleButton value="all_users">All users</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Locations — inline list */}
                <Box>
                    <Typography sx={labelSx}>Locations</Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 0.75,
                            alignItems: 'stretch',
                        }}>
                        <TextField
                            value={newLocName}
                            onChange={(e) => setNewLocName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    addLocation()
                                }
                            }}
                            placeholder="Add a location"
                            size="small"
                            fullWidth
                            sx={fieldSx}
                        />
                        <IconButton
                            onClick={addLocation}
                            disabled={!newLocName.trim()}
                            sx={{
                                'color': colors.primaryBlack,
                                'backgroundColor': colors.primaryYellow,
                                ...hardShadow,
                                'borderRadius': '4px',
                                'width': INPUT_HEIGHT,
                                'height': INPUT_HEIGHT,
                                'flexShrink': 0,
                                '&:hover': {
                                    backgroundColor: colors.primaryYellow,
                                },
                                '&:active': {
                                    boxShadow: 'none',
                                    transform: 'translate(2px, 2px)',
                                },
                                '&.Mui-disabled': {
                                    color: `${colors.primaryBlack}40`,
                                    backgroundColor: `${colors.primaryYellow}60`,
                                    border: `1px solid ${colors.primaryBlack}40`,
                                    boxShadow: `2px 2px 0px ${colors.primaryBlack}40`,
                                },
                                'transition':
                                    'transform 0.1s, box-shadow 0.1s',
                            }}>
                            <IconPlus size={18} />
                        </IconButton>
                    </Box>
                    {locations.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                marginTop: 1,
                                border: `1px solid ${colors.primaryBlack}`,
                                borderRadius: '4px',
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                backgroundColor: colors.primaryWhite,
                                overflow: 'hidden',
                            }}>
                            {locations.map((loc, i) => (
                                <Box
                                    key={loc.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingY: 0.5,
                                        paddingX: 1,
                                        borderBottom:
                                            i < locations.length - 1
                                                ? `1px solid ${colors.primaryBlack}15`
                                                : 'none',
                                    }}>
                                    {editingLocId === loc.id ? (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                flex: 1,
                                                gap: 0.5,
                                            }}>
                                            <input
                                                ref={editLocRef}
                                                value={editLocName}
                                                onChange={(e) =>
                                                    setEditLocName(
                                                        e.target.value
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter')
                                                        confirmEditLocation()
                                                    if (e.key === 'Escape')
                                                        cancelEditLocation()
                                                }}
                                                onBlur={confirmEditLocation}
                                                style={{
                                                    border: `1px solid ${colors.primaryYellow}`,
                                                    boxShadow: `1px 1px 0px ${colors.primaryYellow}`,
                                                    outline: 'none',
                                                    background:
                                                        colors.primaryWhite,
                                                    fontSize: 14,
                                                    padding: '4px 8px',
                                                    borderRadius: 4,
                                                    flex: 1,
                                                    fontFamily: 'inherit',
                                                }}
                                            />
                                            <IconButton
                                                size="small"
                                                onMouseDown={(e) =>
                                                    e.preventDefault()
                                                }
                                                onClick={confirmEditLocation}
                                                sx={{
                                                    color: colors.primaryGreen,
                                                    padding: '4px',
                                                }}>
                                                <IconCheck size={16} />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onMouseDown={(e) =>
                                                    e.preventDefault()
                                                }
                                                onClick={cancelEditLocation}
                                                sx={{
                                                    color: colors.primaryBlack,
                                                    padding: '4px',
                                                    opacity: 0.4,
                                                }}>
                                                <IconX size={16} />
                                            </IconButton>
                                        </Box>
                                    ) : (
                                        <>
                                            <Typography
                                                sx={{
                                                    fontSize: 14,
                                                    flex: 1,
                                                }}>
                                                {loc.name}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 0.25,
                                                }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        startEditLocation(loc)
                                                    }
                                                    sx={{
                                                        'color':
                                                            colors.primaryBlack,
                                                        'padding': '4px',
                                                        'opacity': 0.4,
                                                        '&:hover': {
                                                            opacity: 1,
                                                        },
                                                    }}>
                                                    <IconPencil size={15} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() =>
                                                        removeLocation(loc.id)
                                                    }
                                                    sx={{
                                                        'color':
                                                            colors.primaryBlack,
                                                        'padding': '4px',
                                                        'opacity': 0.4,
                                                        '&:hover': {
                                                            opacity: 1,
                                                            color: colors.primaryRed,
                                                        },
                                                    }}>
                                                    <IconX size={15} />
                                                </IconButton>
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>

                {error && (
                    <Typography variant="body2" sx={errorMessageSx}>
                        {error}
                    </Typography>
                )}
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                    padding: '24px',
                    paddingBottom: `calc(24px + env(safe-area-inset-bottom, 0px))`,
                }}>
                <Button
                    onClick={handleClose}
                    disabled={submitting}
                    size="large"
                    sx={secondaryButtonSx}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    size="large"
                    sx={primaryButtonSx}>
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
