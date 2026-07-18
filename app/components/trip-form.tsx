'use client'

import {
    Autocomplete,
    Box,
    MenuItem,
    Select,
    Skeleton,
    TextField,
    Typography,
} from '@mui/material'
import { IconCirclePlus, IconCheck, IconSearch, IconX } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { colors } from '@/lib/colors'
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

// Role → accent color for the participant role labels.
const ROLE_COLOR: Record<TripRole, string> = {
    owner: colors.primaryGreen,
    admin: colors.primaryRed,
    editor: colors.primaryBlue,
    viewer: colors.primaryBrown,
}
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// ── Shared "selected items" card (Countries / Locations / Participants) ──────
// One bordered card whose FIRST row is the search / add control (like the
// "Everyone" row on the expense Split-between card), followed by one row per
// selected item.

const selectedCardSx = {
    backgroundColor: colors.primaryWhite,
    border: `1px solid ${colors.primaryBlack}`,
    borderRadius: '4px',
    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
} as const

// Flush styling for the input that acts as the card's top row — no border or
// shadow of its own (the card provides them), row-height padding, a gap for
// the leading icon.
const topRowInputSx = {
    '& .MuiOutlinedInput-root': {
        minHeight: 44,
        // A touch more left inset than the item rows' content so the leading
        // search icon doesn't read as cramped against the card edge.
        padding: '0 14px',
        gap: '10px',
        boxShadow: 'none',
        backgroundColor: 'transparent',
    },
    '& .MuiOutlinedInput-root.Mui-focused': { boxShadow: 'none' },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '& .MuiOutlinedInput-input': { padding: '0 !important' },
    '& .MuiAutocomplete-input': { padding: '0 !important' },
} as const

// Divider between the top (search) row and the item rows — only when there
// are items below it.
const topRowDivider = (hasItems: boolean) =>
    ({
        borderBottom: hasItems
            ? `1px solid ${colors.primaryBlack}`
            : 'none',
    }) as const

// One selected-item row (country / location / participant).
const selectedRowSx = (isLast: boolean) =>
    ({
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minHeight: 44,
        // Content lines up under the search icon (14px); the right pad is
        // smaller because the ✕ tap box carries its own inner whitespace.
        paddingLeft: '14px',
        paddingRight: '8px',
        paddingY: 0.5,
        borderBottom: isLast
            ? 'none'
            : `1px solid ${colors.primaryBlack}15`,
    }) as const

// Count shown on the right of a field's label row.
const fieldCountSx = {
    fontSize: 12,
    fontWeight: 600,
    color: colors.primaryBlack,
    lineHeight: 1,
} as const

// Leading search icon for the search rows.
const searchAdornment = (
    <Box
        component="span"
        sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            color: colors.primaryBlack,
            opacity: 0.45,
        }}>
        <IconSearch size={16} />
    </Box>
)

