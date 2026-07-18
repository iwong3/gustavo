'use client'

import { colors, hardShadow } from '@/lib/colors'
import { getActiveTripTool, getTripSlug, tripTools } from '@/lib/trip-tools'
import type { TripSummary } from '@/lib/types'
import { Box, CircularProgress, Collapse, Drawer, Typography } from '@mui/material'
import {
    IconBarbell,
    IconChevronRight,
    IconHeartbeat,
    IconHome,
    IconList,
    IconFirstAidKit,
    IconPalette,
    IconPill,
    IconPlaneDeparture,
    IconSalad,
    IconScale,
    IconSettings,
} from '@tabler/icons-react'
import type { HealthSection } from '@/lib/health-section-order'
import { getSectionOrder, onSectionOrderChange } from '@/lib/health-section-order'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTrips } from 'utils/api'
import { getTablerIcon } from 'utils/icons'

const HEALTH_MENU_ITEMS: Record<HealthSection, { href: string; label: string; icon: React.ReactNode; isActive: (pathname: string) => boolean }> = {
    workouts: { href: '/gustavo/health/exercise', label: 'Workouts', icon: <IconBarbell size={14} stroke={2} color={colors.primaryBrown} fill={colors.primaryWhite} />, isActive: (p) => p === '/gustavo/health/exercise' },
    exercises: { href: '/gustavo/health/exercises', label: 'Exercises', icon: <IconList size={14} stroke={2} color={colors.primaryBrown} />, isActive: (p) => p.startsWith('/gustavo/health/exercises') },
    diet: { href: '/gustavo/health/diet', label: 'Diet', icon: <IconSalad size={14} stroke={2} color={colors.primaryBrown} />, isActive: (p) => p.startsWith('/gustavo/health/diet') },
    supplements: { href: '/gustavo/health/supplements', label: 'Supplements', icon: <IconPill size={14} stroke={2} color={colors.primaryBrown} fill={colors.primaryWhite} />, isActive: (p) => p.startsWith('/gustavo/health/supplements') },
    symptoms: { href: '/gustavo/health/symptoms', label: 'Symptoms', icon: <IconFirstAidKit size={14} stroke={2} color={colors.primaryBrown} />, isActive: (p) => p.startsWith('/gustavo/health/symptoms') },
    weight: { href: '/gustavo/health/weight', label: 'Weight', icon: <IconScale size={14} stroke={2} color={colors.primaryBrown} />, isActive: (p) => p.startsWith('/gustavo/health/weight') },
}

const DRAWER_WIDTH = 272

// Left/right padding for menu content rows
const CONTENT_PL = 2.5
const CONTENT_PR = 1.5

// Active-page treatment: full-row yellow band with hairline top/bottom rules.
// Transparent borders on inactive rows so toggling never shifts layout.
const bandSx = (active: boolean) =>
    ({
        backgroundColor: active ? colors.primaryYellow : 'transparent',
        borderTop: `1px solid ${active ? colors.primaryBlack : 'transparent'}`,
        borderBottom: `1px solid ${active ? colors.primaryBlack : 'transparent'}`,
    }) as const

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

/** Expand/collapse chevron — separate tap target beside a row's nav link */
function ExpandChevron({
    expanded,
    onClick,
}: {
    expanded: boolean
    onClick: () => void
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'justifyContent': 'center',
                'width': 34,
                'height': 34,
                'flexShrink': 0,
                'cursor': 'pointer',
                'borderRadius': '6px',
                'color': colors.primaryBrown,
                'transition': 'background-color 0.1s',
                '&:active': {
                    backgroundColor: `${colors.primaryBlack}0d`,
                },
            }}>
            <IconChevronRight
                size={15}
                stroke={2.5}
                style={{
                    transform: expanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s ease-out',
                }}
            />
        </Box>
    )
}

export type NavDrawerUser = {
    name?: string | null
    email?: string | null
    image?: string | null
}

type NavDrawerContentProps = {
    trips: TripSummary[]
    loading: boolean
    pathname: string
    user: NavDrawerUser | null
    onClose: () => void
}

/**
 * Drawer body — presentational; data arrives via props so the component
 * gallery can render it with fixtures. Mounted fresh on every drawer open
 * (temporary MUI Drawers unmount their children when closed), so the
 * "auto-expand the section you're in" state initializers re-run per open.
 */
