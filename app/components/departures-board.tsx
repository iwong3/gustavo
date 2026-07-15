'use client'

/**
 * DeparturesBoard — the Trips launcher reimagined as an airport split-flap board.
 *
 * Cycles through the group's trips (current → upcoming → past), flapping each
 * trip name into place with a time-based status (Boarding / Scheduled / Arrived).
 * Purely presentational + gallery-importable: trips come in via props, `todayIso`
 * pins "today" for deterministic specimens. The whole card links to the trips page.
 *
 * Motion is polite: honours prefers-reduced-motion (no scramble — a gentle text
 * swap instead) and pauses the cycle while the tab is hidden.
 */
import { Box, Typography } from '@mui/material'
import { IconPlaneDeparture } from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

import { colors } from '@/lib/colors'
import type { TripSummary } from '@/lib/types'

type PassState = 'upcoming' | 'travelling' | 'complete'

// Flap-panel background — a lighter, warmer brown than the ink-heavy original.
const PANEL_BG = '#866340'
const CELLS = 14
// Scramble alphabet the flaps roll through while settling. Final characters are
// set directly, so names with chars outside this set (’, lowercase) still land.
const FLAP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .'
const CYCLE_MS = 3200
const TICK_MS = 55

const STATUS: Record<PassState, { label: string; bg: string; fg: string }> = {
    travelling: { label: 'Boarding', bg: colors.primaryYellow, fg: '#533b23' },
    upcoming: { label: 'Scheduled', bg: '#cdd9e3', fg: '#2f4256' },
    complete: { label: 'Arrived', bg: '#e8edca', fg: '#393a10' },
}

const RANK: Record<PassState, number> = { travelling: 0, upcoming: 1, complete: 2 }

const parseDay = (iso: string) => new Date(iso + 'T00:00:00')

