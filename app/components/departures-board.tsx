'use client'

/**
 * DeparturesBoard — the Trips launcher reimagined as an airport split-flap board.
 *
 * Cycles through the group's trips (current → upcoming → past), flapping the trip
 * name, its date range, and a relative countdown into place with a time-based
 * status pill (Boarding / Scheduled / Arrived). Purely presentational +
 * gallery-importable: trips come in via props, `todayIso` pins "today" for
 * deterministic specimens. The whole card links to the trips page.
 *
 * Names are auto-shortened to fit the fixed board width — the year is stripped
 * (it reappears in the date row) and anything still too long is truncated at a
 * word boundary. The name row is a grid of flap tiles; the date/relative row is
 * plain scrambling text (no tiles) so the small type stays legible. All rows have
 * fixed slot counts so the board never reflows as trips cycle. Motion is polite:
 * honours prefers-reduced-motion (no scramble) and pauses while the tab is hidden.
 */
import { Box, Typography } from '@mui/material'
import { IconPlaneDeparture } from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { colors } from '@/lib/colors'
import type { TripSummary } from '@/lib/types'

type PassState = 'upcoming' | 'travelling' | 'complete'

// Monochrome-brown color scheme (Sand / Mocha / Sand). Retheme by editing this block.
const HEADER_BG = '#c9a877'
const PANEL_BG = '#866340'
const FOOTER_BG = '#c9a877'
const TILE_BG = '#f3ead6'
const META_TEXT = '#fbeed6'
const FOOTER_TEXT = '#4a3418'
const PILL_BG = '#f3ead6'
const PILL_TEXT = '#4a3418'
const CELLS = 14
// Alphabet the flaps roll through while settling. Final characters are set
// directly, so names/dates with chars outside this set (’, –) still land.
const FLAP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .'
const CYCLE_MS = 3200
const TICK_MS = 55

const STATUS_LABEL: Record<PassState, string> = {
    travelling: 'Boarding',
    upcoming: 'Scheduled',
    complete: 'Arrived',
}

const RANK: Record<PassState, number> = { travelling: 0, upcoming: 1, complete: 2 }

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const MS_PER_DAY = 86400000
const parseDay = (iso: string) => new Date(iso + 'T00:00:00')
const diffDays = (fromIso: string, toIso: string) =>
    Math.round((parseDay(toIso).getTime() - parseDay(fromIso).getTime()) / MS_PER_DAY)

const dd = (n: number) => String(n).padStart(2, '0')
const yy = (d: Date) => `’${String(d.getFullYear()).slice(-2)}`

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

/** Board-safe display name: uppercase, drop a trailing year, truncate on a word
 *  boundary if it still overflows the flap width. */
