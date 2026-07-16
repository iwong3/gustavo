'use client'

import { Box, ClickAwayListener, Typography } from '@mui/material'
import { IconChevronDown } from '@tabler/icons-react'
import { usePathname, useRouter } from 'next/navigation'
import { useLayoutEffect, useRef, useState } from 'react'
import { getTablerIcon } from 'utils/icons'

import { useTripBySlug } from 'hooks/use-trip-by-slug'
import { colors, hardShadow } from '@/lib/colors'
import { getActiveTripTool, getTripSlug, tripTools } from '@/lib/trip-tools'

// Font-size / line-count steps tried in order until the trip name fits without
// truncating. 3 lines at 12.5px (~45px) still fits the 56px header row.
const TITLE_FIT_STEPS = [
    { fontSize: 17, lines: 1 },
    { fontSize: 15, lines: 2 },
    { fontSize: 12.5, lines: 3 },
]

// Trip name that steps down in font size and wraps onto more lines until the
// whole name is visible; only the last step still ellipsizes.
// Exported for the dev gallery.
export const FitTripName = ({
    name,
    onClick,
}: {
    name: string
    onClick: () => void
}) => {
    const ref = useRef<HTMLElement | null>(null)
    const [step, setStep] = useState(0)

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return

        const fit = () => {
            let chosen = TITLE_FIT_STEPS.length - 1
            for (let i = 0; i < TITLE_FIT_STEPS.length; i++) {
                const { fontSize, lines } = TITLE_FIT_STEPS[i]
                el.style.fontSize = `${fontSize}px`
                el.style.webkitLineClamp = String(lines)
                // scrollHeight is the full (unclamped) text height — count
                // lines from it; comparing against clientHeight directly
                // false-positives on sub-pixel line-height rounding
                const neededLines = Math.round(
                    el.scrollHeight / (fontSize * 1.2)
                )
                if (neededLines <= lines) {
                    chosen = i
                    break
                }
            }
            el.style.fontSize = `${TITLE_FIT_STEPS[chosen].fontSize}px`
            el.style.webkitLineClamp = String(TITLE_FIT_STEPS[chosen].lines)
            setStep(chosen)
        }

        fit()
        // Re-fit when available width changes (tool pill widths differ) and
        // once the serif webfont loads (metrics shift)
        const ro = new ResizeObserver(fit)
        if (el.parentElement) ro.observe(el.parentElement)
        document.fonts?.ready.then(fit).catch(() => {})
        return () => ro.disconnect()
    }, [name])

    return (
        <Typography
            ref={ref}
            onClick={onClick}
            sx={{
                fontSize: TITLE_FIT_STEPS[step].fontSize,
                fontFamily: 'var(--font-serif)',
                color: colors.primaryBlack,
                lineHeight: 1.2,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: TITLE_FIT_STEPS[step].lines,
                overflow: 'hidden',
                overflowWrap: 'anywhere',
                minWidth: 0,
                flexShrink: 1,
                cursor: 'pointer',
            }}>
            {name}
        </Typography>
    )
}

