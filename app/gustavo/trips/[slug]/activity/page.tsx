'use client'

import { colors } from '@/lib/colors'
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
} from '@tabler/icons-react'
import { useTripData } from 'providers/trip-data-provider'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchActivity } from 'utils/api'
import type { ActivityResponse } from 'utils/api'
import { InitialsIcon } from 'utils/icons'
import { ActivityCard, buildActivityCards, formatTimestamp } from './activity-card'

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
            {/* Header row — filter/sort actions */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 1,
                    paddingX: 2,
                    paddingTop: 1.5,
                    paddingBottom: 1,
                }}>
                {headerActions}
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
                                    {buildActivityCards(
                                        group.entries,
                                        ignoredFields
                                    ).map((model) => (
                                        <ActivityCard
                                            key={model.key}
                                            model={model}
                                            fieldLabels={fieldLabels}
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