// Small ✕ that removes a row — used across all three cards.
function RowRemove({
    onClick,
    label,
}: {
    onClick: () => void
    label: string
}) {
    return (
        <Box
            onClick={onClick}
            role="button"
            aria-label={label}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'justifyContent': 'center',
                'flexShrink': 0,
                'width': 26,
                'height': 26,
                'borderRadius': '6px',
                'cursor': 'pointer',
                'color': colors.primaryBlack,
                'opacity': 0.4,
                '&:hover': { opacity: 1, color: colors.primaryRed },
                '&:active': { transform: 'scale(0.9)' },
                'transition': 'transform 0.1s',
            }}>
            <IconX size={15} />
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
    // Seed dates from the trip up front in edit mode. If endDate started ''
    // here, the date-sync effect below would run against that stale initial
    // value on mount and clobber the loaded endDate with the start date (it was
    // defaulting a trip's end date to today on edit). Create mode: today / empty.
    const [startDate, setStartDate] = useState(() =>
        mode === 'edit' && trip ? trip.startDate : todayISO()
    )
    const [endDate, setEndDate] = useState(() =>
        mode === 'edit' && trip ? trip.endDate : ''
    )
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

    // Keep the end date on/after the start date, and seed an empty end date
    // with the start date. The native mobile date picker opens at the field's
    // current value and ignores `min` for an empty field, so without this the
    // picker starts at today on phones (desktop honors `min` and starts there).
    useEffect(() => {
        if (!startDate) return
        if (endDate === '' || endDate < startDate) {
            setEndDate(startDate)
        }
    }, [startDate, endDate])

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
    // Edit mode knows the roster ids before the user names have loaded.
    const rosterLoading =
        allUsers.length === 0 && selectedUserIds.length > 0
    const hasRoster = rosterLoading || selectedParticipants.length > 0
    const rosterCount = rosterLoading
        ? selectedUserIds.length
        : selectedParticipants.length

    // Right-side role control for a participant row: a colored, tappable label
    // (editable roles open the role menu) with a fixed width so the ✕ column
    // stays aligned across rows.
    const roleControl = (
        userId: number,
        role: TripRole,
        editable: boolean
    ): ReactNode => {
        const color = ROLE_COLOR[role]
        const opacity = role === 'viewer' ? 0.75 : 1
        if (!editable) {
            return (
                <Box
                    sx={{
                        minWidth: 62,
                        boxSizing: 'border-box',
                        // Reserve the same right gutter the editable Select
                        // gives its dropdown arrow, so read-only roles (Owner)
                        // end at the same x as the tappable ones.
                        paddingRight: '18px',
                        textAlign: 'right',
                        fontSize: 12,
                        fontWeight: 700,
                        color,
                        opacity,
                    }}>
                    {capitalize(role)}
                </Box>
            )
        }
        return (
            <Select
                value={role}
                onChange={(e) => {
                    const newRole = e.target.value as TripRole
                    setParticipantRoles((prev) => {
                        const next = new Map(prev)
                        next.set(userId, newRole)
                        return next
                    })
                }}
                variant="standard"
                MenuProps={selectMenuProps}
                renderValue={(val) => (
                    <Box
                        component="span"
                        sx={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: ROLE_COLOR[val as TripRole],
                            opacity: val === 'viewer' ? 0.75 : 1,
                        }}>
                        {capitalize(val)}
                    </Box>
                )}
                sx={{
                    'minWidth': 62,
                    '&::before': { display: 'none' },
                    '&::after': { display: 'none' },
                    '& .MuiSelect-select': {
                        paddingRight: '18px !important',
                        paddingY: 0,
                        minWidth: 0,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        backgroundColor: 'transparent !important',
                    },
                    '& .MuiSelect-icon': {
                        right: 0,
                        fontSize: 18,
                        color,
                    },
                }}>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
        )
    }

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

                {/* 3. Participants — search is the card's top row; roster
                    rows below with per-person role (colored, tappable) + remove */}
                <Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: 0.5,
                        }}>
                        <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                            Participants
                        </Typography>
                        {rosterCount > 0 && (
                            <Typography sx={fieldCountSx}>
                                {rosterCount}{' '}
                                {rosterCount === 1 ? 'person' : 'people'}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={selectedCardSx}>
                        <Box sx={topRowDivider(hasRoster)}>
                            <Autocomplete
                                fullWidth
                                size="small"
                                options={addableUsers}
                                value={null}
                                inputValue={participantQuery}
                                onInputChange={(_e, val, reason) => {
                                    if (reason !== 'reset')
                                        setParticipantQuery(val)
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
                                                <Typography
                                                    sx={{ fontSize: 14 }}>
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
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: searchAdornment,
                                        }}
                                        sx={topRowInputSx}
                                    />
                                )}
                            />
                        </Box>

                        {rosterLoading
                            ? Array.from(
                                  {
                                      length: Math.min(
                                          selectedUserIds.length,
                                          5
                                      ),
                                  },
                                  (_, i) => (
                                      <Box
                                          key={i}
                                          sx={selectedRowSx(
                                              i ===
                                                  Math.min(
                                                      selectedUserIds.length,
                                                      5
                                                  ) -
                                                      1
                                          )}>
                                          <Skeleton
                                              variant="circular"
                                              width={26}
                                              height={26}
                                          />
                                          <Skeleton
                                              variant="text"
                                              width={90}
                                          />
                                      </Box>
                                  )
                              )
                            : selectedParticipants.map((u, i) => {
                                  const isOwner = u.id === ownerId
                                  const currentRole =
                                      participantRoles.get(u.id) ??
                                      (isOwner ? 'owner' : 'viewer')
                                  const canEditRole =
                                      !isOwner &&
                                      (showRoleManagement || !isEdit)
                                  const isLast =
                                      i === selectedParticipants.length - 1
                                  return (
                                      <Box
                                          key={u.id}
                                          sx={selectedRowSx(isLast)}>
                                          <InitialsIcon
                                              name={u.firstName}
                                              initials={u.initials}
                                              iconColor={u.iconColor}
                                              sx={{
                                                  width: 26,
                                                  height: 26,
                                                  fontSize: 10,
                                              }}
                                          />
                                          <Typography sx={{ fontSize: 14 }}>
                                              {u.firstName}
                                          </Typography>
                                          <Box
                                              sx={{
                                                  marginLeft: 'auto',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 0.75,
                                              }}>
                                              {roleControl(
                                                  u.id,
                                                  currentRole,
                                                  canEditRole
                                              )}
                                              {isOwner ? (
                                                  <Box sx={{ width: 26 }} />
                                              ) : (
                                                  <RowRemove
                                                      onClick={() =>
                                                          toggleUser(u.id)
                                                      }
                                                      label={`Remove ${u.firstName}`}
                                                  />
                                              )}
                                          </Box>
                                      </Box>
                                  )
                              })}
                    </Box>
                </Box>

                {/* 4. Trip visibility */}
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

                {/* 5. Countries — search is the card's top row; each selected
                    country row shows the currency it contributes */}
                <Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: 0.5,
                        }}>
                        <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                            Countries
                        </Typography>
                        {selectedCountries.length > 0 && (
                            <Typography sx={fieldCountSx}>
                                {selectedCountries.length}{' '}
                                {selectedCountries.length === 1
                                    ? 'country'
                                    : 'countries'}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={selectedCardSx}>
                        <Box sx={topRowDivider(selectedCountries.length > 0)}>
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
                                isOptionEqualToValue={(a, b) =>
                                    a.code === b.code
                                }
                                disablePortal
                                // Selected countries render as rows below
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
                                renderOption={(
                                    props,
                                    option,
                                    { selected }
                                ) => {
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
                                                        fontWeight: selected
                                                            ? 700
                                                            : 400,
                                                    }}>
                                                    {option.name}
                                                </Typography>
                                                {selected && (
                                                    <IconCheck
                                                        size={16}
                                                        stroke={2.5}
                                                        color={
                                                            colors.primaryBlack
                                                        }
                                                        style={{
                                                            marginLeft: 'auto',
                                                        }}
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
                                        InputProps={{
                                            ...params.InputProps,
                                            startAdornment: searchAdornment,
                                        }}
                                        sx={topRowInputSx}
                                    />
                                )}
                            />
                        </Box>
                        {selectedCountries.map((c, i) => (
                            <Box
                                key={c.code}
                                sx={selectedRowSx(
                                    i === selectedCountries.length - 1
                                )}>
                                <Box
                                    component="span"
                                    sx={{
                                        fontSize: 18,
                                        width: 22,
                                        textAlign: 'center',
                                        flexShrink: 0,
                                    }}>
                                    {c.flag}
                                </Box>
                                <Typography sx={{ fontSize: 14 }}>
                                    {c.name}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: colors.primaryBrown,
                                    }}>
                                    {c.currency}
                                </Typography>
                                <Box sx={{ marginLeft: 'auto' }} />
                                <RowRemove
                                    onClick={() =>
                                        setCountryCodes((prev) =>
                                            prev.filter(
                                                (code) => code !== c.code
                                            )
                                        )
                                    }
                                    label={`Remove ${c.name}`}
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* 6. Locations — add input is the card's top row (+ button
                    lives inside it); location rows below */}
                <Box>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: 0.5,
                        }}>
                        <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                            Locations
                        </Typography>
                        {locations.length > 0 && (
                            <Typography sx={fieldCountSx}>
                                {locations.length}{' '}
                                {locations.length === 1 ? 'place' : 'places'}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={selectedCardSx}>
                        <Box sx={topRowDivider(locations.length > 0)}>
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
                                slotProps={{
                                    htmlInput: { maxLength: 200 },
                                    input: {
                                        endAdornment: (
                                            <Box
                                                onClick={() => {
                                                    if (newLocName.trim())
                                                        addLocation()
                                                }}
                                                role="button"
                                                aria-label="Add location"
                                                sx={{
                                                    'display': 'flex',
                                                    'alignItems': 'center',
                                                    'justifyContent': 'center',
                                                    'flexShrink': 0,
                                                    'color': newLocName.trim()
                                                        ? colors.primaryBlack
                                                        : `${colors.primaryBlack}30`,
                                                    'cursor': newLocName.trim()
                                                        ? 'pointer'
                                                        : 'default',
                                                    '&:active': newLocName.trim()
                                                        ? { transform: 'scale(0.85)' }
                                                        : {},
                                                    'transition':
                                                        'transform 0.1s',
                                                }}>
                                                <IconCirclePlus
                                                    size={22}
                                                    stroke={1.75}
                                                />
                                            </Box>
                                        ),
                                    },
                                }}
                                sx={topRowInputSx}
                            />
                        </Box>
                        {locations.map((loc, i) => (
                            <Box
                                key={loc.id}
                                sx={selectedRowSx(i === locations.length - 1)}>
                                <Typography sx={{ fontSize: 14 }}>
                                    {loc.name}
                                </Typography>
                                <Box sx={{ marginLeft: 'auto' }} />
                                <RowRemove
                                    onClick={() => removeLocation(loc.id)}
                                    label={`Remove ${loc.name}`}
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* 7. Description */}
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