export function NavDrawerContent({
    trips,
    loading,
    pathname,
    user,
    onClose,
}: NavDrawerContentProps) {
    const [pastExpanded, setPastExpanded] = useState(false)
    const [hasAutoExpanded, setHasAutoExpanded] = useState(false)
    // Auto-expand where you are: the drawer doubles as a "you are here" map
    const [expandedTripSlug, setExpandedTripSlug] = useState<string | null>(
        () => getTripSlug(pathname)
    )
    const [healthExpanded, setHealthExpanded] = useState(() =>
        pathname.startsWith('/gustavo/health')
    )
    const [healthSectionOrder, setHealthSectionOrder] = useState(getSectionOrder)

    useEffect(() => onSectionOrderChange(() => setHealthSectionOrder(getSectionOrder())), [])

    const now = new Date().toISOString().slice(0, 10)
    // Upcoming: soonest first (the next trip on top); past: most recent first
    const activeTrips = trips
        .filter((t) => t.endDate >= now)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
    const pastTrips = trips
        .filter((t) => t.endDate < now)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))

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

    // Scroll-edge fades — only shown when there is actually content beyond
    // the edge, so the list never looks faded at rest
    const scrollRef = useRef<HTMLDivElement>(null)
    const [fadeTop, setFadeTop] = useState(false)
    const [fadeBottom, setFadeBottom] = useState(false)
    const updateFades = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        setFadeTop(el.scrollTop > 2)
        setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 2)
    }, [])
    useEffect(() => {
        updateFades()
        // Re-measure after Collapse animations settle (300ms default)
        const t = setTimeout(updateFades, 350)
        return () => clearTimeout(t)
    }, [loading, expandedTripSlug, healthExpanded, pastExpanded, updateFades])

    // Top-level nav row
    const navItemSx = (active: boolean) =>
        ({
            'display': 'flex',
            'alignItems': 'center',
            'gap': 1.5,
            'pl': CONTENT_PL,
            'pr': CONTENT_PR,
            'py': 1,
            'textDecoration': 'none',
            'color': colors.primaryBlack,
            'fontWeight': active ? 700 : 500,
            'fontSize': 15,
            'lineHeight': 1,
            'transition': 'background-color 0.1s, transform 0.08s',
            ...bandSx(active),
            '&:active': {
                transform: active ? undefined : 'scale(0.97)',
            },
        }) as const

    // Sub-item row (health sections; also the base for trip name links)
    const subItemSx = (active: boolean) =>
        ({
            'display': 'flex',
            'alignItems': 'center',
            'gap': 1,
            'pl': 6.5,
            'pr': CONTENT_PR,
            'py': 0.9,
            'textDecoration': 'none',
            'color': active ? colors.primaryBlack : colors.primaryBrown,
            'fontWeight': active ? 700 : 400,
            'fontSize': 13,
            'lineHeight': 1,
            'transition': 'background-color 0.1s, transform 0.08s',
            ...bandSx(active),
            '&:active': {
                transform: active ? undefined : 'scale(0.97)',
            },
        }) as const

    // Per-trip tool row — indented one level past the trip name, colored chip
    const toolRowSx = (active: boolean) =>
        ({
            'display': 'flex',
            'alignItems': 'center',
            'gap': 1.25,
            'pl': 8,
            'pr': CONTENT_PR,
            'py': 0.6,
            'textDecoration': 'none',
            'color': colors.primaryBlack,
            'fontWeight': active ? 700 : 500,
            'fontSize': 13,
            'lineHeight': 1,
            'transition': 'background-color 0.1s, transform 0.08s',
            ...bandSx(active),
            '&:active': {
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

    // A trip row (link + expand chevron) plus its collapsible tool list
    const renderTrip = (trip: TripSummary, past: boolean) => {
        const base = `/gustavo/trips/${trip.slug}`
        const within = isWithin(base)
        const activeTool = within ? getActiveTripTool(pathname) : null
        const expanded = expandedTripSlug === trip.slug
        return (
            <Box key={trip.id}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        // Band on the trip row itself only when it IS the
                        // current page (no deeper tool row to carry it)
                        ...bandSx(within && !activeTool),
                    }}>
                    <Box
                        component={Link}
                        href={base}
                        onClick={onClose}
                        sx={{
                            ...subItemSx(false),
                            // Band lives on the wrapper; the link just styles text
                            backgroundColor: 'transparent',
                            borderTop: 'none',
                            borderBottom: 'none',
                            flex: 1,
                            minWidth: 0,
                            color: within
                                ? colors.primaryBlack
                                : colors.primaryBrown,
                            fontWeight: within ? 700 : 400,
                        }}>
                        <Box
                            sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                backgroundColor: past
                                    ? colors.primaryBrown
                                    : colors.primaryBlack,
                                opacity: past ? 0.5 : 1,
                                flexShrink: 0,
                            }}
                        />
                        <Box
                            sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                            {trip.name}
                        </Box>
                    </Box>
                    <ExpandChevron
                        expanded={expanded}
                        onClick={() =>
                            setExpandedTripSlug(expanded ? null : trip.slug)
                        }
                    />
                </Box>
                <Collapse in={expanded}>
                    {tripTools.map((tool) => {
                        const toolActive = activeTool?.path === tool.path
                        return (
                            <Box
                                key={tool.path}
                                component={Link}
                                href={`${base}/${tool.path}`}
                                onClick={onClose}
                                sx={toolRowSx(toolActive)}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 24,
                                        height: 24,
                                        borderRadius: '6px',
                                        border: `1.5px solid ${colors.primaryBlack}`,
                                        boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                        background: tool.bg,
                                        flexShrink: 0,
                                    }}>
                                    {getTablerIcon({
                                        name: tool.icon,
                                        size: 13,
                                        stroke: 2,
                                        color: colors.primaryBlack,
                                        fill: 'none',
                                    })}
                                </Box>
                                {tool.name}
                            </Box>
                        )
                    })}
                </Collapse>
            </Box>
        )
    }

    const healthActive = isExact('/gustavo/health')

    return (
        <>
            {/* Drawer header — fixed above the scroll area */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pl: CONTENT_PL,
                    pr: CONTENT_PR,
                    pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
                    pb: 2,
                    flexShrink: 0,
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

            {/* Nav items — scrolls between the fixed header and footer */}
            <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <Box
                    ref={scrollRef}
                    onScroll={updateFades}
                    sx={{
                        'height': '100%',
                        'overflowY': 'auto',
                        'display': 'flex',
                        'flexDirection': 'column',
                        'gap': 0.3,
                        'py': 1,
                        // Children must overflow (and scroll), never shrink —
                        // flex items default to shrink-to-fit and overlap
                        '& > *': { flexShrink: 0 },
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
                                fill={isExact('/gustavo') ? colors.secondaryYellow : colors.primaryWhite}
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
                                fill={isExact('/gustavo/trips') ? colors.secondaryYellow : colors.primaryWhite}
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
                            {activeTrips.map((trip) => renderTrip(trip, false))}

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
                                        Past trips ({pastTrips.length})
                                        <IconChevronRight
                                            size={14}
                                            stroke={2.5}
                                            color={colors.primaryBrown}
                                            style={{
                                                transform: pastExpanded
                                                    ? 'rotate(90deg)'
                                                    : 'none',
                                                transition: 'transform 0.15s ease-out',
                                            }}
                                        />
                                    </Box>
                                    <Collapse in={pastExpanded}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.3,
                                            }}>
                                            {pastTrips.map((trip) => renderTrip(trip, true))}
                                        </Box>
                                    </Collapse>
                                </>
                            )}
                        </>
                    )}

                    {/* Health — link + expandable section list */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mt: 0.5,
                            ...bandSx(healthActive),
                        }}>
                        <Box
                            component={Link}
                            href="/gustavo/health"
                            onClick={onClose}
                            sx={{
                                ...navItemSx(false),
                                backgroundColor: 'transparent',
                                borderTop: 'none',
                                borderBottom: 'none',
                                fontWeight: healthActive ? 700 : 500,
                                flex: 1,
                                minWidth: 0,
                            }}>
                            <IconBadge>
                                <IconHeartbeat
                                    size={17}
                                    stroke={2}
                                    color={colors.primaryBlack}
                                    fill={healthActive ? colors.secondaryYellow : colors.primaryWhite}
                                />
                            </IconBadge>
                            Health
                        </Box>
                        <ExpandChevron
                            expanded={healthExpanded}
                            onClick={() => setHealthExpanded((v) => !v)}
                        />
                    </Box>
                    <Collapse in={healthExpanded}>
                        {healthSectionOrder.map((section) => {
                            const item = HEALTH_MENU_ITEMS[section]
                            return (
                                <Box
                                    key={section}
                                    component={Link}
                                    href={item.href}
                                    onClick={onClose}
                                    sx={subItemSx(item.isActive(pathname))}>
                                    {item.icon}
                                    {item.label}
                                </Box>
                            )
                        })}
                    </Collapse>

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
                                fill={isWithin('/gustavo/settings') ? colors.secondaryYellow : colors.primaryWhite}
                            />
                        </IconBadge>
                        Settings
                    </Box>

                    {/* Component gallery — dev only (the route 404s in production) */}
                    {process.env.NODE_ENV === 'development' && (
                        <Box
                            component={Link}
                            href="/dev/gallery"
                            onClick={onClose}
                            sx={{ ...navItemSx(isWithin('/dev/gallery')), mt: 0.5 }}>
                            <IconBadge>
                                <IconPalette
                                    size={17}
                                    stroke={2}
                                    color={colors.primaryBlack}
                                    fill={isWithin('/dev/gallery') ? colors.secondaryYellow : colors.primaryWhite}
                                />
                            </IconBadge>
                            Gallery
                        </Box>
                    )}
                </Box>

                {/* Scroll-edge fades */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 14,
                        pointerEvents: 'none',
                        background: `linear-gradient(${colors.secondaryYellow}, ${colors.secondaryYellow}00)`,
                        opacity: fadeTop ? 1 : 0,
                        transition: 'opacity 0.15s',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 14,
                        pointerEvents: 'none',
                        background: `linear-gradient(${colors.secondaryYellow}00, ${colors.secondaryYellow})`,
                        opacity: fadeBottom ? 1 : 0,
                        transition: 'opacity 0.15s',
                    }}
                />
            </Box>

            {/* Account footer — pinned below the scroll area */}
            {user && (
                <Box
                    sx={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        borderTop: `1.5px solid ${colors.primaryBlack}`,
                        pl: 1.5,
                        pr: 1.5,
                        pt: 1.25,
                        pb: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
                    }}>
                    <Box
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: `1px solid ${colors.primaryBlack}`,
                            boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                            backgroundColor: colors.primaryBlue,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.primaryWhite,
                            fontSize: 12,
                            fontWeight: 700,
                        }}>
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name ?? 'Account'}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        ) : (
                            (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
                        )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                lineHeight: 1.2,
                                color: colors.primaryBlack,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                            {user.name ?? 'Signed in'}
                        </Typography>
                        {user.email && (
                            <Typography
                                sx={{
                                    fontSize: 10.5,
                                    lineHeight: 1.3,
                                    color: colors.primaryBrown,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                {user.email}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        sx={{
                            'flexShrink': 0,
                            'cursor': 'pointer',
                            'fontSize': 11.5,
                            'fontWeight': 700,
                            'color': colors.primaryRed,
                            'textDecoration': 'underline',
                            'py': 1,
                            'pl': 1,
                            '&:active': { opacity: 0.6 },
                        }}>
                        Sign out
                    </Box>
                </Box>
            )}
        </>
    )
}

type NavDrawerProps = {
    open: boolean
    onClose: () => void
    /** Raise above other overlays (default MUI drawer layer is 1200). */
    zIndex?: number
}

export default function NavDrawer({ open, onClose, zIndex }: NavDrawerProps) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [trips, setTrips] = useState<TripSummary[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (open) {
            setLoading(true)
            fetchTrips()
                .then(setTrips)
                .catch((err) => console.error('Failed to fetch trips:', err))
                .finally(() => setLoading(false))
        }
    }, [open])

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            sx={zIndex ? { zIndex } : undefined}
            slotProps={{
                paper: {
                    sx: {
                        width: DRAWER_WIDTH,
                        backgroundColor: colors.secondaryYellow,
                        borderRadius: 0,
                        boxShadow: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    },
                },
            }}>
            <NavDrawerContent
                trips={trips}
                loading={loading}
                pathname={pathname}
                user={session?.user ?? null}
                onClose={onClose}
            />
        </Drawer>
    )
}
