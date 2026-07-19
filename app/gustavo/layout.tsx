'use client'

import { Box, Typography } from '@mui/material'
import {
    IconArrowLeft,
    IconHeartbeat,
    IconHome,
    IconMenu2,
    IconPlaneDeparture,
    IconSettings,
    IconWorld,
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { tripTools } from '@/lib/trip-tools'

import { colors } from '@/lib/colors'
import { Fab } from '@mui/material'
import { IconPlus } from '@tabler/icons-react'
import { ClientOnly } from 'components/client-only'
import NavDrawer from 'components/nav-drawer'
import {
    PageActionBarProvider,
    usePageActionBarActive,
} from 'components/page-action-bar'
import { TripHeaderControls } from 'components/trip-header-controls'
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

// Run the fly-in before paint on the client (avoids a one-frame flash of the
// resting icon), but fall back to useEffect during SSR to dodge the layout-
// effect warning.
const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Bottom tab bar — hidden while a leaf page's PageActionBar occupies its slot
function BottomTabBar({ activeTab }: { activeTab: string }) {
    const actionBarActive = usePageActionBarActive()
    if (actionBarActive) return null
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                position: 'fixed',
                bottom: 0,
                width: '100%',
                height: `calc(64px + env(safe-area-inset-bottom, 0px))`,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
                                fontWeight: isActive ? 700 : 400,
                                lineHeight: 1,
                            }}>
                            {tab.label}
                        </Typography>
                    </Box>
                )
            })}
        </Box>
    )
}

// Header back button — static URL hierarchy derived from the pathname (not
// browser history), so back always goes "up" even after a deep link or
// refresh. Pages can override one hop with ?from=<trip-tool-path> (e.g. the
// insights list links expenses with ?from=graphs so back returns there).
function HeaderBackButton({ pathname }: { pathname: string }) {
    const searchParams = useSearchParams()

    let backHref: string | null = null
    // /gustavo/trips/<slug>/expenses/<id>/edit → expense detail
    const expenseEditMatch = pathname.match(
        /^\/gustavo\/trips\/([^/]+)\/expenses\/([^/]+)\/edit$/
    )
    // /gustavo/trips/<slug>/expenses/<id|new> → expenses list (or ?from tool)
    const expenseDetailMatch = pathname.match(
        /^\/gustavo\/trips\/([^/]+)\/expenses\/.+$/
    )
    // /gustavo/trips/<slug>/debts/<pair> → debts page
    const debtPairMatch = pathname.match(
        /^\/gustavo\/trips\/([^/]+)\/debts\/.+$/
    )
    // /gustavo/trips/<slug>/edit → trip details
    const tripEditMatch = pathname.match(
        /^\/gustavo\/trips\/([^/]+)\/edit$/
    )
    if (expenseEditMatch) {
        backHref = `/gustavo/trips/${expenseEditMatch[1]}/expenses/${expenseEditMatch[2]}`
    } else if (expenseDetailMatch) {
        const from = searchParams.get('from')
        // A pair drill-down links its expenses with ?from=debts&pair=<d>-<c>
        // so back returns to that specific pair, not the debts overview.
        const pair = searchParams.get('pair')
        if (from === 'debts' && pair && /^\d+-\d+$/.test(pair)) {
            backHref = `/gustavo/trips/${expenseDetailMatch[1]}/debts/${pair}`
        } else {
            const fromTool =
                from &&
                from !== 'expenses' &&
                tripTools.some((t) => t.path === from)
                    ? from
                    : null
            backHref = `/gustavo/trips/${expenseDetailMatch[1]}/${fromTool ?? 'expenses'}`
        }
    } else if (debtPairMatch) {
        backHref = `/gustavo/trips/${debtPairMatch[1]}/debts`
    } else if (tripEditMatch) {
        backHref = `/gustavo/trips/${tripEditMatch[1]}/details`
    }
    // /gustavo/trips/map (world map) → trips list. Explicit so it doesn't rely
    // on the legacy hub-URL branch treating "map" as a trip slug.
    else if (pathname === '/gustavo/trips/map') {
        backHref = '/gustavo/trips'
    }
    // /gustavo/trips/<slug>/<tool> → trips list
    else if (/^\/gustavo\/trips\/[^/]+\/.+$/.test(pathname)) {
        backHref = '/gustavo/trips'
    }
    // /gustavo/trips/[slug] (legacy hub URL) → trips list
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
                'textDecoration': 'none',
                'color': colors.primaryBlack,
                'backgroundColor': colors.primaryWhite,
                'border': `1px solid ${colors.primaryBlack}`,
                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                'transition': 'transform 0.1s, box-shadow 0.1s',
                '&:active': {
                    boxShadow: 'none',
                    transform: 'translate(2px, 2px)',
                },
            }}>
            <IconArrowLeft
                size={18}
                stroke={2}
            />
        </Box>
    )
}

