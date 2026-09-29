'use client'

/**
 * The Workouts page's Calendar mode (presentational + gallery-importable):
 *
 *  - RoutineFilterChips: All + one chip per routine; the chosen one is yellow.
 *    Separate from the rotation tiles on purpose: those log a workout.
 *  - WorkoutCalendarCard: the Hub's rolling window (30D / 90D / 1Y on the
 *    card, ending today). 30D is a calendar of square days (day number + the
 *    routine's name, or ✓ when filtered; tap → that workout). 90D / 1Y are
 *    the Hub's weeks-as-columns heatmap. The chosen routine's days are filled;
 *    other workouts stay pale so you see what you did instead. Stats: the
 *    Hub's for All; times / avg gap / longest gap / since for a routine.
 *
 * Layout comes from lib/health/hub-window.ts (workoutWindow); routine stats
 * from lib/health/workout-days.ts.
 */
import { Box, Typography } from '@mui/material'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
    cardSx,
    colors,
    healthColors,
    pressShadowSx,
    pressTextSx,
    workoutColors,
} from '@/lib/colors'
import type { WorkoutPreset } from '@/lib/health-types'
import {
    workoutWindow,
    type HeatCell,
    type HubWindow,
} from '@/lib/health/hub-window'
import {
    addDaysIso,
    addMonths,
    daysBetween,
    monthCells,
    routineStats,
    type WorkoutDay,
} from '@/lib/health/workout-days'
import { AnimatedHeight } from 'components/animated-height'
import { CALENDAR_WINDOWS, type CalendarWindow } from './workouts-view-store'

import { captionSx } from './workout-log'

type Day = WorkoutDay<WorkoutPreset>
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MON = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
]
const HEAT_GAP: Record<HubWindow, number> = { '30d': 4, '90d': 3, '1y': 1.5 }
const numSx = { fontVariantNumeric: 'tabular-nums' } as const

// ── Filter chips ─────────────────────────────────────────────────────────────

export function RoutineFilterChips({
    presets,
    filter,
    onFilter,
}: {
    presets: WorkoutPreset[]
    filter: string
    onFilter: (filter: string) => void
}) {
    const options = [
        { id: 'all', name: 'All' },
        ...presets.map((p) => ({ id: String(p.id), name: p.name })),
    ]
    return (
        <Box
            sx={{
                'display': 'flex',
                'gap': 0.75,
                'overflowX': 'auto',
                'scrollbarWidth': 'none',
                '&::-webkit-scrollbar': { display: 'none' },
                // Room for the selected chip's shadow
                'paddingBottom': '2px',
                'paddingRight': '2px',
            }}>
            {options.map((o) => {
                const on = o.id === filter
                return (
                    <Box
                        key={o.id}
                        component="button"
                        type="button"
                        aria-pressed={on}
                        onClick={() => onFilter(o.id)}
                        sx={{
                            height: 30,
                            flexShrink: 0,
                            px: 1.25,
                            font: 'inherit',
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: colors.primaryBlack,
                            cursor: 'pointer',
                            borderRadius: '15px',
                            border: `1px solid ${colors.primaryBlack}`,
                            backgroundColor: on
                                ? colors.primaryYellow
                                : colors.primaryWhite,
                            boxShadow: on
                                ? `1.5px 1.5px 0px ${colors.primaryBlack}`
                                : 'none',
                            transition:
                                'background-color 0.15s, box-shadow 0.15s',
                        }}>
                        {o.name}
                    </Box>
                )
            })}
        </Box>
    )
}

// ── Cells ────────────────────────────────────────────────────────────────────

type Cell = HeatCell & {
    kind: 'hit' | 'other' | 'off' | 'pad' | 'future'
    day?: Day
}

function classify(
    cells: HeatCell[],
    byDate: Map<string, Day>,
    filter: string
): Cell[] {
    return cells.map((c) => {
        if (c.state === 'pad' || c.state === 'future')
            return { ...c, kind: c.state }
        const day = byDate.get(c.date)
        if (!day) return { ...c, kind: 'off' }
        const hit =
            filter === 'all' ||
            day.routines.some((r) => String(r.id) === filter)
        return { ...c, kind: hit ? 'hit' : 'other', day }
    })
}

