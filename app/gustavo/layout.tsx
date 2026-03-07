'use client'

import { Box, Typography } from '@mui/material'
import {
    IconArrowLeft,
    IconHome,
    IconReceipt,
    IconSettings,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { colors } from '@/lib/colors'
import { Fab } from '@mui/material'
import { IconPlus } from '@tabler/icons-react'
import { ClientOnly } from 'components/client-only'
import { FabProvider, useFab } from 'providers/fab-provider'

function ContentFab() {
    const { onClick } = useFab()
    if (!onClick) return null
    return (
        <Box
            sx={{
                position: 'fixed',
                top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
                bottom: `calc(64px + env(safe-area-inset-bottom, 0px))`,
                left: 0,
                right: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                padding: 2,
                zIndex: 5,
            }}>
            <Fab
                onClick={onClick}
                size="medium"
                sx={{
                    'pointerEvents': 'auto',
                    'backgroundColor': colors.primaryYellow,
                    '&:hover': { backgroundColor: colors.primaryYellow },
                }}>
                <IconPlus size={24} />
            </Fab>
        </Box>
    )
}

const HEADER_HEIGHT = 56

const tabs = [
    { label: 'Home', href: '/gustavo', icon: IconHome },
    { label: 'Expenses', href: '/gustavo/expenses/trips', icon: IconReceipt },
    { label: 'Settings', href: '/gustavo/settings', icon: IconSettings },
]

function getBackPath(pathname: string): string | null {
    if (pathname === '/gustavo') return null
    if (pathname === '/gustavo/expenses/trips') return '/gustavo'
    if (pathname.startsWith('/gustavo/expenses/trips/'))
        return '/gustavo/expenses/trips'
    if (pathname === '/gustavo/settings') return '/gustavo'
    if (pathname.startsWith('/gustavo/settings/')) return '/gustavo/settings'
    return '/gustavo'
}

export default function GustavoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()

    const isHomePage = pathname === '/gustavo'
    const backPath = getBackPath(pathname)
    const showIcons = !isHomePage

    const getActiveTab = () => {
        if (pathname.startsWith('/gustavo/expenses'))
            return '/gustavo/expenses/trips'
        if (pathname === '/gustavo/settings') return '/gustavo/settings'
        return '/gustavo'
    }

    const activeTab = getActiveTab()

    const iconSx = {
        'display': 'flex',
        'alignItems': 'center',
        'justifyContent': 'center',
        'cursor': 'pointer',
        'borderRadius': '50%',
        'padding': '6px',
        'opacity': showIcons ? 1 : 0,
        'pointerEvents': showIcons ? 'auto' : 'none',
        'transition':
            'opacity 0.3s ease-out, transform 0.1s ease-out, background-color 0.1s',
        '&:active': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            transform: 'scale(0.88)',
        },
    } as const

    return (
        <ClientOnly>
            <FabProvider>
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                        }}>
                        {/* Header — paddingTop accounts for notch/status bar in PWA standalone mode */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                height: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
                                paddingTop: 'env(safe-area-inset-top, 0px)',
                                px: 1,
                                position: 'fixed',
                                top: 0,
                                backgroundColor: colors.secondaryYellow,
                                zIndex: 10,
                            }}>
                            {/* Back icon */}
                            <Box
                                onClick={() =>
                                    backPath && router.push(backPath)
                                }
                                sx={iconSx}>
                                <IconArrowLeft
                                    size={28}
                                    stroke={1.8}
                                    color={colors.primaryBlack}
                                />
                            </Box>

                            {/* Gus Fring icon */}
                            <Box
                                onClick={() => router.push('/gustavo')}
                                sx={iconSx}>
                                <img
                                    src="/gus-fring.png"
                                    alt="Gustavo"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* Main content — fills space between header and bottom nav, scrolls within */}
                        <Box
                            id="main-scroll"
                            sx={{
                                position: 'fixed',
                                top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
                                bottom: `calc(64px + env(safe-area-inset-bottom, 0px))`,
                                left: 0,
                                right: 0,
                                overflowY: 'auto',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                            }}>
                            {children}
                        </Box>

                        {/* Safe-area fill — extends nav background into iOS home indicator area */}
                        <Box
                            sx={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: 'env(safe-area-inset-bottom, 0px)',
                                backgroundColor: colors.primaryYellow,
                                zIndex: 9,
                            }}
                        />

                        {/* Bottom tab bar */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-around',
                                alignItems: 'center',
                                position: 'fixed',
                                bottom: 0,
                                width: '100%',
                                height: `calc(64px + env(safe-area-inset-bottom, 0px))`,
                                paddingBottom:
                                    'env(safe-area-inset-bottom, 0px)',
                                backgroundColor: colors.primaryYellow,
                                borderTopLeftRadius: 32,
                                borderTopRightRadius: 32,
                                zIndex: 10,
                            }}>
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.href
                                const Icon = tab.icon
                                return (
                                    <Box
                                        key={tab.href}
                                        component={Link}
                                        href={tab.href}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 0.5,
                                            flex: 1,
                                            height: '100%',
                                            textDecoration: 'none',
                                            color: colors.primaryBrown,
                                            transition: 'color 0.15s',
                                        }}>
                                        <Icon
                                            size={22}
                                            stroke={isActive ? 2 : 1.5}
                                            fill={
                                                isActive
                                                    ? colors.secondaryYellow
                                                    : 'none'
                                            }
                                            color={
                                                isActive
                                                    ? colors.primaryBrown
                                                    : colors.primaryBrown
                                            }
                                        />
                                        <Typography
                                            sx={{
                                                fontSize: 11,
                                                fontWeight: isActive
                                                    ? 700
                                                    : 400,
                                                lineHeight: 1,
                                            }}>
                                            {tab.label}
                                        </Typography>
                                    </Box>
                                )
                            })}
                        </Box>
                        {/* FAB overlay — fixed to content area bounds, above scroll container */}
                        <ContentFab />
                    </Box>
                </Box>
            </FabProvider>
        </ClientOnly>
    )
}
