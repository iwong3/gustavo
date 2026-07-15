'use client'

import {
    Autocomplete,
    Box,
    Chip,
    IconButton,
    MenuItem,
    Select,
    Skeleton,
    TextField,
    Typography,
} from '@mui/material'
import { IconPlus, IconCheck, IconX } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'

import { colors, hardShadow } from '@/lib/colors'
import {
    dropdownMenuItemSx,
    dropdownPaperSx,
    dropdownPopperProps,
    errorFieldSx,
    errorLabelSx,
    errorMessageSx,
    fieldSx,
    labelSx,
    selectMenuProps,
} from '@/lib/form-styles'
import type { TripRole, TripSummary, UserSummary } from '@/lib/types'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'
import {
    PageInfo,
    PageInfoNote,
    PageInfoSection,
} from 'components/page-info'
import { SlidingToggle } from 'components/sliding-toggle'
import { useCurrentUser } from 'hooks/useCurrentUser'
import { useScrollFocusedInput } from 'hooks/useScrollFocusedInput'
import {
    ConflictError,
    createTrip,
    fetchLocations,
    fetchUserPreferences,
    fetchUsers,
    updateParticipantRole,
    updateTrip,
} from 'utils/api'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import { COUNTRIES, deriveCurrenciesFromCountries } from '@/lib/countries'
import { InitialsIcon } from 'utils/icons'
import { canManageRoles } from 'utils/permissions'

const todayISO = () => new Date().toISOString().slice(0, 10)

// ── Location item for local state ───────────────────────────────────────────

type LocalLocation = {
    /** Negative IDs = new (unsaved), positive IDs = existing from DB */
    id: number
    name: string
}

let nextLocalId = -1

// MUI small TextField rendered height (with size="small") is 40px
const INPUT_HEIGHT = 40

// Removable pill for a selected country / location — clean neo-brutalist chip
// with an ✕ to remove. Shared by the Countries and Locations fields so both
// read as the same "search/add above, chips below" pattern.
function RemovableTag({
    label,
    onRemove,
}: {
    label: string
    onRemove: () => void
}) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                height: 28,
                paddingLeft: '10px',
                paddingRight: '5px',
                borderRadius: '14px',
                border: `1px solid ${colors.primaryBlack}`,
                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                backgroundColor: colors.primaryYellow,
                fontSize: 13,
                fontWeight: 600,
                color: colors.primaryBlack,
                userSelect: 'none',
                maxWidth: '100%',
            }}>
            <Box
                component="span"
                sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                {label}
            </Box>
            <Box
                onClick={onRemove}
                role="button"
                aria-label={`Remove ${label}`}
                sx={{
                    'display': 'flex',
                    'alignItems': 'center',
                    'justifyContent': 'center',
                    'flexShrink': 0,
                    'width': 18,
                    'height': 18,
                    'borderRadius': '50%',
                    'cursor': 'pointer',
                    '&:active': { transform: 'scale(0.88)' },
                    'transition': 'transform 0.1s',
                }}>
                <IconX size={13} stroke={2.5} />
            </Box>
        </Box>
    )
}

type Props = {
    mode: 'create' | 'edit'
    trip?: TripSummary
    onCancel: () => void
    onSuccess: () => void
}