/** Cardio-only days get the lighter orange in All (Jogging vs a lift). */
const isCardio = (day?: Day) => !!day && day.groups.every((g) => g === 'Cardio')

function fillFor(c: Cell, filter: string, small = false) {
    if (c.kind === 'hit')
        return filter === 'all' && isCardio(c.day)
            ? healthColors.workouts
            : small
              ? workoutColors.deep
              : workoutColors.fill
    if (c.kind === 'other')
        return small ? healthColors.workouts : workoutColors.light
    if (c.kind === 'off') return workoutColors.empty
    return 'transparent'
}

/** A day's name in the All calendar: its routine (+ when more), else a group. */
const dayName = (day: Day) =>
    day.routines.length
        ? day.routines[0].name + (day.routines.length > 1 ? '+' : '')
        : (day.groups[0] ?? '')

function SquareCalendar({
    cells,
    filter,
    onOpen,
}: {
    cells: Cell[]
    filter: string
    onOpen: (day: Day) => void
}) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '4px',
                padding: '3px',
            }}>
            {WEEKDAYS.map((d, i) => (
                <Typography
                    key={i}
                    sx={{ ...captionSx, fontSize: 9, textAlign: 'center' }}>
                    {d}
                </Typography>
            ))}
            {cells.map((c) => {
                const outside = c.kind === 'pad' || c.kind === 'future'
                const n = Number(c.date.slice(8))
                const tappable = !!c.day
                return (
                    <Box
                        key={c.date}
                        {...(tappable && {
                            'component': 'button' as const,
                            'type': 'button' as const,
                            'onClick': () => onOpen(c.day!),
                            'aria-label': `${c.date}: ${dayName(c.day!)}`,
                        })}
                        sx={{
                            position: 'relative',
                            aspectRatio: '1',
                            minWidth: 0,
                            padding: 0,
                            font: 'inherit',
                            border: 'none',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            paddingBottom: '5px',
                            cursor: tappable ? 'pointer' : 'default',
                            backgroundColor: fillFor(c, filter),
                            boxShadow:
                                c.kind === 'hit'
                                    ? `inset 0 0 0 1px ${workoutColors.deep}`
                                    : c.kind === 'other'
                                      ? `inset 0 0 0 1px ${workoutColors.emptyEdge}`
                                      : outside
                                        ? `inset 0 0 0 1px ${workoutColors.empty}`
                                        : 'none',
                            opacity: outside ? 0.5 : 1,
                            ...(c.today && {
                                outline: `1.5px solid ${colors.primaryBlack}`,
                                outlineOffset: 1,
                            }),
                            ...(tappable && {
                                '&:active': { filter: 'brightness(0.92)' },
                            }),
                        }}>
                        <Typography
                            component="span"
                            sx={{
                                ...numSx,
                                position: 'absolute',
                                top: 3,
                                left: 5,
                                fontSize: 10,
                                fontWeight: c.kind === 'hit' ? 700 : 500,
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                color:
                                    c.kind === 'hit'
                                        ? colors.primaryBlack
                                        : colors.primaryBrown,
                            }}>
                            {n === 1
                                ? `${MON[Number(c.date.slice(5, 7)) - 1]} 1`
                                : n}
                        </Typography>
                        {c.kind === 'hit' && c.day && (
                            <Typography
                                component="span"
                                sx={{
                                    maxWidth: 'calc(100% - 4px)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: filter === 'all' ? 9 : 12,
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    color: colors.primaryBlack,
                                }}>
                                {filter === 'all' ? dayName(c.day) : '✓'}
                            </Typography>
                        )}
                    </Box>
                )
            })}
        </Box>
    )
}