const tabs = [
    { label: 'Home', href: '/gustavo', icon: IconHome },
    { label: 'Trips', href: '/gustavo/trips', icon: IconPlaneDeparture },
    { label: 'Health', href: '/gustavo/health', icon: IconHeartbeat },
    { label: 'Settings', href: '/gustavo/settings', icon: IconSettings },
]


export default function GustavoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isHome = pathname === '/gustavo'

    const [drawerOpen, setDrawerOpen] = useState(false)

    // Header menu button — hamburger on home (the page already shows a big Gus,
    // so a second one up here is redundant), Gus avatar everywhere else.
    const menuButtonRef = useRef<HTMLDivElement>(null)
    const prevPathRef = useRef(pathname)

    // Scroll main content to top on route change
    useEffect(() => {
        document.getElementById('main-scroll')?.scrollTo(0, 0)
    }, [pathname])

    // Gus morphs between the big home avatar and the corner menu icon as you
    // cross the home boundary. The header persists across routes, so we animate
    // the real elements (no clone / cross-route shared-element transition).
    // Layout effect so the first keyframe lands before the browser paints the
    // resting element — no flash.
    useIsomorphicLayoutEffect(() => {
        const prev = prevPathRef.current
        prevPathRef.current = pathname
        if (prev === pathname) return

        const leavingHome = prev === '/gustavo' && pathname !== '/gustavo'
        const arrivingHome = prev !== '/gustavo' && pathname === '/gustavo'
        if (!leavingHome && !arrivingHome) return

        const btn = menuButtonRef.current
        if (!btn || typeof btn.animate !== 'function') return
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            return

        const timing: KeyframeAnimationOptions = {
            duration: 380,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            // Hold the start keyframe until the start time resolves — no
            // sub-frame flash of the resting element.
            fill: 'backwards',
        }
        const fly = (
            el: HTMLElement,
            from: { x: number; y: number; scale: number },
            to: { x: number; y: number }
        ) =>
            el.animate(
                [
                    {
                        transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.scale})`,
                    },
                    { transform: 'translate(0, 0) scale(1)' },
                ],
                timing
            )

        const btnRect = btn.getBoundingClientRect()
        const btnCenter = {
            x: btnRect.left + btnRect.width / 2,
            y: btnRect.top + btnRect.height / 2,
        }

        if (leavingHome) {
            // The big home avatar is already unmounted; fly the header Gus in
            // from where it sat — centered, 8px below the scroll area's top
            // (paddingTop: 1), half of its 96px height down.
            const mainTop =
                document
                    .getElementById('main-scroll')
                    ?.getBoundingClientRect().top ?? HEADER_HEIGHT
            fly(
                btn,
                { x: window.innerWidth / 2, y: mainTop + 8 + 48, scale: 96 / 36 },
                btnCenter
            )
        } else {
            // Arriving home: grow the big avatar out of the corner menu button.
            // #main-scroll is a scroll container, so it clips anything above its
            // top edge (the header line) — animate a fixed-position clone on the
            // body instead, so the fly-up isn't cut off, and hide the real
            // avatar until the clone lands on it.
            const avatar = document.getElementById('home-gus-avatar')
            if (!avatar || typeof avatar.animate !== 'function') return
            const aRect = avatar.getBoundingClientRect()
            const clone = avatar.cloneNode(true) as HTMLElement
            clone.id = ''
            Object.assign(clone.style, {
                position: 'fixed',
                left: `${aRect.left}px`,
                top: `${aRect.top}px`,
                margin: '0',
                pointerEvents: 'none',
                zIndex: '2000',
            })
            document.body.appendChild(clone)
            avatar.style.visibility = 'hidden'

            const cleanup = () => {
                clone.remove()
                avatar.style.visibility = ''
            }
            const animation = fly(
                clone,
                { x: btnCenter.x, y: btnCenter.y, scale: 36 / 96 },
                {
                    x: aRect.left + aRect.width / 2,
                    y: aRect.top + aRect.height / 2,
                }
            )
            if (animation) {
                animation.onfinish = cleanup
                animation.oncancel = cleanup
            } else {
                cleanup()
            }
        }
    }, [pathname])

    const getActiveTab = () => {
        if (pathname.startsWith('/gustavo/trips')) return '/gustavo/trips'
        if (pathname.startsWith('/gustavo/health')) return '/gustavo/health'
        if (pathname.startsWith('/gustavo/settings'))
            return '/gustavo/settings'
        return '/gustavo'
    }

    const activeTab = getActiveTab()

    return (
        <>
            {/* Status-bar backdrop — deliberately OUTSIDE ClientOnly so it's in
                the SSR HTML: iOS 26+ no longer composites black-translucent
                live, it samples a fixed top element's background at render
                time. The real header below is client-gated and misses that
                sample (→ gray bar on iOS 26/27); this strip is present from
                first paint and always matches the header color. */}
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px))`,
                    backgroundColor: colors.secondaryYellow,
                    zIndex: 1,
                }}
            />
        <ClientOnly>
            <FabProvider>
                <PageActionBarProvider>
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
                                // Match the body content's 16px edge inset (paddingX: 2)
                                px: 2,
                                position: 'fixed',
                                top: 0,
                                backgroundColor: colors.secondaryYellow,
                                zIndex: 10,
                            }}>
                            {/* Menu button — opens nav drawer. Hamburger on the
                                home page (which already shows a big Gus), Gus
                                avatar on every other page. */}
                            <Box
                                ref={menuButtonRef}
                                onClick={() => setDrawerOpen(true)}
                                aria-label="Open menu"
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'justifyContent': 'center',
                                    'cursor': 'pointer',
                                    'borderRadius': '50%',
                                    'padding': '6px',
                                    // Pull the tap-target padding out of the inset
                                    // so the icon sits flush at 16px
                                    'marginLeft': '-6px',
                                    'transition':
                                        'transform 0.1s ease-out, background-color 0.1s',
                                    '&:active': {
                                        backgroundColor: 'rgba(0,0,0,0.1)',
                                        transform: 'scale(0.88)',
                                    },
                                }}>
                                {isHome ? (
                                    <IconMenu2
                                        size={28}
                                        stroke={2}
                                        color={colors.primaryBlack}
                                    />
                                ) : (
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
                                )}
                            </Box>

                            {/* Trip name + tool switcher (trip pages) / spacer */}
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingX: 0.5,
                                }}>
                                <TripHeaderControls />
                            </Box>

                            {/* Trips map — square button, same chrome as the
                                back button beside it. Only on the trips list
                                page; opens the "where we've been" map. Blue
                                globe reads as "explore". */}
                            {pathname === '/gustavo/trips' && (
                                <Box
                                    component={Link}
                                    href="/gustavo/trips/map"
                                    aria-label="Your trip map"
                                    sx={{
                                        'display': 'flex',
                                        'alignItems': 'center',
                                        'justifyContent': 'center',
                                        'width': 34,
                                        'height': 34,
                                        // gap between this and the back button
                                        'marginRight': 1,
                                        'flexShrink': 0,
                                        'borderRadius': '4px',
                                        'cursor': 'pointer',
                                        'textDecoration': 'none',
                                        'color': colors.primaryBlue,
                                        'backgroundColor': colors.primaryWhite,
                                        'border': `1px solid ${colors.primaryBlack}`,
                                        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                        'transition': 'transform 0.1s, box-shadow 0.1s',
                                        '&:active': {
                                            boxShadow: 'none',
                                            transform: 'translate(2px, 2px)',
                                        },
                                    }}>
                                    <IconWorld size={20} stroke={2} />
                                </Box>
                            )}

                            {/* Back button — shows on sub-pages.
                                useSearchParams needs a Suspense boundary */}
                            <Suspense fallback={null}>
                                <HeaderBackButton pathname={pathname} />
                            </Suspense>
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
                                // Never a horizontal scroller: with only
                                // overflowY set, overflowX computes to 'auto',
                                // so any child a pixel too wide lets iOS drag
                                // the whole page sideways. Wide content gets
                                // its own overflowX container instead.
                                overflowX: 'hidden',
                                // Opaque, matching the body: iOS 26+ samples
                                // fixed elements to tint its bars, and a big
                                // transparent fixed scroller invites a wrong
                                // (gray) sample. Same color → no visual change.
                                backgroundColor: colors.secondaryYellow,
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

                        {/* Bottom tab bar (hidden while a leaf page's action bar is up) */}
                        <BottomTabBar activeTab={activeTab} />
                        {/* FAB overlay — fixed to content area bounds, above scroll container */}
                        <ContentFab />
                    </Box>
                </Box>
                </PageActionBarProvider>
            </FabProvider>
        </ClientOnly>
        </>
    )
}
