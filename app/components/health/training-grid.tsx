'use client'

/**
 * TrainingGrid — the Health launcher as a 14-day training log.
 *
 * One row per muscle group, one column per day: a filled cell means that group
 * was trained that day. Rows are ordered by DAYS_SINCE_ROWS — the same constant
 * the health dashboard's recency grid reads — so the two surfaces can't drift.
 * Parent rollup matches the days-since endpoint: logging a target (Lats) fills
 * its parent group's row (Upper Back).
 *
 * The right gutter is a freshness dial. Training refills it; it drains to empty
 * over STALE_AFTER_DAYS. Empty *is* the alert — the drained ring, the red rim and
 * the pulsing chip all fire off that one threshold, so there's a single number to
 * tune rather than a decay rate plus a separate alert rule. "Never trained" stays
 * grey rather than red: it isn't the same failure as letting a group go cold, and
 * a fresh database shouldn't open with ten alarms.
 *
 * Colour encodes the push/pull/legs family the row order already implies — ten
 * unrelated hues would read as confetti. Cells are square via aspect-ratio (not a
 * fixed height) so they stay square if the window ever changes.
 *
 * Purely presentational + gallery-importable: data arrives via props and
 * `todayIso` pins "today" for deterministic specimens. The sweep plays once on
 * mount — it's an entrance, not an ambient loop — and honours reduced motion.
 */
import { Box, Typography } from '@mui/material'
import { IconBarbell } from '@tabler/icons-react'
import Link from 'next/link'
import { useMemo } from 'react'

import { colors } from '@/lib/colors'
import { DAYS_SINCE_ORDER, getParents, isGroup } from '@/lib/health/muscle-groups'
import type { DaysSince, Workout } from '@/lib/health-types'

/** Days of history shown. Cells are square, so this also sets the row height. */
export const TRAINING_WINDOW_DAYS = 14
/** A group drains to an empty dial — and into alert — after this many days. */
export const STALE_AFTER_DAYS = 7

// Panel palette (slate). Retheme by editing this block.
const HEADER_BG = '#c7d3d6'
const PANEL_BG = '#2b3238'
const LABEL_TEXT = '#dbe3e5'
const LABEL_NEVER = '#8b969b'
const AXIS_TEXT = '#7f8d94'
const CELL_EMPTY = 'rgba(255, 255, 255, 0.055)'
const TODAY_TINT = 'rgba(243, 208, 107, 0.16)'
const SWEEP_COLOR = '#f3d06b'

// Recency colours, tuned for the dark panel. Thresholds match the health
// dashboard's days-since cards (<=3 / <=6 / >6) so there's one mental model.
const FRESH = '#5fbf7a'
const DRIFTING = '#e8a33d'
const ALERT = '#ff6f63'
const NEVER = '#8a8a8a'

// One hue per push/pull/legs/other family, stepped in lightness so rows stay
// distinguishable while still reading as a block.
const GROUP_COLOR: Record<string, string> = {
    'Chest': '#c1443b',
    'Shoulders': '#cf5f52',
    'Triceps': '#dc7a6c',
    'Upper Back': '#4b6981',
    'Biceps': '#6f91aa',
    'Forearms': '#82a5be',
    'Legs': '#d98324',
    'Lower Back': '#e0a050',
    'Core': '#4f7a3a',
    'Cardio': '#2e8f86',
}
const FALLBACK_COLOR = '#8a9aa1'

// Row metrics. The playhead overlay is offset by the panel's own padding on top
// of these — an absolutely positioned child is placed against the padding box,
// so leaving it out double-counts nothing but starts the sweep inside the label.
const PANEL_PX = 12
const LABEL_W = 54
const GUTTER_W = 36
const COL_GAP = 8
const CELL_GAP = 1.5
const STEP_MS = 30
const SWEEP_MS = TRAINING_WINDOW_DAYS * STEP_MS

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Today in the user's own timezone (not UTC — `toISOString` would drift a day). */
export function localDateIso(): string {
    return toIso(new Date())
}

/** ISO date `n` days before today, local. */
export function isoDaysAgo(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return toIso(d)
}

/** The window's dates, oldest first. */
function windowDates(todayIso: string, days: number): string[] {
    const start = new Date(todayIso + 'T00:00:00')
    start.setDate(start.getDate() - (days - 1))
    const out: string[] = []
    for (let i = 0; i < days; i++) {
        out.push(toIso(start))
        start.setDate(start.getDate() + 1)
    }
    return out
}

function recencyColor(days: number | null): string {
    if (days === null) return NEVER
    if (days <= 3) return FRESH
    if (days <= 6) return DRIFTING
    return ALERT
}

/** How full the dial sits: 1 the day you train, 0 once the group is stale. */
function freshness(days: number | null): number {
    if (days === null) return 0
    return Math.max(0, 1 - Math.min(1, days / STALE_AFTER_DAYS))
}

/**
 * Which top-level groups a workout counts toward. Targets roll up to their
 * parents so the grid agrees with the days-since endpoint's SQL rollup.
 */