// Trip name + tool-switcher pill shown in the app header on trip tool pages.
// Reads the trip via the same query key as the trip layout, so no extra fetch.
export const TripHeaderControls = () => {
    const pathname = usePathname()
    const router = useRouter()

    const slug = getTripSlug(pathname)
    const activeTool = getActiveTripTool(pathname)

    // activeTool guard: non-tool routes like /trips/new (slug "new") and
    // /trips/<slug>/edit render no header controls — don't fetch for them
    const { data: trip } = useTripBySlug(slug, {
        enabled: Boolean(slug) && Boolean(activeTool),
    })

    const [menuOpen, setMenuOpen] = useState(false)

    // Close the switcher whenever the route changes (covers back/forward
    // navigation) — state-adjustment-during-render, not an effect
    const [prevPathname, setPrevPathname] = useState(pathname)
    if (prevPathname !== pathname) {
        setPrevPathname(pathname)
        setMenuOpen(false)
    }

    if (!slug || !activeTool) return null

    const handleSelect = (path: string) => {
        setMenuOpen(false)
        if (path !== activeTool.path) {
            router.push(`/gustavo/trips/${slug}/${path}`)
        }
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                flex: 1,
            }}>
            {/* Trip name — taps through to the trip details page */}
            {trip && (
                <FitTripName
                    name={trip.name}
                    onClick={() => handleSelect('details')}
                />
            )}

            {/* Tool pill + dropdown — hugs the right edge, next to the back
                button, so its position is consistent across trip names */}
            <ClickAwayListener onClickAway={() => setMenuOpen(false)}>
                <Box
                    sx={{
                        position: 'relative',
                        flexShrink: 0,
                        marginLeft: 'auto',
                        // 4px here + the wrapper's 4px paddingX = 8px to the
                        // back button, matching the search→filter gap
                        marginRight: 0.5,
                    }}>
                    <Box
                        onClick={() => setMenuOpen((o) => !o)}
                        sx={{
                            'display': 'inline-flex',
                            'alignItems': 'center',
                            'gap': 0.75,
                            'paddingX': 1.25,
                            // Same height as the header back button
                            'height': 34,
                            'background': activeTool.bg,
                            ...hardShadow,
                            'borderRadius': '4px',
                            'cursor': 'pointer',
                            'userSelect': 'none',
                            '&:active': {
                                boxShadow: 'none',
                                transform: 'translate(2px, 2px)',
                            },
                            'transition': 'transform 0.1s, box-shadow 0.1s',
                        }}>
                        {getTablerIcon({
                            name: activeTool.icon,
                            size: 18,
                            stroke: 2,
                            color: colors.primaryBlack,
                            fill: colors.primaryWhite,
                        })}
                        <Typography
                            sx={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: colors.primaryBlack,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                whiteSpace: 'nowrap',
                            }}>
                            {activeTool.name}
                        </Typography>
                        <IconChevronDown
                            size={14}
                            stroke={2.5}
                            style={{
                                transform: menuOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s',
                            }}
                        />
                    </Box>

                    {/* Dropdown */}
                    {menuOpen && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                right: 0,
                                zIndex: 20,
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 170,
                                backgroundColor: colors.primaryWhite,
                                border: `1.5px solid ${colors.primaryBlack}`,
                                borderRadius: '6px',
                                boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                                overflow: 'hidden',
                            }}>
                            {tripTools.map((tool, i) => {
                                const isActive = tool.path === activeTool.path
                                return (
                                    <Box
                                        key={tool.path}
                                        onClick={() => handleSelect(tool.path)}
                                        sx={{
                                            'display': 'flex',
                                            'alignItems': 'center',
                                            'gap': 1.25,
                                            'paddingX': 1.5,
                                            'paddingY': 1,
                                            'cursor': 'pointer',
                                            'backgroundColor': isActive
                                                ? colors.secondaryYellow
                                                : colors.primaryWhite,
                                            'borderBottom':
                                                i < tripTools.length - 1
                                                    ? `1px solid ${colors.primaryBlack}20`
                                                    : 'none',
                                            '&:active': {
                                                backgroundColor:
                                                    colors.primaryYellow,
                                            },
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                background: tool.bg,
                                                border: `1px solid ${colors.primaryBlack}`,
                                                flexShrink: 0,
                                            }}>
                                            {getTablerIcon({
                                                name: tool.icon,
                                                size: 16,
                                                stroke: 1.8,
                                                color: colors.primaryBlack,
                                                fill: colors.primaryWhite,
                                            })}
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontSize: 14,
                                                fontWeight: isActive ? 700 : 500,
                                                color: colors.primaryBlack,
                                            }}>
                                            {tool.name}
                                        </Typography>
                                    </Box>
                                )
                            })}
                        </Box>
                    )}
                </Box>
            </ClickAwayListener>
        </Box>
    )
}