/** 90D / 1Y: the Hub's weeks-as-columns (Sunday at the top), square cells. */
function ColumnHeatmap({
    cells,
    weeks,
    monthLabels,
    window,
    filter,
}: {
    cells: Cell[]
    weeks: number
    monthLabels: { col: number; label: string }[]
    window: HubWindow
    filter: string
}) {
    const gap = HEAT_GAP[window]
    const small = window === '1y'
    const columns = `repeat(${weeks}, minmax(0, 1fr))`
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                padding: '3px',
            }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: columns,
                    columnGap: `${gap}px`,
                    height: 12,
                }}>
                {monthLabels.map((m) => (
                    <Typography
                        key={m.col}
                        sx={{
                            ...captionSx,
                            fontSize: 9,
                            letterSpacing: '0.06em',
                            gridColumn: `${m.col + 1} / span 4`,
                            whiteSpace: 'nowrap',
                        }}>
                        {small ? m.label[0] : m.label}
                    </Typography>
                ))}
            </Box>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: columns,
                    gridTemplateRows: 'repeat(7, auto)',
                    gridAutoFlow: 'column',
                    gap: `${gap}px`,
                }}>
                {cells.map((c) => (
                    <Box
                        key={c.date}
                        sx={{
                            aspectRatio: '1',
                            borderRadius: small ? '1px' : '3px',
                            visibility: c.kind === 'pad' ? 'hidden' : undefined,
                            backgroundColor: fillFor(c, filter, true),
                            boxShadow:
                                c.kind === 'future'
                                    ? `inset 0 0 0 1px ${workoutColors.empty}`
                                    : undefined,
                            ...(c.today && {
                                outline: `${small ? 1 : 1.5}px solid ${colors.primaryBlack}`,
                                outlineOffset: small ? 0 : 1,
                            }),
                        }}
                    />
                ))}
            </Box>
        </Box>
    )
}

// ── Card ─────────────────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography
                sx={{
                    ...numSx,
                    fontSize: 17,
                    fontWeight: 800,
                    lineHeight: 1.15,
                }}>
                {value}
            </Typography>
            <Typography sx={{ ...captionSx, fontSize: 9 }}>{label}</Typography>
        </Box>
    )
}

const fmtGap = (n: number | null) =>
    n == null ? '—' : `${Math.round(n * 10) / 10}d`

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]
const WINDOW_LABEL: Record<CalendarWindow, string> = {
    'month': 'Month',
    '90d': '90D',
    '1y': '1Y',
}

/** Month / 90D / 1Y as flat text tabs in the card's strip (a boxed toggle
 *  inside the boxed strip read as a box in a box). Full strip height, so
 *  each tab is a 38px tap target. The chosen one is bold, with one underline
 *  that slides to it (measured, since the labels differ in width); it snaps
 *  on first paint and under reduced motion. */
