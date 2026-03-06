'use client'

import { Box, Typography } from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    IconHome,
    IconReceipt,
    IconSettings,
    IconArrowLeft,
} from '@tabler/icons-react'

import { ClientOnly } from 'components/client-only'
import { colors } from '@/lib/colors'


const HEADER_HEIGHT = 56

const tabs = [
    { label: 'Home', href: '/gustavo', icon: IconHome },
    { label: 'Expenses', href: '/gustavo/expenses/trips', icon: IconReceipt },
    { label: 'Settings', href: '/gustavo/settings', icon: IconSettings },
]

function getBackPath(pathname: string): string | null {
    if (pathname === '/gustavo') return null
    if (pathname === '/gustavo/expenses/trips') return '/gustavo'
    if (pathname.startsWith('/gustavo/expenses/trips/')) return '/gustavo/expenses/trips'
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
        if (pathname.startsWith('/gustavo/expenses')) return '/gustavo/expenses/trips'
        if (pathname === '/gustavo/settings') return '/gustavo/settings'
        return '/gustavo'
    }

    const activeTab = getActiveTab()

    const iconSx = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        borderRadius: '50%',
        padding: '6px',
        opacity: showIcons ? 1 : 0,
        pointerEvents: showIcons ? 'auto' : 'none',
        transition: 'opacity 0.3s ease-out, transform 0.1s ease-out, background-color 0.1s',
        '&:active': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            transform: 'scale(0.88)',
        },
    } as const

    return (
        <ClientOnly>
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
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        height: HEADER_HEIGHT,
                        px: 1,
                        position: 'fixed',
                        top: 0,
                        backgroundColor: colors.secondaryYellow,
                        zIndex: 10,
                    }}>
                    {/* Back icon */}
                    <Box
                        onClick={() => backPath && router.push(backPath)}
                        sx={iconSx}>
                        <IconArrowLeft size={28} stroke={1.8} color={colors.primaryBlack} />
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

                {/* Main content */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        marginTop: `${HEADER_HEIGHT}px`,
                        marginBottom: '80px',
                    }}>
                    {children}
                </Box>

                {/* Bottom tab bar */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        alignItems: 'center',
                        position: 'fixed',
                        bottom: 0,
                        width: '100%',
                        height: 64,
                        backgroundColor: colors.primaryYellow,
                        borderTop: `3px solid ${colors.primaryRed}`,
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
                                    color: isActive ? colors.primaryBlack : colors.primaryBrown,
                                    backgroundColor: isActive
                                        ? 'rgba(0,0,0,0.08)'
                                        : 'transparent',
                                    transition: 'background-color 0.15s, color 0.15s',
                                }}>
                                <Icon
                                    size={22}
                                    stroke={isActive ? 2.2 : 1.5}
                                    color={isActive ? colors.primaryBlack : colors.primaryBrown}
                                />
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: isActive ? 700 : 400,
                                        lineHeight: 1,
                                    }}>
                                    {tab.label}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Box>
        </ClientOnly>
    )
}
