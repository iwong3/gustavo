'use client'

import { cardSx, colors } from '@/lib/colors'
import type { DaysSince } from '@/lib/health-types'
import { Box, Typography } from '@mui/material'
import { useMemo } from 'react'
import { IconBarbell, IconFirstAidKit, IconPill, IconSalad, IconStretching } from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

function getDaysSinceColor(days: number | null): string {
    if (days === null) return '#9e9e9e'   // grey — never
    if (days <= 3) return '#4caf50'        // green
    if (days <= 6) return '#ff9800'        // orange
    return '#f44336'                       // red
}

function getDaysSinceBg(days: number | null): string {
    if (days === null) return '#9e9e9e12'  // grey tint
    if (days <= 3) return '#4caf5012'      // green tint
    if (days <= 6) return '#ff980012'      // orange tint
    return '#f4433612'                     // red tint
}

function getDaysSinceBorder(days: number | null): string {
    if (days === null) return '#9e9e9ecc'
    if (days <= 3) return '#4caf50cc'
    if (days <= 6) return '#ff9800cc'
    return '#f44336cc'
}

function formatDaysSince(days: number | null): string {
    if (days === null) return 'Never'
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
}

const tools = [
    {
        name: 'Workouts',
        path: '/gustavo/health/exercise',
        icon: IconBarbell,
        bg: '#ffe0b2',
    },
    {
        name: 'Exercises',
        path: '/gustavo/health/exercises',
        icon: IconStretching,
        bg: '#fff9c4',
    },
    {
        name: 'Supplements',
        path: '/gustavo/health/supplements',
        icon: IconPill,
        bg: '#cdbfdb',
    },
    {
        name: 'Diet',
        path: '/gustavo/health/diet',
        icon: IconSalad,
        bg: '#c8e6c9',
    },
    {
        name: 'Symptoms',
        path: '/gustavo/health/symptoms',
        icon: IconFirstAidKit,
        bg: '#ffcdd2',
    },
]

// Each card is 1/3 of the row width minus gaps (gap = 6px = 0.75 MUI spacing)
const daysSinceCardWidth = 'calc((100% - 12px) / 3)'

/** Muscle groups organized by training split — push / pull / legs / other */
const DAYS_SINCE_ROWS: { label: string; groups: string[] }[] = [
    { label: 'Push', groups: ['Chest', 'Shoulders', 'Triceps'] },
    { label: 'Pull', groups: ['Upper Back', 'Biceps', 'Forearms'] },
    { label: 'Legs', groups: ['Legs', 'Lower Back'] },
    { label: 'Other', groups: ['Core', 'Cardio'] },
]

export default function HealthPage() {
    const [daysSince, setDaysSince] = useState<DaysSince[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const now = new Date()
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        fetch(`/api/health/workouts/days-since?today=${today}`)
            .then((res) => res.json())
            .then(setDaysSince)
            .catch((err) => console.error('Failed to fetch days since:', err))
            .finally(() => setLoading(false))
    }, [])

    const daysSinceMap = useMemo(() => {
        const map = new Map<string, DaysSince>()
        for (const item of daysSince) map.set(item.muscleGroup, item)
        return map
    }, [daysSince])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 600,
                paddingX: 2,
                paddingBottom: 2,
                gap: 3,
            }}>
            {/* Days Since Last Workout */}
            <Box>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: colors.primaryBrown,
                        mb: 1,
                    }}>
                    Days Since Last Workout
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {DAYS_SINCE_ROWS.map((row) => (
                            <Box key={row.label}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        gap: 0.75,
                                    }}>
                                    {row.groups.map((g) => (
                                        <Box
                                            key={g}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                width: daysSinceCardWidth,
                                                padding: '6px 8px',
                                                borderRadius: '4px',
                                                border: `1.5px solid ${colors.primaryBlack}20`,
                                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}20`,
                                                backgroundColor: `${colors.primaryBlack}05`,
                                            }}>
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: `${colors.primaryBlack}15`,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Box>
                                                <Typography sx={{ fontSize: 12, lineHeight: 1.2, color: 'transparent' }}>
                                                    &nbsp;
                                                </Typography>
                                                <Typography sx={{ fontSize: 11, lineHeight: 1.2, color: 'transparent' }}>
                                                    &nbsp;
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ) : daysSince.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>
                        No workouts logged yet. Start tracking!
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {DAYS_SINCE_ROWS.map((row) => (
                            <Box key={row.label}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        gap: 0.75,
                                    }}>
                                    {row.groups.map((groupName) => {
                                        const item = daysSinceMap.get(groupName)
                                        return (
                                            <Box
                                                key={groupName}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.75,
                                                    width: daysSinceCardWidth,
                                                    padding: '6px 8px',
                                                    borderRadius: '4px',
                                                    border: `1.5px solid ${getDaysSinceBorder(item?.daysSince ?? null)}`,
                                                    boxShadow: `1.5px 1.5px 0px ${getDaysSinceBorder(item?.daysSince ?? null)}`,
                                                    backgroundColor: getDaysSinceBg(item?.daysSince ?? null),
                                                }}>
                                                <Box
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        backgroundColor: getDaysSinceColor(item?.daysSince ?? null),
                                                        border: `1px solid ${colors.primaryBlack}`,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            lineHeight: 1.2,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}>
                                                        {groupName}
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 11,
                                                            color: colors.primaryBrown,
                                                            lineHeight: 1.2,
                                                        }}>
                                                        {formatDaysSince(item?.daysSince ?? null)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Tools */}
            <Box>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: colors.primaryBrown,
                        mb: 1,
                    }}>
                    Tools
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {tools.map((tool) => {
                        const Icon = tool.icon
                        return (
                            <Box
                                key={tool.name}
                                component={Link}
                                href={tool.path}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': 2,
                                    'padding': 2,
                                    ...cardSx,
                                    'textDecoration': 'none',
                                    'color': colors.primaryBlack,
                                    '&:active': {
                                        boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                        transform: 'translate(1px, 1px)',
                                    },
                                    'transition': 'box-shadow 0.1s, transform 0.1s',
                                }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        backgroundColor: tool.bg,
                                        border: `1.5px solid ${colors.primaryBlack}`,
                                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                        flexShrink: 0,
                                    }}>
                                    <Icon size={22} stroke={1.8} color={colors.primaryBlack} fill={colors.primaryWhite} />
                                </Box>
                                <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                                    {tool.name}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Box>
    )
}