function boardName(name: string): string {
    let s = name.trim().toUpperCase()
    s = s.replace(/[\s,–-]*(?:(?:19|20)\d{2}|['’`]\d{2})$/, '').trim()
    if (s.length <= CELLS) return s
    let out = ''
    for (const word of s.split(/\s+/)) {
        const next = out ? `${out} ${word}` : word
        if (next.length > CELLS) break
        out = next
    }
    return out || s.slice(0, CELLS) // first word alone overflows → hard cut
}

/** Center a string into the fixed flap slots (spaces render as blank tiles). */
function centerName(name: string): string {
    const s = name.slice(0, CELLS)
    const left = Math.floor((CELLS - s.length) / 2)
    return ' '.repeat(left) + s + ' '.repeat(CELLS - s.length - left)
}

/** Compact US-style date range (month day, year); loosens spacing when it fits. */
function dateRange(startIso: string, endIso: string): string {
    const s = parseDay(startIso)
    const e = parseDay(endIso)
    const sm = MONTHS[s.getMonth()]
    const em = MONTHS[e.getMonth()]
    if (s.getFullYear() !== e.getFullYear()) {
        return `${sm}${dd(s.getDate())}${yy(s)}–${em}${dd(e.getDate())}${yy(e)}`
    }
    if (s.getMonth() !== e.getMonth()) {
        return `${sm} ${dd(s.getDate())}–${em} ${dd(e.getDate())} ${yy(s)}`
    }
    return `${sm} ${dd(s.getDate())}–${dd(e.getDate())} ${yy(s)}`
}

/** Days → months → years, as picked for the board's relative-time readout. */
function humanDelta(days: number): { n: number; unit: string } {
    if (days < 30) return { n: days, unit: days === 1 ? 'DAY' : 'DAYS' }
    const months = Math.round(days / 30)
    if (months < 12) return { n: months, unit: 'MO' }
    return { n: Math.round(days / 365), unit: 'YR' }
}

function relLabel(trip: TripSummary, today: string, state: PassState): string {
    if (state === 'travelling') {
        const days = Math.max(1, diffDays(trip.startDate, trip.endDate) + 1)
        const dayOfTrip = Math.min(days, Math.max(1, diffDays(trip.startDate, today) + 1))
        return `DAY ${dayOfTrip} / ${days}`
    }
    if (state === 'upcoming') {
        const d = diffDays(today, trip.startDate)
        if (d === 1) return 'TOMORROW'
        const { n, unit } = humanDelta(d)
        return `IN ${n} ${unit}`
    }
    const d = diffDays(trip.endDate, today)
    if (d === 1) return 'YESTERDAY'
    const { n, unit } = humanDelta(d)
    return `${n} ${unit} AGO`
}

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const randChar = () => FLAP_ALPHABET[Math.floor(Math.random() * FLAP_ALPHABET.length)]
const nextChar = (c: string) => {
    const i = FLAP_ALPHABET.indexOf(c)
    return FLAP_ALPHABET[(i + 1) % FLAP_ALPHABET.length] ?? randChar()
}

// Fixed slot counts so the board never reflows as trips cycle. The name row is a
// visible tile grid; the meta strings are padded (spaces are invisible as text).
const RANGE_SLOTS = 17
const REL_SLOTS = 11
const NAME_CELL = { w: 17, h: 27, fs: 15, gap: 2 }

/** Scrambles into `text` whenever it changes; shared by both row styles. */
function useFlap(text: string): string[] {
    const [chars, setChars] = useState<string[]>(() => text.split(''))

    useEffect(() => {
        const target = text.split('')
        if (prefersReducedMotion() || text.trim() === '') {
            setChars(target)
            return
        }
        const steps = target.map((_, i) => 3 + ((i * 3 + 4) % 8))
        const working = target.map((ch) => (ch === ' ' ? ' ' : randChar()))
        setChars(working.slice())
        const id = setInterval(() => {
            let done = true
            for (let i = 0; i < target.length; i++) {
                if (steps[i] > 0) {
                    done = false
                    steps[i] -= 1
                    working[i] = steps[i] === 0 ? target[i] : nextChar(working[i])
                }
            }
            setChars(working.slice())
            if (done) clearInterval(id)
        }, TICK_MS)
        return () => clearInterval(id)
    }, [text])

    return chars
}

/** The trip name — a run of split-flap tiles. */
function TileRow({ chars }: { chars: string[] }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: `${NAME_CELL.gap}px` }}>
            {chars.map((ch, i) => (
                <Box
                    key={i}
                    sx={{
                        width: NAME_CELL.w,
                        height: NAME_CELL.h,
                        lineHeight: `${NAME_CELL.h}px`,
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: NAME_CELL.fs,
                        fontWeight: 700,
                        color: colors.primaryBlack,
                        backgroundColor: TILE_BG,
                        border: `1px solid ${colors.primaryBlack}`,
                        borderRadius: '2px',
                    }}>
                    {ch === ' ' ? ' ' : ch}
                </Box>
            ))}
        </Box>
    )
}

/** The date range / countdown — plain scrambling monospace text, no tiles. */
function PlainRow({ chars }: { chars: string[] }) {
    return (
        <Box
            component="span"
            sx={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: META_TEXT,
                whiteSpace: 'pre',
            }}>
            {chars.join('')}
        </Box>
    )
}

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

    const current = count ? ordered[index % count] : null
    const state = current ? passState(current, today) : null
    const status = state ? STATUS_LABEL[state] : null

    const nameLine = centerName(boardName(current ? current.name : 'No trips yet'))
    const range = current ? dateRange(current.startDate, current.endDate) : ''
    const rel = current && state ? relLabel(current, today, state) : ''

    const nameChars = useFlap(nameLine)
    const rangeChars = useFlap(range.padEnd(RANGE_SLOTS).slice(0, RANGE_SLOTS))
    const relChars = useFlap(rel.padStart(REL_SLOTS).slice(-REL_SLOTS))

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
                    backgroundColor: HEADER_BG,
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
                    Departures
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
                            backgroundColor: PILL_BG,
                            color: PILL_TEXT,
                        }}>
                        {status}
                    </Typography>
                )}
            </Box>

            {/* Split-flap panel */}
            <Box sx={{ backgroundColor: PANEL_BG, paddingX: 1.5, paddingY: 1.25 }}>
                <TileRow chars={nameChars} />
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1,
                        marginTop: 1.25,
                    }}>
                    <PlainRow chars={rangeChars} />
                    <PlainRow chars={relChars} />
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
                    backgroundColor: FOOTER_BG,
                    color: FOOTER_TEXT,
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
                                    border: `1px solid ${FOOTER_TEXT}`,
                                    backgroundColor:
                                        i === index % count ? FOOTER_TEXT : 'transparent',
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
