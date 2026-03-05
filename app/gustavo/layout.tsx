'use client'

import { Box, Tooltip, Typography } from '@mui/material'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useShallow } from 'zustand/react/shallow'
import {
    IconHome,
    IconReceipt,
    IconSettings,
} from '@tabler/icons-react'

import { ToolsMenu } from 'components/menu/tools/tools-menu'
import { ErrorConvertingToUSDGeneral } from 'utils/data-processing'
import { getTablerIcon } from 'utils/icons'
import { useTripsStore } from 'views/trips'

const tabs = [
    { label: 'Home', href: '/gustavo', icon: IconHome, matchExact: true },
    {
        label: 'Expenses',
        href: '/gustavo/expenses/trips',
        icon: IconReceipt,
        matchExact: false,
    },
    {
        label: 'Settings',
        href: '/gustavo/settings',
        icon: IconSettings,
        matchExact: true,
    },
]

export default function GustavoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const { currentTrip, loading, currencyConversionError } = useTripsStore(
        useShallow((state) => state)
    )

    const isHomePage = pathname === '/gustavo'
    const isTripsPage = pathname === '/gustavo/expenses/trips'
    const isTripDetail = pathname.startsWith('/gustavo/expenses/trips/')
    const isSettingsPage = pathname === '/gustavo/settings'

    const handleLogoClick = () => {
        router.push('/gustavo')
    }

    const getActiveTab = () => {
        if (pathname.startsWith('/gustavo/expenses')) return '/gustavo/expenses/trips'
        if (pathname === '/gustavo/settings') return '/gustavo/settings'
        return '/gustavo'
    }

    const activeTab = getActiveTab()

    const renderHeaderContent = () => {
        if (isHomePage || isTripsPage) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginLeft: 2,
                    }}>
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontFamily: 'Spectral',
                            lineHeight: '90%',
                        }}>
                        &quot;And a man, a man provides...
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontFamily: 'Spectral',
                            lineHeight: '90%',
                        }}>
                        &nbsp; ...your spending habits.&quot;
                    </Typography>
                </Box>
            )
        }

        if (isTripDetail) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        marginLeft: 2,
                    }}>
                    {currencyConversionError && (
                        <Tooltip
                            title={ErrorConvertingToUSDGeneral}
                            enterTouchDelay={0}
                            slotProps={{
                                popper: {
                                    modifiers: [
                                        {
                                            name: 'offset',
                                            options: {
                                                offset: [0, -12],
                                            },
                                        },
                                    ],
                                },
                                tooltip: {
                                    sx: {
                                        padding: 1,
                                        border: '1px solid #C1121F',
                                        fontSize: 12,
                                        color: 'black',
                                        fontStyle: 'italic',
                                        fontWeight: 600,
                                        backgroundColor: '#f4d35e',
                                        boxShadow:
                                            'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                                    },
                                },
                            }}>
                            <Box
                                sx={{
                                    marginRight: 1,
                                }}>
                                {getTablerIcon({
                                    name: 'IconExclamationCircle',
                                    fill: '#C1121F',
                                    color: '#F4D35E',
                                    size: 24,
                                })}
                            </Box>
                        </Tooltip>
                    )}
                    <Typography
                        onClick={handleLogoClick}
                        sx={{
                            fontSize: 18,
                            cursor: 'pointer',
                        }}>
                        {!loading && currentTrip}
                    </Typography>
                </Box>
            )
        }

        if (isSettingsPage) {
            return (
                <Typography
                    sx={{
                        fontSize: 18,
                        marginLeft: 2,
                    }}>
                    Settings
                </Typography>
            )
        }

        return null
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 450,
                }}>
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                        position: 'fixed',
                        top: 0,
                        maxWidth: 450,
                        backgroundColor: '#F4D35E',
                        zIndex: 10,
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            width: '100%',
                            marginTop: 2,
                            marginLeft: 2,
                            marginRight: 1,
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                            }}>
                            <Box
                                onClick={handleLogoClick}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                }}>
                                <img
                                    src="/gus-fring.png"
                                    alt="Gustavo"
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </Box>
                            {renderHeaderContent()}
                        </Box>
                        {isTripDetail && <ToolsMenu />}
                    </Box>
                </Box>

                {/* Main content */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        marginTop: '17%',
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
                        maxWidth: 450,
                        height: 64,
                        backgroundColor: '#F4D35E',
                        borderTop: '1px solid #E5C044',
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
                                    color: isActive ? '#000' : '#666',
                                    backgroundColor: isActive
                                        ? 'rgba(0,0,0,0.08)'
                                        : 'transparent',
                                    transition:
                                        'background-color 0.15s, color 0.15s',
                                }}>
                                <Icon
                                    size={22}
                                    stroke={isActive ? 2.2 : 1.5}
                                    color={isActive ? '#000' : '#666'}
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
    )
}