function WindowTabs({
    value,
    onChange,
}: {
    value: CalendarWindow
    onChange: (w: CalendarWindow) => void
}) {
    const listRef = useRef<HTMLDivElement>(null)
    const labelRefs = useRef<
        Partial<Record<CalendarWindow, HTMLSpanElement | null>>
    >({})
    const [bar, setBar] = useState<{
        left: number
        width: number
        top: number
    } | null>(null)
    const [animate, setAnimate] = useState(false)

    useLayoutEffect(() => {
        const measure = () => {
            const el = labelRefs.current[value]
            if (el)
                setBar({
                    left: el.offsetLeft,
                    width: el.offsetWidth,
                    top: el.offsetTop + el.offsetHeight,
                })
        }
        measure()
        // Web fonts landing (or a resize) move the labels
        const ro = new ResizeObserver(measure)
        if (listRef.current) ro.observe(listRef.current)
        return () => ro.disconnect()
    }, [value])
    // Only slide once it has been placed
    useEffect(() => {
        if (bar && !animate) requestAnimationFrame(() => setAnimate(true))
    }, [bar, animate])

    return (
        <Box
            ref={listRef}
            role="tablist"
            aria-label="Calendar range"
            sx={{
                position: 'relative',
                display: 'flex',
                alignSelf: 'stretch',
                flexShrink: 0,
            }}>
            {CALENDAR_WINDOWS.map((w) => {
                const on = w === value
                return (
                    <Box
                        key={w}
                        component="button"
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onChange(w)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            border: 'none',
                            background: 'none',
                            font: 'inherit',
                            cursor: 'pointer',
                            ...pressTextSx,
                        }}>
                        <Box
                            component="span"
                            ref={(el: HTMLSpanElement | null) => {
                                labelRefs.current[w] = el
                            }}
                            sx={{
                                fontSize: 11.5,
                                fontWeight: on ? 800 : 600,
                                letterSpacing: '0.04em',
                                lineHeight: 1.2,
                                // Room for the underline, so the text sits where it did
                                padding: '3px 0 5px',
                                color: on
                                    ? colors.primaryBlack
                                    : colors.primaryBrown,
                                transition: 'color 0.15s',
                            }}>
                            {WINDOW_LABEL[w]}
                        </Box>
                    </Box>
                )
            })}
            {bar && (
                <Box
                    aria-hidden
                    sx={{
                        'position': 'absolute',
                        'left': 0,
                        'top': bar.top - 2,
                        'width': bar.width,
                        'height': 2,
                        'borderRadius': '1px',
                        'backgroundColor': colors.primaryBlack,
                        'transform': `translateX(${bar.left}px)`,
                        // The app's sliding-toggle easing: fast start, soft landing
                        'transition': animate
                            ? 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), width 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)'
                            : 'none',
                        '@media (prefers-reduced-motion: reduce)': {
                            transition: 'none',
                        },
                        'pointerEvents': 'none',
                    }}
                />
            )}
        </Box>
    )
}

function NavArrow({
    dir,
    disabled,
    onClick,
}: {
    dir: 'prev' | 'next'
    disabled: boolean
    onClick: () => void
}) {
    const Icon = dir === 'prev' ? IconChevronLeft : IconChevronRight
    return (
        <Box
            component="button"
            type="button"
            aria-label={dir === 'prev' ? 'Previous month' : 'Next month'}
            disabled={disabled}
            onClick={onClick}
            sx={{
                width: 34,
                height: 34,
                padding: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '4px',
                border: `1px solid ${colors.primaryBlack}`,
                backgroundColor: colors.primaryWhite,
                boxShadow: disabled
                    ? 'none'
                    : `1.5px 1.5px 0px ${colors.primaryBlack}`,
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? 'default' : 'pointer',
                ...(!disabled && pressShadowSx),
            }}>
            <Icon size={16} stroke={2.4} color={colors.primaryBlack} />
        </Box>
    )
}

