'use client'

import { cardSx, colors, hardShadow } from '@/lib/colors'
import type { ActivityEntry } from '@/lib/types'
import {
    Box,
    CircularProgress,
    Collapse,
    IconButton,
    Menu,
    MenuItem,
    Typography,
} from '@mui/material'
import {
    IconArrowDown,
    IconArrowUp,
    IconChevronDown,
    IconChevronRight,
    IconFilter,
    IconHistory,
    IconLayoutList,
    IconPencil,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react'
import { useTripData } from 'providers/trip-data-provider'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchActivity } from 'utils/api'
import type { ActivityResponse } from 'utils/api'
import { InitialsIcon } from 'utils/icons'

// ── Helpers ──

function formatTimestamp(iso: string): { date: string; time: string } {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
    const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })
    return { date, time }
}

function getActionIcon(entry: ActivityEntry) {
    // Soft delete detection
    if (
        entry.action === 'UPDATE' &&
        entry.newData?.deleted_at &&
        !entry.oldData?.deleted_at
    ) {
        return <IconTrash size={16} color={colors.primaryRed} />
    }
    switch (entry.action) {
        case 'INSERT':
            return <IconPlus size={16} color={colors.primaryGreen} />
        case 'DELETE':
            return <IconTrash size={16} color={colors.primaryRed} />
        case 'UPDATE':
            return <IconPencil size={16} color={colors.primaryBlue} />
        default:
            return <IconHistory size={16} color={colors.primaryBlack} />
    }
}

function getActionColor(entry: ActivityEntry): string {
    if (
        entry.action === 'UPDATE' &&
        entry.newData?.deleted_at &&
        !entry.oldData?.deleted_at
    ) {
        return colors.primaryRed
    }
    switch (entry.action) {
        case 'INSERT':
            return colors.primaryGreen
        case 'DELETE':
            return colors.primaryRed
        case 'UPDATE':
            return colors.primaryBlue
        default:
            return colors.primaryBlack
    }
}

function computeChangedFields(
    oldData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
    ignoredFields: Set<string>
): { field: string; from: unknown; to: unknown }[] {
    if (!oldData || !newData) return []
    const changes: { field: string; from: unknown; to: unknown }[] = []

    for (const key of Object.keys(newData)) {
        if (ignoredFields.has(key)) continue
        const oldVal = oldData[key]
        const newVal = newData[key]
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field: key, from: oldVal, to: newVal })
        }
    }
    return changes
}

function formatFieldValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '\u2014'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return String(value)
    return String(value)
}

// ── Component ──

