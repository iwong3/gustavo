'use client'

import { colors, hardShadow } from '@/lib/colors'
import type { TripSummary } from '@/lib/types'
import { Box, CircularProgress, Collapse, Drawer, Typography } from '@mui/material'
import {
    IconBarbell,
    IconChevronDown,
    IconChevronRight,
    IconHeartbeat,
    IconHome,
    IconPill,
    IconPlaneDeparture,
    IconSettings,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { fetchTrips } from 'utils/api'

const DRAWER_WIDTH = 272

// Padding for menu content — used on non-active items to keep text aligned
// with active items that start flush left
const CONTENT_PL = 2.5 // left padding for content area
const CONTENT_PR = 1.5

type NavDrawerProps = {
    open: boolean
    onClose: () => void
}

/** Neo-brutalist icon badge — small rounded square with hard shadow */
function IconBadge({ children }: { children: React.ReactNode }) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '8px',
                backgroundColor: colors.primaryWhite,
                border: `1.5px solid ${colors.primaryBlack}`,
                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                flexShrink: 0,
            }}>
            {children}
        </Box>
    )
}

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
    const pathname = usePathname()
    const [trips, setTrips] = useState<TripSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [pastExpanded, setPastExpanded] = useState(false)
    const [hasAutoExpanded, setHasAutoExpanded] = useState(false)

    useEffect(() => {
        if (open) {
            setLoading(true)
            setHasAutoExpanded(false)
            fetchTrips()
                .then(setTrips)
                .catch((err) => console.error('Failed to fetch trips:', err))
                .finally(() => setLoading(false))
        }
    }, [open])

    const now = new Date().toISOString().slice(0, 10)
    const sorted = [...trips].sort((a, b) =>
        b.startDate.localeCompare(a.startDate)
    )
    const activeTrips = sorted.filter((t) => t.endDate >= now)
    const pastTrips = sorted.filter((t) => t.endDate < now)

    // Auto-expand past trips once after load if user is viewing a past trip
    useEffect(() => {
        if (!loading && !hasAutoExpanded && pastTrips.length > 0) {
            const onPast = pastTrips.some((t) =>
                pathname.startsWith(`/gustavo/trips/${t.slug}`)
            )
            setPastExpanded(onPast)
            setHasAutoExpanded(true)
        }
    }, [loading, hasAutoExpanded, pastTrips, pathname])

    const isExact = (href: string) => pathname === href
    const isWithin = (prefix: string) => pathname.startsWith(prefix)

    // Active highlight bar — flush left, rounded right, neo-brutalist border+shadow
    const activeBarSx = {
        backgroundColor: colors.primaryYellow,
        border: `1.5px solid ${colors.primaryBlack}`,
        borderLeft: 'none',
        boxShadow: `2px 2px 0px ${colors.primaryBlack}, 0px 2px 0px ${colors.primaryBlack}`,
        borderTopRightRadius: '4px',
        borderBottomRightRadius: '4px',
    } as const

    // Top-level nav row
    const navItemSx = (active: boolean) =>
        ({
            'display': 'flex',
            'alignItems': 'center',
            'gap': 1.5,
            'pl': CONTENT_PL,
            'pr': CONTENT_PR,
            'py': 1,
            'mr': active ? 1.5 : 0,
            'textDecoration': 'none',
            'color': colors.primaryBlack,
            'fontWeight': active ? 700 : 500,
            'fontSize': 15,
            'lineHeight': 1,
            'transition': 'background-color 0.1s, transform 0.08s',
            ...(active ? activeBarSx : {}),
            '&:active': {
                transform: active ? undefined : 'scale(0.97)',
            },
        }) as const

    // Trip sub-item — py matches nav items for consistent active bar height
    const tripItemSx = (active: boolean) =>
        ({
            'display': 'flex',
            'alignItems': 'center',
            'gap': 1,
            'pl': 6.5,
            'pr': CONTENT_PR,
            'py': 0.9,
            'mr': active ? 1.5 : 0,
            'textDecoration': 'none',
            'color': active ? colors.primaryBlack : colors.primaryBrown,
            'fontWeight': active ? 700 : 400,
            'fontSize': 13,
            'lineHeight': 1,
            'transition': 'background-color 0.1s, transform 0.08s',
            ...(active ? activeBarSx : {}),
            '&:active': {
                backgroundColor: active
                    ? colors.primaryYellow
                    : `${colors.primaryYellow}40`,
                transform: active ? undefined : 'scale(0.97)',
            },
        }) as const

    const sectionLabelSx = {
        display: 'flex',
        alignItems: 'center',
        pl: 6.5,
        pr: 2,
        py: 0.7,
        fontSize: 11,
        lineHeight: 1,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: colors.primaryBrown,
        userSelect: 'none',
    } as const

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: DRAWER_WIDTH,
                        backgroundColor: colors.secondaryYellow,
                        borderRadius: 0,
                        boxShadow: 'none',
                    },
                },
            }}>
            {/* Drawer header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pl: CONTENT_PL,
                    pr: CONTENT_PR,
                    pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
                    pb: 2,
                }}>
                <Box
                    sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        flexShrink: 0,
                        ...hardShadow,
                    }}>
                    <img
                        src="/gus-fring.png"
                        alt="Gustavo"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                        }}
                    />
                </Box>
                <Typography
                    sx={{
                        fontSize: 22,
                        fontWeight: 400,
                        fontFamily: 'var(--font-serif)',
                        color: colors.primaryBlack,
                    }}>
                    Gustavo
                </Typography>
            </Box>

            {/* Nav items */}
            <Box
                sx={{
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.3,
                    py: 1,
                }}>
                {/* Home */}
                <Box
                    component={Link}
                    href="/gustavo"
                    onClick={onClose}
                    sx={navItemSx(isExact('/gustavo'))}>
                    <IconBadge>
                        <IconHome
                            size={17}
                            stroke={2}
                            color={colors.primaryBlack}
                            fill={isExact('/gustavo') ? colors.secondaryYellow : 'none'}
                        />
                    </IconBadge>
                    Home
                </Box>

                {/* Trips */}
                <Box
                    component={Link}
                    href="/gustavo/trips"
                    onClick={onClose}
                    sx={navItemSx(isExact('/gustavo/trips'))}>
                    <IconBadge>
                        <IconPlaneDeparture
                            size={17}
                            stroke={2}
                            color={colors.primaryBlack}
                            fill={isExact('/gustavo/trips') ? colors.secondaryYellow : 'none'}
                        />
                    </IconBadge>
                    Trips
                </Box>

                {/* Trip sub-list */}
                {loading ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            py: 1.5,
                        }}>
                        <CircularProgress
                            size={18}
                            sx={{ color: colors.primaryYellow }}
                        />
                    </Box>
                ) : (
                    <>
                        {activeTrips.length > 0 && (
                            <Box sx={{ ...sectionLabelSx, mt: 0.8 }}>Upcoming trips</Box>
                        )}
                        {activeTrips.map((trip) => (
                            <Box
                                key={trip.id}
                                component={Link}
                                href={`/gustavo/trips/${trip.slug}`}
                                onClick={onClose}
                                sx={tripItemSx(
                                    isWithin(`/gustavo/trips/${trip.slug}`)
                                )}>
                                <Box
                                    sx={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: '50%',
                                        backgroundColor: colors.primaryBlack,
                                        flexShrink: 0,
                                    }}
                                />
                                {trip.name}
                            </Box>
                        ))}

                        {pastTrips.length > 0 && (
                            <>
                                <Box
                                    onClick={() => setPastExpanded((v) => !v)}
                                    sx={{
                                        ...sectionLabelSx,
                                        'justifyContent': 'space-between',
                                        'cursor': 'pointer',
                                        'transition': 'background-color 0.1s',
                                        '&:active': {
                                            backgroundColor: `${colors.primaryBlack}08`,
                                        },
                                    }}>
                                    Past trips
                                    {pastExpanded ? (
                                        <IconChevronDown
                                            size={14}
                                            stroke={2.5}
                                            color={colors.primaryBrown}
                                        />
                                    ) : (
                                        <IconChevronRight
                                            size={14}
                                            stroke={2.5}
                                            color={colors.primaryBrown}
                                        />
                                    )}
                                </Box>
                                <Collapse in={pastExpanded}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.3,
                                        }}>
                                        {pastTrips.map((trip) => (
                                            <Box
                                                key={trip.id}
                                                component={Link}
                                                href={`/gustavo/trips/${trip.slug}`}
                                                onClick={onClose}
                                                sx={tripItemSx(
                                                    isWithin(
                                                        `/gustavo/trips/${trip.slug}`
                                                    )
                                                )}>
                                                <Box
                                                    sx={{
                                                        width: 5,
                                                        height: 5,
                                                        borderRadius: '50%',
                                                        backgroundColor:
                                                            colors.primaryBrown,
                                                        opacity: 0.5,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                {trip.name}
                                            </Box>
                                        ))}
                                    </Box>
                                </Collapse>
                            </>
                        )}
                    </>
                )}

                {/* Health */}
                <Box
                    component={Link}
                    href="/gustavo/health"
                    onClick={onClose}
                    sx={{ ...navItemSx(isExact('/gustavo/health')), mt: 0.5 }}>
                    <IconBadge>
                        <IconHeartbeat
                            size={17}
                            stroke={2}
                            color={colors.primaryBlack}
                            fill={isExact('/gustavo/health') ? colors.secondaryYellow : 'none'}
                        />
                    </IconBadge>
                    Health
                </Box>

                {/* Health sub-items */}
                <Box
                    component={Link}
                    href="/gustavo/health/exercise"
                    onClick={onClose}
                    sx={tripItemSx(isWithin('/gustavo/health/exercise'))}>
                    <IconBarbell size={14} stroke={2} color={colors.primaryBrown} />
                    Exercise
                </Box>
                <Box
                    component={Link}
                    href="/gustavo/health/supplements"
                    onClick={onClose}
                    sx={tripItemSx(isWithin('/gustavo/health/supplements'))}>
                    <IconPill size={14} stroke={2} color={colors.primaryBrown} />
                    Supplements
                </Box>

                {/* Settings */}
                <Box
                    component={Link}
                    href="/gustavo/settings"
                    onClick={onClose}
                    sx={{ ...navItemSx(isWithin('/gustavo/settings')), mt: 0.5 }}>
                    <IconBadge>
                        <IconSettings
                            size={17}
                            stroke={2}
                            color={colors.primaryBlack}
                            fill={isWithin('/gustavo/settings') ? colors.secondaryYellow : 'none'}
                        />
                    </IconBadge>
                    Settings
                </Box>
            </Box>
        </Drawer>
    )
}