function groupsTrained(workout: Workout): Set<string> {
    const out = new Set<string>()
    for (const mg of workout.muscleGroups) {
        if (isGroup(mg.name)) out.add(mg.name)
        else for (const parent of getParents(mg.name)) out.add(parent)
    }
    return out
}

/** The freshness dial — drained ring plus a red rim once it hits empty. */
function Dial({ days }: { days: number | null }) {
    const r = 7.5
    const circumference = 2 * Math.PI * r
    const fill = freshness(days)
    const stale = days !== null && days >= STALE_AFTER_DAYS
    return (
        <svg viewBox="0 0 20 20" width={14} height={14} style={{ display: 'block' }} aria-hidden="true">
            <circle cx={10} cy={10} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={4} />
            {stale && <circle cx={10} cy={10} r={r} fill="none" stroke={ALERT} strokeWidth={1.2} />}
            {fill > 0 && (
                <circle
                    cx={10}
                    cy={10}
                    r={r}
                    fill="none"
                    stroke={recencyColor(days)}
                    strokeWidth={4}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - fill)}
                    transform="rotate(-90 10 10)"
                />
            )}
        </svg>
    )
}

export type TrainingGridProps = {
    /** Workouts covering at least the window. Extra history is ignored. */
    workouts: Workout[]
    /** Per-group recency. Drives the dials, so it can exceed the window. */
    daysSince: DaysSince[]
    /** Pin "today" (YYYY-MM-DD) — used by the gallery. Defaults to the real date. */
    todayIso?: string
    href?: string
}

