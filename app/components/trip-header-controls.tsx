'use client'

import { Box, ClickAwayListener, Typography } from '@mui/material'
import { IconChevronDown } from '@tabler/icons-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTripBySlug } from 'utils/api'
import { getTablerIcon } from 'utils/icons'

import { colors, hardShadow } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import { getActiveTripTool, getTripSlug, tripTools } from '@/lib/trip-tools'

// Trip name + tool-switcher pill shown in the app header on trip tool pages.
// Reads the trip via the same query key as the trip layout, so no extra fetch.
export const TripHeaderControls = () => {
    const pathname = usePathname()
    const router = useRouter()

    const slug = getTripSlug(pathname)
    const activeTool = getActiveTripTool(pathname)

    const { data: trip } = useQuery({
        queryKey: queryKeys.trips.bySlug(slug ?? ''),
        queryFn: () => fetchTripBySlug(slug!),
        enabled: Boolean(slug),
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
                <Typography
                    onClick={() => handleSelect('details')}
                    sx={{
                        fontSize: 17,
                        fontFamily: 'var(--font-serif)',
                        color: colors.primaryBlack,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                        flexShrink: 1,
                        cursor: 'pointer',
                    }}>
                    {trip.name}
                </Typography>
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