const shortDate = (iso: string) =>
    parseDay(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()

function passState(trip: Pick<TripSummary, 'startDate' | 'endDate'>, today: string): PassState {
    if (today < trip.startDate) return 'upcoming'
    if (today > trip.endDate) return 'complete'
    return 'travelling'
}

// Most relevant first: currently travelling, then soonest upcoming, then most
// recently finished — so index 0 (the first thing shown) is the trip that matters.
function orderTrips(trips: TripSummary[], today: string): TripSummary[] {
    return [...trips].sort((a, b) => {
        const sa = passState(a, today)
        const sb = passState(b, today)
        if (RANK[sa] !== RANK[sb]) return RANK[sa] - RANK[sb]
        if (sa === 'complete') return b.endDate.localeCompare(a.endDate)
        return a.startDate.localeCompare(b.startDate)
    })
}

// Center a trip name into the fixed flap slots (truncating if it overflows).
function composeLine(name: string): string[] {
    const s = name.toUpperCase().slice(0, CELLS)
    const left = Math.floor((CELLS - s.length) / 2)
    return Array.from({ length: CELLS }, (_, i) => {
        const idx = i - left
        return idx >= 0 && idx < s.length ? s[idx] : ' '
    })
}

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type DeparturesBoardProps = {
    trips: TripSummary[]
    /** Pin "today" (YYYY-MM-DD) — used by the gallery. Defaults to the real date. */
    todayIso?: string
    href?: string
}

export default function DeparturesBoard({
    trips,
    todayIso,
    href = '/gustavo/trips',
}: DeparturesBoardProps) {
    const today = todayIso ?? new Date().toISOString().slice(0, 10)
    const ordered = useMemo(() => orderTrips(trips, today), [trips, today])
    const count = ordered.length

    const [index, setIndex] = useState(0)
    const [display, setDisplay] = useState<string[]>(() =>
        composeLine(count ? ordered[0].name : 'No trips yet')
    )
    const displayRef = useRef(display)
    const commit = (arr: string[]) => {
        displayRef.current = arr
        setDisplay(arr)
    }

    // Reset to the front whenever the trip set changes.
    useEffect(() => {
        setIndex(0)
    }, [count])

    // Auto-advance through the trips; pause while the tab is hidden.
    useEffect(() => {
        if (count <= 1) return
        const period = prefersReducedMotion() ? 5000 : CYCLE_MS
        let timer: ReturnType<typeof setInterval> | null = null
        const start = () => {
            if (!timer) timer = setInterval(() => setIndex((i) => (i + 1) % count), period)
        }
        const stop = () => {
            if (timer) {
                clearInterval(timer)
                timer = null
            }
        }
        const onVisibility = () => (document.hidden ? stop() : start())
        start()
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
            stop()
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [count])

    // Flap the current trip name into place.
    useEffect(() => {
        if (!count) return
        const target = composeLine(ordered[index % count].name)
        if (prefersReducedMotion()) {
            commit(target)
            return
        }
        const steps = target.map((_, i) => 4 + ((i * 3 + 5) % 10))
        const working = displayRef.current.slice()
        const id = setInterval(() => {
            let done = true
            for (let i = 0; i < CELLS; i++) {
                if (steps[i] > 0) {
                    done = false
                    steps[i]--
                    if (steps[i] === 0) {
                        working[i] = target[i]
                    } else {
                        const cur = FLAP_ALPHABET.indexOf(working[i])
                        working[i] = FLAP_ALPHABET[(cur + 1) % FLAP_ALPHABET.length] ?? ' '
                    }
                }
            }
            commit(working.slice())
            if (done) clearInterval(id)
        }, TICK_MS)
        return () => clearInterval(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, count, ordered])

    const current = count ? ordered[index % count] : null
    const state = current ? passState(current, today) : null
    const status = state ? STATUS[state] : null
    const dateLabel = current
        ? state === 'complete'
            ? `ARR ${shortDate(current.endDate)}`
            : `DEP ${shortDate(current.startDate)}`
        : ''

    return (
        <Box
            component={Link}
            href={href}
            aria-label="Trips"
            sx={{
                'position': 'relative',
                'display': 'block',
                'width': '100%',
                'border': `1px solid ${colors.primaryBlack}`,
                'borderRadius': '8px',
                'backgroundColor': colors.primaryWhite,
                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                'color': colors.primaryBlack,
                'textDecoration': 'none',
                'overflow': 'hidden',
                '&:active': {
                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                    transform: 'translate(1px, 1px)',
                },
                'transition': 'box-shadow 0.1s ease-out, transform 0.1s ease-out',
            }}>
            {/* Header strip */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    paddingX: 1.75,
                    minHeight: 34,
                    backgroundColor: colors.primaryYellow,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                }}>
                <Typography
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                    }}>
                    <IconPlaneDeparture size={13} stroke={2.5} />
                    Trips
                </Typography>
                {status && (
                    <Typography
                        sx={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            paddingX: 1,
                            paddingY: '2px',
                            borderRadius: 999,
                            border: `1.5px solid ${colors.primaryBlack}`,
                            backgroundColor: status.bg,
                            color: status.fg,
                        }}>
                        {status.label}
                    </Typography>
                )}
            </Box>

            {/* Split-flap panel */}
            <Box sx={{ backgroundColor: PANEL_BG, paddingX: 1.5, paddingY: 1.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                    {display.map((ch, i) => (
                        <Box
                            key={i}
                            sx={{
                                width: 17,
                                height: 26,
                                lineHeight: '26px',
                                textAlign: 'center',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: 14,
                                fontWeight: 700,
                                color: colors.primaryBlack,
                                backgroundColor: colors.secondaryYellow,
                                border: `1px solid ${colors.primaryBlack}`,
                                borderRadius: '2px',
                                boxShadow: 'inset 0 -2px 0 rgba(9,4,1,0.12)',
                            }}>
                            {ch === ' ' ? ' ' : ch}
                        </Box>
                    ))}
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 1,
                        color: colors.secondaryYellow,
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                    }}>
                    <span>GUS AIR</span>
                    <span>{dateLabel}</span>
                </Box>
            </Box>

            {/* Footer strip */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingX: 1.5,
                    paddingY: 0.5,
                    borderTop: `1px solid ${colors.primaryBlack}`,
                    color: colors.primaryBrown,
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                }}>
                <span>GUSTAVO INTL</span>
                {count > 1 && count <= 8 && (
                    <Box sx={{ display: 'flex', gap: '4px' }}>
                        {ordered.map((_, i) => (
                            <Box
                                key={i}
                                sx={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    border: `1px solid ${colors.primaryBrown}`,
                                    backgroundColor:
                                        i === index % count ? colors.primaryBrown : 'transparent',
                                }}
                            />
                        ))}
                    </Box>
                )}
                <span>
                    {count} {count === 1 ? 'TRIP' : 'TRIPS'}
                </span>
            </Box>
        </Box>
    )
}
