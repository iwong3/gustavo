'use client'

import { cardSx, colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import Link from 'next/link'
import { getTablerIcon } from 'utils/icons'

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    return 'evening'
}

const apps = [
    {
        name: 'Trips',
        href: '/gustavo/trips',
        icon: 'IconPlaneDeparture',
        bg: '#e8edca',
    },
    {
        name: 'Health',
        href: '/gustavo/health',
        icon: 'IconHeartbeat',
        bg: '#f0b8b4',
    },
]

export default function GustavoHomePage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                paddingX: 4,
            }}>
            {/* Gus Fring avatar */}
            <Box sx={{ paddingBottom: 1, paddingTop: 1 }}>
                <img
                    src="/gus-fring.png"
                    alt="Gustavo"
                    style={{
                        width: 96,
                        height: 96,
                        borderRadius: '100%',
                        objectFit: 'cover',
                        border: `4px solid ${colors.primaryWhite}`,
                        outline: `3px solid ${colors.primaryBlack}`,
                        boxShadow: `3px 4px 0px ${colors.primaryBlack}`,
                    }}
                />
            </Box>

            {/* Greeting */}
            <Typography
                sx={{
                    fontSize: 20,
                    fontFamily: 'var(--font-serif)',
                    textAlign: 'center',
                    paddingBottom: 4,
                }}>
                Good {getGreeting()}. We have work to do.
            </Typography>

            {/* App list — full-width stacked rows */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    width: '100%',
                }}>
                {apps.map((app) => (
                    <Box
                        key={app.name}
                        component={Link}
                        href={app.href}
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
                                backgroundColor: app.bg,
                                border: `1.5px solid ${colors.primaryBlack}`,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                flexShrink: 0,
                            }}>
                            {getTablerIcon({
                                name: app.icon,
                                size: 22,
                                stroke: 1.8,
                                color: colors.primaryBlack,
                                fill: colors.primaryWhite,
                            })}
                        </Box>
                        <Typography
                            sx={{
                                fontSize: 16,
                                fontWeight: 600,
                            }}>
                            {app.name}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