export function WorkoutCalendarCard({
    days,
    presets,
    today,
    filter,
    window,
    onWindowChange,
    month,
    onMonthChange,
    onOpen,
}: {
    days: Day[]
    presets: WorkoutPreset[]
    today: string
    filter: string
    window: CalendarWindow
    onWindowChange: (window: CalendarWindow) => void
    /** YYYY-MM on show in Month. */
    month: string
    onMonthChange: (month: string) => void
    onOpen: (day: Day) => void
}) {
    const dates = useMemo(() => days.map((d) => d.date), [days])
    const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
    const thisMonth = today.slice(0, 7)
    const firstMonth = days.length
        ? days[days.length - 1].date.slice(0, 7)
        : thisMonth

    // The range on show: a calendar month (up to today), or 90 / 365 days to today
    const monthView = useMemo(
        () =>
            window === 'month'
                ? monthCells(month, today, new Set(dates))
                : null,
        [window, month, today, dates]
    )
    const range = useMemo(() => {
        if (!monthView)
            return {
                from: addDaysIso(today, -((window === '90d' ? 90 : 365) - 1)),
                to: today,
            }
        return {
            from: monthView.first,
            to: monthView.last < today ? monthView.last : today,
        }
    }, [monthView, window, today])
    const n = daysBetween(range.to, range.from) + 1
    // A month after this one has nothing to count yet
    const future = n < 1
    // Summary numbers (All's stats) and the heatmap layout for 90D / 1Y
    const win = useMemo(
        () => workoutWindow(dates, range.to, Math.max(n, 1)),
        [dates, range.to, n]
    )
    const cells = useMemo(
        () =>
            classify(
                monthView ? monthView.cells : win.weeks.flat(),
                byDate,
                filter
            ),
        [monthView, win, byDate, filter]
    )
    const preset = presets.find((p) => String(p.id) === filter)
    const stats = useMemo(
        () => (preset ? routineStats(days, preset.id, range, today) : null),
        [preset, days, range, today]
    )
    const [y, m] = month.split('-').map(Number)

    return (
        <Box sx={{ ...cardSx, borderRadius: '8px', overflow: 'hidden' }}>
            <Box
                sx={{
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    pl: 1.5,
                    pr: 0.75,
                    backgroundColor: healthColors.workouts,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                    {preset ? preset.name : 'Every workout'}
                </Typography>
                <WindowTabs value={window} onChange={onWindowChange} />
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    padding: 1.25,
                }}>
                {window === 'month' && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                        }}>
                        <NavArrow
                            dir="prev"
                            disabled={month <= firstMonth}
                            onClick={() => onMonthChange(addMonths(month, -1))}
                        />
                        <Box
                            component="button"
                            type="button"
                            // Tap the month to jump back to this one
                            onClick={() => onMonthChange(thisMonth)}
                            disabled={month === thisMonth}
                            sx={{
                                border: 'none',
                                background: 'none',
                                font: 'inherit',
                                padding: '4px 8px',
                                cursor:
                                    month === thisMonth ? 'default' : 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                color: colors.primaryBlack,
                                ...(month !== thisMonth && pressTextSx),
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 15,
                                    fontWeight: 800,
                                    lineHeight: 1.2,
                                }}>
                                {MONTHS[m - 1]} {y}
                            </Typography>
                            {month !== thisMonth && (
                                <Typography
                                    sx={{
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        color: colors.primaryBrown,
                                        lineHeight: 1.2,
                                    }}>
                                    Back to this month
                                </Typography>
                            )}
                        </Box>
                        <NavArrow
                            dir="next"
                            disabled={month >= thisMonth}
                            onClick={() => onMonthChange(addMonths(month, 1))}
                        />
                    </Box>
                )}
                {/* A month's square days are much taller than the heatmaps */}
                <AnimatedHeight>
                    {window === 'month' ? (
                        <SquareCalendar
                            cells={cells}
                            filter={filter}
                            onOpen={onOpen}
                        />
                    ) : (
                        <ColumnHeatmap
                            cells={cells}
                            weeks={win.weeks.length}
                            monthLabels={win.monthLabels}
                            window={window}
                            filter={filter}
                        />
                    )}
                </AnimatedHeight>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: 1,
                        borderTop: `1px solid ${colors.primaryBlack}1f`,
                        pt: 1.25,
                    }}>
                    {stats ? (
                        <>
                            <Stat
                                value={future ? '—' : `${stats.times}×`}
                                label="times"
                            />
                            <Stat
                                value={fmtGap(stats.avgGap)}
                                label="avg gap"
                            />
                            <Stat
                                value={fmtGap(stats.longestGap)}
                                label="longest gap"
                            />
                            <Stat
                                value={
                                    stats.since == null
                                        ? '—'
                                        : stats.since === 0
                                          ? 'today'
                                          : `${stats.since}d`
                                }
                                label="since"
                            />
                        </>
                    ) : (
                        <>
                            <Stat
                                value={future ? '—' : String(win.worked)}
                                label="days"
                            />
                            <Stat
                                value={future ? '—' : win.perWeek.toFixed(1)}
                                label="per week"
                            />
                            <Stat
                                value={future ? '—' : `${win.pct}%`}
                                label="of days"
                            />
                            <Stat
                                value={
                                    !future && win.worked
                                        ? `${win.longestBreak}d`
                                        : '—'
                                }
                                label="longest break"
                            />
                        </>
                    )}
                </Box>
            </Box>
        </Box>
    )
}
