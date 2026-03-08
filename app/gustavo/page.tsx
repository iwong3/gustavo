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
        name: 'Expenses',
        href: '/gustavo/expenses/trips',
        icon: 'IconReceipt',
        color: colors.primaryGreen,
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

            {/* App grid — 2 square cards per row */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2,
                    width: '100%',
                }}>
                {apps.map((app) => (
                    <Box
                        key={app.name}
                        component={Link}
                        href={app.href}
                        sx={{
                            'display': 'flex',
                            'flexDirection': 'column',
                            'alignItems': 'center',
                            'justifyContent': 'center',
                            'gap': 1.5,
                            'aspectRatio': '1',
                            ...cardSx,
                            'textDecoration': 'none',
                            'color': colors.primaryBlack,
                            '&:active': {
                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                transform: 'translate(1px, 1px)',
                            },
                            'transition': 'box-shadow 0.1s, transform 0.1s',
                        }}>
                        {getTablerIcon({
                            name: app.icon,
                            size: 52,
                            color: app.color,
                        })}
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                            {app.name}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