export default function ActivityPage() {
    const { trip } = useTripData()
    const [data, setData] = useState<ActivityResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [sortNewest, setSortNewest] = useState(true)
    const [filterUser, setFilterUser] = useState<number | null>(null)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [collapsedDates, setCollapsedDates] = useState<Set<string>>(
        new Set()
    )

    const toggleDate = (date: string) => {
        setCollapsedDates((prev) => {
            const next = new Set(prev)
            if (next.has(date)) next.delete(date)
            else next.add(date)
            return next
        })
    }

    const loadActivity = useCallback(async () => {
        try {
            setLoading(true)
            const result = await fetchActivity(trip.id)
            setData(result)
        } catch {
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [trip.id])

    useEffect(() => {
        loadActivity()
    }, [loadActivity])

    const ignoredFields = useMemo(
        () => new Set(data?.ignoredFields ?? []),
        [data?.ignoredFields]
    )

    const fieldLabels = useMemo(
        () => data?.fieldLabels ?? {},
        [data?.fieldLabels]
    )

    // Unique users who made changes
    const changeUsers = useMemo(() => {
        if (!data) return []
        const map = new Map<
            number,
            {
                id: number
                name: string
                initials: string | null
                iconColor: string | null
            }
        >()
        for (const entry of data.entries) {
            if (entry.changedBy && !map.has(entry.changedBy.id)) {
                map.set(entry.changedBy.id, entry.changedBy)
            }
        }
        return Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        )
    }, [data])

    // Filtered + sorted entries
    const entries = useMemo(() => {
        if (!data) return []
        let filtered = data.entries
        if (filterUser !== null) {
            filtered = filtered.filter(
                (e) => e.changedBy?.id === filterUser
            )
        }
        if (!sortNewest) {
            return [...filtered].reverse()
        }
        return filtered
    }, [data, sortNewest, filterUser])

    // Group entries by date
    const groupedByDate = useMemo(() => {
        const groups: { date: string; entries: ActivityEntry[] }[] = []
        let currentDate = ''
        for (const entry of entries) {
            const { date } = formatTimestamp(entry.changedAt)
            if (date !== currentDate) {
                currentDate = date
                groups.push({ date, entries: [entry] })
            } else {
                groups[groups.length - 1].entries.push(entry)
            }
        }
        return groups
    }, [entries])

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

    if (error) {
        return (
            <Box sx={{ padding: 3, textAlign: 'center' }}>
                <Typography>Failed to load activity log.</Typography>
            </Box>
        )
    }

    const headerActions = (
        <>
            {/* User filter */}
            <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                size="small"
                sx={{
                    'border': `1px solid ${colors.primaryBlack}`,
                    'borderRadius': '4px',
                    'backgroundColor':
                        filterUser !== null
                            ? colors.primaryYellow
                            : colors.primaryWhite,
                    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                    'width': 32,
                    'height': 32,
                    '&:active': {
                        boxShadow: 'none',
                        transform: 'translate(1px, 1px)',
                    },
                }}
                title="Filter by user">
                <IconFilter size={16} color={colors.primaryBlack} />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{
                    paper: {
                        sx: {
                            border: `1.5px solid ${colors.primaryBlack}`,
                            borderRadius: '4px',
                            boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                            backgroundColor: colors.primaryWhite,
                        },
                    },
                }}>
                <MenuItem
                    selected={filterUser === null}
                    onClick={() => {
                        setFilterUser(null)
                        setAnchorEl(null)
                    }}
                    sx={{
                        'fontSize': 14,
                        '&.Mui-selected': {
                            backgroundColor: colors.primaryYellow,
                        },
                        '&.Mui-selected:hover': {
                            backgroundColor: colors.primaryYellow,
                        },
                        '&:hover': {
                            backgroundColor: colors.secondaryYellow,
                        },
                    }}>
                    All users
                </MenuItem>
                {changeUsers.map((user) => (
                    <MenuItem
                        key={user.id}
                        selected={filterUser === user.id}
                        onClick={() => {
                            setFilterUser(user.id)
                            setAnchorEl(null)
                        }}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 1,
                            'fontSize': 14,
                            '&.Mui-selected': {
                                backgroundColor: colors.primaryYellow,
                            },
                            '&.Mui-selected:hover': {
                                backgroundColor: colors.primaryYellow,
                            },
                            '&:hover': {
                                backgroundColor: colors.secondaryYellow,
                            },
                        }}>
                        <InitialsIcon
                            name={user.name}
                            initials={user.initials}
                            iconColor={user.iconColor}
                            sx={{
                                width: 22,
                                height: 22,
                                fontSize: 9,
                                border: `1px solid ${colors.primaryBlack}`,
                            }}
                        />
                        {user.name.split(' ')[0]}
                    </MenuItem>
                ))}
            </Menu>

            {/* Sort toggle */}
            <IconButton
                onClick={() => setSortNewest((p) => !p)}
                size="small"
                sx={{
                    'border': `1px solid ${colors.primaryBlack}`,
                    'borderRadius': '4px',
                    'backgroundColor': colors.primaryWhite,
                    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                    'width': 32,
                    'height': 32,
                    '&:active': {
                        boxShadow: 'none',
                        transform: 'translate(1px, 1px)',
                    },
                }}
                title={sortNewest ? 'Newest first' : 'Oldest first'}>
                {sortNewest ? (
                    <IconArrowDown
                        size={16}
                        color={colors.primaryBlack}
                    />
                ) : (
                    <IconArrowUp
                        size={16}
                        color={colors.primaryBlack}
                    />
                )}
            </IconButton>
        </>
    )

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            {/* Header row */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingX: 2,
                    paddingTop: 2,
                    paddingBottom: 1,
                }}>
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        paddingX: 1.5,
                        paddingY: 0.75,
                        backgroundColor: '#cdbfdb',
                        ...hardShadow,
                        borderRadius: '4px',
                    }}>
                    <IconLayoutList
                        size={20}
                        stroke={2}
                        color={colors.primaryBlack}
                        fill={colors.primaryWhite}
                    />
                    <Typography
                        sx={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: colors.primaryBlack,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        }}>
                        Activity Log
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {headerActions}
                </Box>
            </Box>

            {/* Timeline */}
            <Box sx={{ paddingX: 2, paddingBottom: 3 }}>
                {entries.length === 0 && (
                    <Box
                        sx={{
                            textAlign: 'center',
                            paddingY: 4,
                            color: 'text.secondary',
                            fontSize: 14,
                        }}>
                        {filterUser !== null
                            ? 'No activity from this user.'
                            : 'No activity recorded yet.'}
                    </Box>
                )}

                {groupedByDate.map((group) => {
                    const isCollapsed = collapsedDates.has(group.date)
                    return (
                        <Box key={group.date} sx={{ marginBottom: 2 }}>
                            {/* Date header — clickable to collapse */}
                            <Box
                                onClick={() => toggleDate(group.date)}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'baseline',
                                    'gap': 0.5,
                                    'cursor': 'pointer',
                                    'marginTop': 1,
                                    'userSelect': 'none',
                                    '&:hover': { opacity: 0.7 },
                                }}>
                                {isCollapsed ? (
                                    <IconChevronRight
                                        size={14}
                                        color="gray"
                                        style={{ alignSelf: 'center' }}
                                    />
                                ) : (
                                    <IconChevronDown
                                        size={14}
                                        color="gray"
                                        style={{ alignSelf: 'center' }}
                                    />
                                )}
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: 'text.secondary',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        lineHeight: 1,
                                    }}>
                                    {group.date}
                                </Typography>
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: 12,
                                        color: 'text.secondary',
                                        lineHeight: 1,
                                    }}>
                                    ({group.entries.length})
                                </Typography>
                            </Box>

                            <Collapse in={!isCollapsed}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                        paddingTop: 1,
                                    }}>
                                    {group.entries.map((entry) => (
                                        <ActivityCard
                                            key={entry.id}
                                            entry={entry}
                                            fieldLabels={fieldLabels}
                                            ignoredFields={ignoredFields}
                                        />
                                    ))}
                                </Box>
                            </Collapse>
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}

