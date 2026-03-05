'use client'

import { Box, Typography } from '@mui/material'
import Link from 'next/link'
import { getTablerIcon } from 'utils/icons'

const apps = [
    {
        name: 'Expenses',
        href: '/gustavo/expenses/trips',
        icon: 'IconCash',
        color: '#4CAF50',
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
                paddingX: 3,
                paddingTop: 4,
                gap: 3,
            }}>
            <Typography
                sx={{
                    fontSize: 22,
                    fontFamily: 'Spectral',
                    textAlign: 'center',
                }}>
                What would you like to do?
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    gap: 2,
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
                            'padding': 2.5,
                            'borderRadius': '12px',
                            'backgroundColor': '#FFFCEE',
                            'border': '1px solid #FBBC04',
                            'boxShadow':
                                'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px',
                            'textDecoration': 'none',
                            'color': 'inherit',
                            '&:hover': {
                                backgroundColor: '#FFF8D6',
                            },
                            'transition': 'background-color 0.2s ease-out',
                        }}>
                        {getTablerIcon({
                            name: app.icon,
                            size: 28,
                            color: app.color,
                        })}
                        <Typography sx={{ fontSize: 18, fontWeight: 500 }}>
                            {app.name}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
