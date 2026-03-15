'use client'

import { cardSx, colors } from '@/lib/colors'
import type { DaysSince } from '@/lib/health-types'
import { Box, CircularProgress, Typography } from '@mui/material'
import { IconBarbell, IconPill } from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

function getDaysSinceColor(days: number | null): string {
    if (days === null) return '#9e9e9e'   // grey — never
    if (days <= 3) return '#4caf50'        // green
    if (days <= 6) return '#ff9800'        // orange
    return '#f44336'                       // red
}

function formatDaysSince(days: number | null): string {
    if (days === null) return 'Never'
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
}

const tools = [
    {
        name: 'Exercise',
        path: '/gustavo/health/exercise',
        icon: IconBarbell,
        bg: '#dae6a3',
    },
    {
        name: 'Supplements',
        path: '/gustavo/health/supplements',
        icon: IconPill,
        bg: '#cdbfdb',
    },
]

export default function HealthPage() {
    const [daysSince, setDaysSince] = useState<DaysSince[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/health/workouts/days-since')
            .then((res) => res.json())
            .then(setDaysSince)
            .catch((err) => console.error('Failed to fetch days since:', err))
            .finally(() => setLoading(false))
    }, [])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 600,
                paddingX: 2,
                paddingY: 2,
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={20} sx={{ color: colors.primaryYellow }} />
                    </Box>
                ) : daysSince.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>
                        No workouts logged yet. Start tracking!
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 0.75,
                        }}>
                        {daysSince.map((item) => (
                            <Box
                                key={item.muscleGroup}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    border: `1.5px solid ${colors.primaryBlack}`,
                                    boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    backgroundColor: colors.primaryWhite,
                                }}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: getDaysSinceColor(item.daysSince),
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
                                        {item.muscleGroup}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: 11,
                                            color: colors.primaryBrown,
                                            lineHeight: 1.2,
                                        }}>
                                        {formatDaysSince(item.daysSince)}
                                    </Typography>
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