// Page-style trip form (create + edit) — same shell as ExpenseForm: title,
// fields, PageActionBar. Replaces the old FormDrawer-based TripFormDialog.
export default function TripForm({ mode, trip, onCancel, onSuccess }: Props) {
    const currentUser = useCurrentUser()
    const queryClient = useQueryClient()
    const [allUsers, setAllUsers] = useState<UserSummary[]>([])
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState(todayISO())
    const [endDate, setEndDate] = useState('')
    const [description, setDescription] = useState('')
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
    const [countryCodes, setCountryCodes] = useState<string[]>([])
    const [visibility, setVisibility] = useState<'participants' | 'all_users'>(
        'participants'
    )
    const [participantQuery, setParticipantQuery] = useState('')
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

    // Scroll the focused input near the top so the mobile keyboard can't hide it
    const focusScroll = useScrollFocusedInput()

    useEffect(() => {
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
    }, [mode, currentUser])

    useEffect(() => {
        if (mode === 'edit' && trip) {
            setName(trip.name)
            setStartDate(trip.startDate)
            setEndDate(trip.endDate)
            setDescription(trip.description ?? '')
            setCountryCodes(trip.countries ?? [])
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
                        locs.map((l) => ({ id: l.id, name: l.name }))
                    )
                )
                .catch(() => {})
            setDeletedLocationIds([])
        } else if (mode === 'create') {
            // Load user's default visibility preference
            fetchUserPreferences()
                .then((prefs) => setVisibility(prefs.defaultTripVisibility))
                .catch(() => {})
        }
    }, [mode, trip])

    const toggleUser = (userId: number) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        )
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
                    countries: countryCodes,
                    currencies: derivedCurrencies,
                    expectedUpdatedAt: trip.updatedAt,
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
                    countries: countryCodes,
                    currencies: derivedCurrencies,
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

            onSuccess()
        } catch (err) {
            if (err instanceof ConflictError) {
                queryClient.invalidateQueries({ queryKey: queryKeys.trips.all })
                setError('This trip was changed by someone else. Please go back and re-open this form to see the latest data.')
                setSubmitting(false)
                return
            }
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

    // Currencies the trip will use, derived from selected countries (USD always
    // included). Sent verbatim to the API on save.
    const derivedCurrencies = useMemo(
        () => deriveCurrenciesFromCountries(countryCodes),
        [countryCodes]
    )

    // Sorted country options for the picker (by name).
    const countryOptions = useMemo(
        () => COUNTRIES.slice().sort((a, b) => a.name.localeCompare(b.name)),
        []
    )

    // Selected countries, in the picker's display order, for the chip row.
    const selectedCountries = useMemo(
        () => countryOptions.filter((c) => countryCodes.includes(c.code)),
        [countryOptions, countryCodes]
    )

    // Users not yet on the trip, offered by the add-participant search.
    const addableUsers = useMemo(
        () =>
            allUsers
                .filter((u) => !selectedUserIds.includes(u.id))
                .sort((a, b) => a.firstName.localeCompare(b.firstName)),
        [allUsers, selectedUserIds]
    )

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
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    padding: '16px 16px 0',
                }}>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: colors.primaryBlack }}>
                    {isEdit ? 'Edit Trip' : 'Create Trip'}
                </Typography>
                <PageInfo title="About trips">
                    <PageInfoSection title="Countries">
                        Which countries this trip visits. Picking them sets the
                        trip&apos;s available currencies (USD is always
                        included) so you can log expenses in local money.
                    </PageInfoSection>
                    <PageInfoSection title="Locations">
                        Specific places within the trip — cities,
                        neighborhoods, or spots. They tag and group expenses,
                        and you can also add one on the fly while logging an
                        expense.
                    </PageInfoSection>
                    <PageInfoSection title="Participants & roles">
                        Everyone splitting costs. Each person has a role:{' '}
                        <b>Admin</b> manages the trip and roles, <b>Editor</b>{' '}
                        adds and edits expenses, <b>Viewer</b> can only look.
                    </PageInfoSection>
                    <PageInfoSection title="Trip visibility">
                        <b>Participants only</b> — just the people on the trip
                        can see it. <b>All users</b> — anyone signed in can find
                        it (they still can&apos;t edit unless you add them).
                    </PageInfoSection>
                    <PageInfoNote>
                        Countries drive currencies; locations organize your
                        expenses. You can change any of this later from Trip
                        Details.
                    </PageInfoNote>
                </PageInfo>
            </Box>
            <Box
                {...focusScroll}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '16px',
                }}>
                {/* 1. Trip name */}
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
                        slotProps={{ htmlInput: { maxLength: 200 } }}
                        sx={nameError ? errorFieldSx : fieldSx}
                    />
                </Box>

                {/* 2. Dates */}
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
                            slotProps={{
                                inputLabel: { shrink: true },
                                // Opens the picker at the start date (and blocks
                                // choosing a day before it) instead of today.
                                htmlInput: { min: startDate || undefined },
                            }}
                            sx={endDateError ? errorFieldSx : fieldSx}
                        />
                    </Box>
                </Box>

                {/* 3. Countries — search above, selected shown as chips below */}
                <Box>
                    <Typography sx={labelSx}>Countries</Typography>
                    <Autocomplete
                        multiple
                        fullWidth
                        size="small"
                        disableCloseOnSelect
                        options={countryOptions}
                        value={selectedCountries}
                        onChange={(_e, val) =>
                            setCountryCodes(val.map((c) => c.code))
                        }
                        getOptionLabel={(c) => c.name}
                        isOptionEqualToValue={(a, b) => a.code === b.code}
                        disablePortal
                        // Chips render in their own row below, not in the box
                        renderTags={() => null}
                        slotProps={{
                            popper: dropdownPopperProps,
                            listbox: {
                                sx: {
                                    'maxHeight': 240,
                                    'padding': 0,
                                    '& .MuiAutocomplete-option':
                                        dropdownMenuItemSx,
                                },
                            },
                            paper: { sx: dropdownPaperSx },
                        }}
                        renderOption={(props, option, { selected }) => {
                            const { key: _key, ...rest } = props
                            return (
                                <li key={option.code} {...rest}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            width: '100%',
                                        }}>
                                        <Box
                                            component="span"
                                            sx={{ fontSize: 16 }}>
                                            {option.flag}
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontSize: 14,
                                                fontWeight: selected ? 700 : 400,
                                            }}>
                                            {option.name}
                                        </Typography>
                                        {selected && (
                                            <IconCheck
                                                size={16}
                                                stroke={2.5}
                                                color={colors.primaryBlack}
                                                style={{ marginLeft: 'auto' }}
                                            />
                                        )}
                                    </Box>
                                </li>
                            )
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="Add countries"
                                sx={fieldSx}
                            />
                        )}
                    />
                    {selectedCountries.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.75,
                                marginTop: 1,
                            }}>
                            {selectedCountries.map((c) => (
                                <RemovableTag
                                    key={c.code}
                                    label={`${c.flag} ${c.name}`}
                                    onRemove={() =>
                                        setCountryCodes((prev) =>
                                            prev.filter(
                                                (code) => code !== c.code
                                            )
                                        )
                                    }
                                />
                            ))}
                        </Box>
                    )}
                </Box>

                {/* 4. Participants — search to add; the role list below is the
                    roster (remove via the ✕ on each row) */}
                <Box>
                    <Typography sx={labelSx}>Participants</Typography>
                    <Autocomplete
                        fullWidth
                        size="small"
                        options={addableUsers}
                        value={null}
                        inputValue={participantQuery}
                        onInputChange={(_e, val, reason) => {
                            if (reason !== 'reset') setParticipantQuery(val)
                        }}
                        onChange={(_e, val) => {
                            if (val) {
                                setSelectedUserIds((prev) =>
                                    prev.includes(val.id)
                                        ? prev
                                        : [...prev, val.id]
                                )
                            }
                            setParticipantQuery('')
                        }}
                        getOptionLabel={(u) => u.name}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        blurOnSelect
                        autoHighlight
                        noOptionsText={
                            allUsers.length === 0
                                ? 'Loading people…'
                                : 'No one left to add'
                        }
                        disablePortal
                        slotProps={{
                            popper: dropdownPopperProps,
                            listbox: {
                                sx: {
                                    'maxHeight': 240,
                                    'padding': 0,
                                    '& .MuiAutocomplete-option':
                                        dropdownMenuItemSx,
                                },
                            },
                            paper: { sx: dropdownPaperSx },
                        }}
                        renderOption={(props, u) => {
                            const { key: _key, ...rest } = props
                            return (
                                <li key={u.id} {...rest}>
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
                                        <Typography sx={{ fontSize: 14 }}>
                                            {u.name}
                                        </Typography>
                                    </Box>
                                </li>
                            )
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                size="small"
                                placeholder="Search people to add"
                                sx={fieldSx}
                            />
                        )}
                    />

                    {/* Loading placeholder while users resolve (edit mode
                        knows the roster ids before names arrive) */}
                    {allUsers.length === 0 && selectedUserIds.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                mt: 1.5,
                            }}>
                            {Array.from(
                                { length: Math.min(selectedUserIds.length, 5) },
                                (_, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            paddingY: 0.25,
                                        }}>
                                        <Skeleton
                                            variant="circular"
                                            width={24}
                                            height={24}
                                        />
                                        <Skeleton variant="text" width={90} />
                                    </Box>
                                )
                            )}
                        </Box>
                    )}

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
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                            }}>
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
                                                MenuProps={selectMenuProps}
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
                                        {isOwner ? (
                                            // Spacer matching the ✕ button so
                                            // role pills align across rows
                                            <Box sx={{ width: 23 }} />
                                        ) : (
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    toggleUser(u.id)
                                                }
                                                aria-label={`Remove ${u.firstName}`}
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
                                        )}
                                        </Box>
                                    </Box>
                                )
                            })}
                        </Box>
                    )}
                </Box>

                {/* 5. Description */}
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
                        slotProps={{ htmlInput: { maxLength: 2000 } }}
                        sx={fieldSx}
                    />
                </Box>

                {/* 6. Locations — add above, selected shown as chips below */}
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
                            slotProps={{ htmlInput: { maxLength: 200 } }}
                            sx={fieldSx}
                        />
                        <IconButton
                            onClick={addLocation}
                            disabled={!newLocName.trim()}
                            aria-label="Add location"
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
                                flexWrap: 'wrap',
                                gap: 0.75,
                                marginTop: 1,
                            }}>
                            {locations.map((loc) => (
                                <RemovableTag
                                    key={loc.id}
                                    label={loc.name}
                                    onRemove={() => removeLocation(loc.id)}
                                />
                            ))}
                        </Box>
                    )}
                </Box>

                {/* 7. Trip visibility */}
                <Box>
                    <Typography sx={labelSx}>Trip visibility</Typography>
                    <SlidingToggle
                        value={visibility}
                        options={[
                            { value: 'participants', label: 'Participants only' },
                            { value: 'all_users', label: 'All users' },
                        ]}
                        onChange={(val) => setVisibility(val as 'participants' | 'all_users')}
                        fontSize={13}
                        borderWidth={1}
                    />
                </Box>

                {error && (
                    <Typography variant="body2" sx={errorMessageSx}>
                        {error}
                    </Typography>
                )}
            </Box>

            <PageActionBar>
                <PageActionButton
                    onClick={onCancel}
                    disabled={submitting}
                    icon={<IconX size={22} />}
                    label="Cancel"
                />
                <PageActionButton
                    onClick={handleSubmit}
                    disabled={submitting}
                    icon={<IconCheck size={22} />}
                    label={
                        submitting
                            ? isEdit
                                ? 'Saving...'
                                : 'Creating...'
                            : isEdit
                              ? 'Save'
                              : 'Create'
                    }
                />
            </PageActionBar>
        </>
    )
}