// ── Activity Card ──

function ActivityCard({
    entry,
    fieldLabels,
    ignoredFields,
}: {
    entry: ActivityEntry
    fieldLabels: Record<string, string>
    ignoredFields: Set<string>
}) {
    const { time } = formatTimestamp(entry.changedAt)
    const actionColor = getActionColor(entry)
    const changes = computeChangedFields(
        entry.oldData,
        entry.newData,
        ignoredFields
    )

    // For soft deletes, don't show the deleted_at field change
    const isSoftDelete =
        entry.action === 'UPDATE' &&
        entry.newData?.deleted_at &&
        !entry.oldData?.deleted_at
    const displayChanges = isSoftDelete
        ? changes.filter((c) => c.field !== 'deleted_at')
        : changes

    return (
        <Box
            sx={{
                ...cardSx,
                padding: 1.5,
                display: 'flex',
                gap: 1.5,
            }}>
            {/* Action indicator */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 0.25,
                }}>
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: `1.5px solid ${actionColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${actionColor}15`,
                        flexShrink: 0,
                    }}>
                    {getActionIcon(entry)}
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Summary line */}
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: colors.primaryBlack,
                        lineHeight: 1.3,
                    }}>
                    {entry.summary}
                </Typography>

                {/* Meta: who + when */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        marginTop: 0.25,
                        marginBottom:
                            displayChanges.length > 0 ? 0.75 : 0,
                    }}>
                    {entry.changedBy && (
                        <InitialsIcon
                            name={entry.changedBy.name}
                            initials={entry.changedBy.initials}
                            iconColor={entry.changedBy.iconColor}
                            sx={{
                                width: 16,
                                height: 16,
                                fontSize: 7,
                                border: `1px solid ${colors.primaryBlack}`,
                                boxShadow: 'none',
                            }}
                        />
                    )}
                    <Typography
                        sx={{
                            fontSize: 11,
                            color: 'text.secondary',
                            lineHeight: '16px',
                        }}>
                        {entry.changedBy?.name.split(' ')[0] ?? 'System'}
                        {' \u00B7 '}
                        {time}
                    </Typography>
                </Box>

                {/* Before/after diff for UPDATEs */}
                {entry.action === 'UPDATE' &&
                    displayChanges.length > 0 && (
                        <Box
                            sx={{
                                backgroundColor: `${colors.primaryBlack}06`,
                                border: `1px solid ${colors.primaryBlack}18`,
                                borderRadius: '3px',
                                padding: 1,
                            }}>
                            {displayChanges.map((change) => (
                                <Box
                                    key={change.field}
                                    sx={{
                                        'display': 'flex',
                                        'flexDirection': 'column',
                                        'fontSize': 11,
                                        '&:not(:last-child)': {
                                            marginBottom: 0.75,
                                            paddingBottom: 0.75,
                                            borderBottom: `1px dashed ${colors.primaryBlack}15`,
                                        },
                                    }}>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: 'text.secondary',
                                            marginBottom: 0.25,
                                        }}>
                                        {fieldLabels[change.field] ??
                                            change.field.replace(
                                                /_/g,
                                                ' '
                                            )}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: 0.5,
                                            flexWrap: 'wrap',
                                        }}>
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: 11,
                                                color: colors.primaryRed,
                                                textDecoration:
                                                    formatFieldValue(change.from) === '\u2014'
                                                        ? 'none'
                                                        : 'line-through',
                                                wordBreak: 'break-word',
                                            }}>
                                            {formatFieldValue(
                                                change.from
                                            )}
                                        </Typography>
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: 11,
                                                color: 'text.secondary',
                                            }}>
                                            {'\u2192'}
                                        </Typography>
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: 11,
                                                color: colors.primaryGreen,
                                                fontWeight: 600,
                                                wordBreak: 'break-word',
                                            }}>
                                            {formatFieldValue(change.to)}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
            </Box>
        </Box>
    )
}
