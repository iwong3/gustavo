'use client'

import { Box, Typography } from '@mui/material'
import {
    IconArrowLeft,
    IconHome,
    IconPlaneDeparture,
    IconSettings,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { colors } from '@/lib/colors'
import { Fab } from '@mui/material'
import { IconPlus } from '@tabler/icons-react'
import { ClientOnly } from 'components/client-only'
import NavDrawer from 'components/nav-drawer'
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
    { label: 'Trips', href: '/gustavo/trips', icon: IconPlaneDeparture },
    { label: 'Settings', href: '/gustavo/settings', icon: IconSettings },
]


export default function GustavoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const [drawerOpen, setDrawerOpen] = useState(false)

    // Scroll main content to top on route change
    useEffect(() => {
        document.getElementById('main-scroll')?.scrollTo(0, 0)
    }, [pathname])

    const getActiveTab = () => {
        if (pathname.startsWith('/gustavo/trips')) return '/gustavo/trips'
        if (pathname.startsWith('/gustavo/health')) return '/gustavo'
        if (pathname.startsWith('/gustavo/settings'))
            return '/gustavo/settings'
        return '/gustavo'
    }

    const activeTab = getActiveTab()

    return (
        <ClientOnly>
            <FabProvider>
                <NavDrawer
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                />
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
                                width: '100%',
                                height: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
                                paddingTop: 'env(safe-area-inset-top, 0px)',
                                px: 1,
                                position: 'fixed',
                                top: 0,
                                backgroundColor: colors.secondaryYellow,
                                zIndex: 10,
                            }}>
                            {/* Gus Fring icon — opens nav drawer */}
                            <Box
                                onClick={() => setDrawerOpen(true)}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'justifyContent': 'center',
                                    'cursor': 'pointer',
                                    'borderRadius': '50%',
                                    'padding': '6px',
                                    'transition':
                                        'transform 0.1s ease-out, background-color 0.1s',
                                    '&:active': {
                                        backgroundColor: 'rgba(0,0,0,0.1)',
                                        transform: 'scale(0.88)',
                                    },
                                }}>
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

                            {/* Spacer */}
                            <Box sx={{ flex: 1 }} />

                            {/* Back button — shows on sub-pages */}
                            {(() => {
                                // Determine back URL for nested pages
                                let backHref: string | null = null
                                // /gustavo/trips/<slug>/<tool> → trip hub
                                const tripMatch = pathname.match(
                                    /^\/gustavo\/trips\/([^/]+)\/.+$/
                                )
                                if (tripMatch) {
                                    backHref = `/gustavo/trips/${tripMatch[1]}`
                                }
                                // /gustavo/trips/[slug] (trip hub) → trips list
                                else if (/^\/gustavo\/trips\/[^/]+$/.test(pathname)) {
                                    backHref = '/gustavo/trips'
                                }
                                // /gustavo/trips → home
                                else if (pathname === '/gustavo/trips') {
                                    backHref = '/gustavo'
                                }
                                // /gustavo/health/<sub> → health
                                else if (/^\/gustavo\/health\/.+$/.test(pathname)) {
                                    backHref = '/gustavo/health'
                                }
                                // /gustavo/health → home
                                else if (pathname === '/gustavo/health') {
                                    backHref = '/gustavo'
                                }
                                // /gustavo/settings/<sub> → settings
                                else if (/^\/gustavo\/settings\/.+$/.test(pathname)) {
                                    backHref = '/gustavo/settings'
                                }
                                // /gustavo/settings → home
                                else if (pathname === '/gustavo/settings') {
                                    backHref = '/gustavo'
                                }
                                if (!backHref) return null
                                return (
                                    <Box
                                        component={Link}
                                        href={backHref}
                                        sx={{
                                            'display': 'flex',
                                            'alignItems': 'center',
                                            'justifyContent': 'center',
                                            'width': 34,
                                            'height': 34,
                                            'borderRadius': '4px',
                                            'cursor': 'pointer',
                                            'marginRight': 0.5,
                                            'textDecoration': 'none',
                                            'color': colors.primaryBlack,
                                            'backgroundColor':
                                                colors.primaryWhite,
                                            'border': `1px solid ${colors.primaryBlack}`,
                                            'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                            'transition':
                                                'transform 0.1s, box-shadow 0.1s',
                                            '&:active': {
                                                boxShadow: 'none',
                                                transform:
                                                    'translate(2px, 2px)',
                                            },
                                        }}>
                                        <IconArrowLeft
                                            size={18}
                                            stroke={2}
                                        />
                                    </Box>
                                )
                            })()}
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