export default function TrainingGrid({
    workouts,
    daysSince,
    todayIso,
    href = '/gustavo/health',
}: TrainingGridProps) {
    const today = todayIso ?? localDateIso()

    const { rows, dates, alertCount, neverCount, sessions } = useMemo(() => {
        const dates = windowDates(today, TRAINING_WINDOW_DAYS)
        const inWindow = new Set(dates)

        let sessions = 0
        const trained = new Map<string, Set<string>>()
        for (const workout of workouts) {
            if (!inWindow.has(workout.date)) continue
            sessions++
            for (const group of Array.from(groupsTrained(workout))) {
                let set = trained.get(group)
                if (!set) {
                    set = new Set<string>()
                    trained.set(group, set)
                }
                set.add(workout.date)
            }
        }

        const recency = new Map<string, number | null>(
            daysSince.map((d) => [d.muscleGroup, d.daysSince])
        )

        const rows = DAYS_SINCE_ORDER.map((name) => {
            const set = trained.get(name)
            return {
                name,
                color: GROUP_COLOR[name] ?? FALLBACK_COLOR,
                days: recency.get(name) ?? null,
                cells: dates.map((date) => set?.has(date) ?? false),
            }
        })

        const alertCount = rows.filter((r) => r.days !== null && r.days >= STALE_AFTER_DAYS).length
        const neverCount = rows.filter((r) => r.days === null).length
        return { rows, dates, alertCount, neverCount, sessions }
    }, [workouts, daysSince, today])

    // "Has ever trained" comes from days-since, which isn't window-limited — so a
    // quiet fortnight shows an empty grid with honest dials, and only a genuinely
    // untouched log gets the first-run call to action.
    const hasData = sessions > 0 || daysSince.some((d) => d.daysSince !== null)
    // "All fresh" has to mean it: with groups still untouched it would overclaim,
    // so those get counted out loud until every row has been trained at least once.
    const status = !hasData
        ? 'No data'
        : alertCount > 0
          ? `${alertCount} need work`
          : neverCount > 0
            ? `${neverCount} untouched`
            : 'All fresh'

    return (
        <Box
            component={Link}
            href={href}
            aria-label="Health"
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
                    <IconBarbell size={13} stroke={2.5} />
                    Last {TRAINING_WINDOW_DAYS} days
                </Typography>
                <Typography
                    sx={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        paddingX: 1,
                        paddingY: '2px',
                        borderRadius: 999,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        backgroundColor: colors.primaryWhite,
                        color: '#2b363c',
                        whiteSpace: 'nowrap',
                    }}>
                    {status}
                </Typography>
            </Box>

            {/* Grid panel. Keyframes live here and drive descendants, so the sweep
                definition and its use stay in one style object. */}
            <Box
                key={`${today}:${sessions}`}
                sx={{
                    'position': 'relative',
                    'backgroundColor': PANEL_BG,
                    'paddingX': `${PANEL_PX}px`,
                    'paddingTop': '11px',
                    'paddingBottom': '9px',
                    '@keyframes tgPop': {
                        from: { transform: 'scale(0.45)', opacity: 0 },
                        to: { transform: 'scale(1)', opacity: 1 },
                    },
                    '@keyframes tgSweep': {
                        from: { left: '0%', opacity: 0.9 },
                        to: { left: '100%', opacity: 0 },
                    },
                    '@keyframes tgPulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.45 },
                    },
                    '& .tg-on': {
                        animation: 'tgPop 240ms cubic-bezier(0.2, 0.8, 0.3, 1.4) both',
                    },
                    '& .tg-head': { animation: `tgSweep ${SWEEP_MS}ms linear both` },
                    '& .tg-alert-dial': { animation: 'tgPulse 2.2s ease-in-out infinite' },
                    '@media (prefers-reduced-motion: reduce)': {
                        '& .tg-on': { animation: 'none' },
                        '& .tg-head': { display: 'none' },
                        '& .tg-alert-dial': { animation: 'none' },
                    },
                }}>
                {rows.map((row) => {
                    const isAlert = row.days !== null && row.days >= STALE_AFTER_DAYS
                    return (
                        <Box
                            key={row.name}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: `${LABEL_W}px 1fr ${GUTTER_W}px`,
                                alignItems: 'center',
                                gap: `${COL_GAP}px`,
                                marginBottom: '4px',
                                '&:last-of-type': { marginBottom: 0 },
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    fontFamily: 'var(--font-mono, monospace)',
                                    letterSpacing: '0.02em',
                                    textTransform: 'uppercase',
                                    color: row.days === null ? LABEL_NEVER : LABEL_TEXT,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                {row.name}
                            </Typography>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${TRAINING_WINDOW_DAYS}, 1fr)`,
                                    gap: `${CELL_GAP}px`,
                                }}>
                                {row.cells.map((on, i) => (
                                    <Box
                                        key={dates[i]}
                                        className={on ? 'tg-on' : undefined}
                                        style={on ? { animationDelay: `${i * STEP_MS}ms` } : undefined}
                                        sx={{
                                            aspectRatio: '1',
                                            borderRadius: '2px',
                                            backgroundColor: on
                                                ? row.color
                                                : i === TRAINING_WINDOW_DAYS - 1
                                                  ? TODAY_TINT
                                                  : CELL_EMPTY,
                                            boxShadow: on
                                                ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.5)'
                                                : 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                                        }}
                                    />
                                ))}
                            </Box>

                            {/* Fixed dial column + centred number column: the dials
                                share one x, and the alert chip hugs its digits. */}
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '14px 19px',
                                    gap: '3px',
                                    alignItems: 'center',
                                    justifyItems: 'center',
                                }}>
                                <Box className={isAlert ? 'tg-alert-dial' : undefined} sx={{ display: 'block' }}>
                                    <Dial days={row.days} />
                                </Box>
                                <Typography
                                    sx={{
                                        fontSize: 8,
                                        fontWeight: 800,
                                        fontFamily: 'var(--font-mono, monospace)',
                                        fontVariantNumeric: 'tabular-nums',
                                        textAlign: 'center',
                                        lineHeight: 1,
                                        ...(isAlert
                                            ? {
                                                  backgroundColor: ALERT,
                                                  color: '#2b1310',
                                                  borderRadius: '3px',
                                                  padding: '2.5px',
                                              }
                                            : { color: recencyColor(row.days) }),
                                    }}>
                                    {row.days === null ? '—' : `${row.days}D`}
                                </Typography>
                            </Box>
                        </Box>
                    )
                })}

                {/* Axis */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: `${LABEL_W}px 1fr ${GUTTER_W}px`,
                        gap: `${COL_GAP}px`,
                        marginTop: '8px',
                    }}>
                    <span />
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 7.5,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono, monospace)',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: AXIS_TEXT,
                        }}>
                        <span>{TRAINING_WINDOW_DAYS} days ago</span>
                        <span>Today</span>
                    </Box>
                    <span />
                </Box>

                {/* Sweep overlay — spans exactly the cells column. Offset by the
                    panel's own padding: absolutely positioned children sit against
                    the padding box, so without it the bar starts inside the label. */}
                <Box
                    sx={{
                        position: 'absolute',
                        left: `${PANEL_PX + LABEL_W + COL_GAP}px`,
                        right: `${PANEL_PX + GUTTER_W + COL_GAP}px`,
                        top: '9px',
                        bottom: '20px',
                        pointerEvents: 'none',
                    }}>
                    <Box
                        className="tg-head"
                        sx={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: '1.5px',
                            borderRadius: '1px',
                            backgroundColor: SWEEP_COLOR,
                            opacity: 0,
                        }}
                    />
                </Box>
            </Box>

            {/* Footer — totals, or the first-run call to action */}
            {hasData ? (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingX: 1.5,
                        paddingY: 0.5,
                        borderTop: `1px solid ${colors.primaryBlack}`,
                        backgroundColor: HEADER_BG,
                        color: '#2b363c',
                        fontSize: 8.5,
                        fontWeight: 700,
                        letterSpacing: '0.13em',
                        textTransform: 'uppercase',
                    }}>
                    <span>Gus Strength</span>
                    <span>
                        {sessions} {sessions === 1 ? 'session' : 'sessions'}
                    </span>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 0.75,
                        paddingX: 1.5,
                        paddingY: 1,
                        borderTop: `1px solid ${colors.primaryBlack}`,
                        backgroundColor: colors.primaryYellow,
                        color: '#3a2c05',
                        fontSize: 9.5,
                        fontWeight: 800,
                        letterSpacing: '0.13em',
                        textTransform: 'uppercase',
                    }}>
                    Log your first workout →
                </Box>
            )}
        </Box>
    )
}
