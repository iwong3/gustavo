/**
 * The Health hub's rolling windows (30D / 90D / 1Y, always ending today) and
 * what each module draws from them: the workout-day heatmap + stats, the
 * weight line, and the supplement runs that overlap the window.
 *
 * Positions are fractions of the window (0 = its first day, 1 = today) so the
 * components can lay them out at any width. Dates are ISO YYYY-MM-DD.
 * Pure + leaf (no component imports) — the page and the gallery both build
 * from it; tested in tests/hub-window.test.ts.
 */
import type { Run } from './supplement-runs'

export const HUB_WINDOWS = ['30d', '90d', '1y'] as const
export type HubWindow = (typeof HUB_WINDOWS)[number]

export const WINDOW_DAYS: Record<HubWindow, number> = { '30d': 30, '90d': 90, '1y': 365 }
export const WINDOW_LABEL: Record<HubWindow, string> = { '30d': '30D', '90d': '90D', '1y': '1Y' }

export const isHubWindow = (v: unknown): v is HubWindow =>
    typeof v === 'string' && (HUB_WINDOWS as readonly string[]).includes(v)

const DAY_MS = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const toDay = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d) / DAY_MS
}
const toIso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => toIso(toDay(iso) + n)
const daysBetween = (from: string, to: string) => toDay(to) - toDay(from)
/** Monday = 0 … Sunday = 6. */
const weekday = (iso: string) => (new Date(toDay(iso) * DAY_MS).getUTCDay() + 6) % 7

/** The window's first day (`days` days long, today included). */
export const windowStart = (today: string, days: number) => addDays(today, -(days - 1))

/** Where a date sits in the window: 0 = first day, 1 = today. */
const frac = (start: string, date: string, days: number) =>
    days <= 1 ? 1 : daysBetween(start, date) / (days - 1)

/** Each month's 1st inside the window — gridlines + axis labels. */
export function monthStarts(today: string, days: number): { x: number; label: string }[] {
    const start = windowStart(today, days)
    const out: { x: number; label: string }[] = []
    for (let i = 1; i < days; i++) {
        const date = addDays(start, i)
        if (date.endsWith('-01')) out.push({ x: frac(start, date, days), label: MONTHS[Number(date.slice(5, 7)) - 1] })
    }
    return out
}

// ── Workouts ────────────────────────────────────────────────────────────────

export type HeatCell = {
    date: string
    /** pad: before the window (fills the first week); future: after today. */
    state: 'on' | 'off' | 'pad' | 'future'
    today: boolean
}

export type WorkoutWindow = {
    /** Heatmap columns, oldest first; each is one Mon→Sun week. */
    weeks: HeatCell[][]
    /** Month names over the heatmap: the week column each month starts in. */
    monthLabels: { col: number; label: string }[]
    worked: number
    days: number
    perWeek: number
    /** Share of the window's days with a workout, 0–100. */
    pct: number
    /** Most days in a row without one (today only counts once it's over). */
    longestBreak: number
}

/** Month labels need this many columns between them to not collide. */
const LABEL_GAP_COLS = 3

export function workoutWindow(workoutDates: Iterable<string>, today: string, days: number): WorkoutWindow {
    const trained = new Set(workoutDates)
    const start = windowStart(today, days)
    const lead = weekday(start)

    const cells: HeatCell[] = []
    for (let i = lead; i > 0; i--) cells.push({ date: addDays(start, -i), state: 'pad', today: false })

    let worked = 0
    let run = 0
    let longestBreak = 0
    for (let i = 0; i < days; i++) {
        const date = addDays(start, i)
        const on = trained.has(date)
        if (on) {
            worked++
            run = 0
        } else if (date !== today) {
            run++
            longestBreak = Math.max(longestBreak, run)
        }
        cells.push({ date, state: on ? 'on' : 'off', today: date === today })
    }
    while (cells.length % 7) {
        cells.push({ date: addDays(today, cells.length - lead - days + 1), state: 'future', today: false })
    }

    const weeks: HeatCell[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

    // The first column is labelled with the window's opening month, unless a
    // month starts close enough to crowd it
    const monthLabels: { col: number; label: string }[] = []
    weeks.forEach((week, col) => {
        const inWindow = week.filter((c) => c.state === 'on' || c.state === 'off')
        const firstOfMonth = inWindow.find((c) => c.date.endsWith('-01'))
        const date = firstOfMonth?.date ?? (col === 0 ? inWindow[0]?.date : undefined)
        if (!date) return
        const prev = monthLabels[monthLabels.length - 1]
        if (prev && col - prev.col < LABEL_GAP_COLS) {
            // A real month start beats the window-opening label
            if (prev.col === 0 && firstOfMonth) monthLabels.pop()
            else return
        }
        monthLabels.push({ col, label: MONTHS[Number(date.slice(5, 7)) - 1] })
    })

    return {
        weeks,
        monthLabels,
        worked,
        days,
        perWeek: Math.round((worked / days) * 7 * 10) / 10,
        pct: Math.round((worked / days) * 100),
        longestBreak,
    }
}

// ── Weight ──────────────────────────────────────────────────────────────────

export type WeightPoint = { x: number; lbs: number }

export type WeightSeries = {
    points: WeightPoint[]
    /** The latest weigh-in in the window (the end dot). */
    last: WeightPoint
    /** Latest minus the window's first weigh-in. */
    delta: number
    /** Gridline values (bottom → top), on half-pound steps. */
    ticks: [number, number, number]
}

/** Past this many days the line plots weekly averages (plus the latest). */
const WEEKLY_AFTER_DAYS = 120

export function weightSeries(
    logs: { date: string; weightLbs: number | string | null; createdAt?: string }[],
    today: string,
    days: number
): WeightSeries | null {
    const start = windowStart(today, days)
    // One reading per day — the last one logged
    const byDate = new Map<string, { lbs: number; at: string }>()
    for (const l of logs) {
        // Number(null) is 0 — a missing reading must not plot as 0 lb
        const lbs = l.weightLbs === null || l.weightLbs === '' ? NaN : Number(l.weightLbs)
        if (l.date < start || l.date > today || !Number.isFinite(lbs)) continue
        const prev = byDate.get(l.date)
        const at = l.createdAt ?? ''
        if (!prev || at >= prev.at) byDate.set(l.date, { lbs, at })
    }
    const daily = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ x: frac(start, date, days), lbs: v.lbs, i: daysBetween(start, date) }))
    if (daily.length === 0) return null

    const lastDaily = daily[daily.length - 1]
    let points: WeightPoint[] = daily.map(({ x, lbs }) => ({ x, lbs }))
    if (days > WEEKLY_AFTER_DAYS) {
        points = []
        for (let s = 0; s < days; s += 7) {
            const week = daily.filter((p) => p.i >= s && p.i < s + 7)
            if (!week.length) continue
            const avg = week.reduce((sum, p) => sum + p.lbs, 0) / week.length
            const mid = week.reduce((sum, p) => sum + p.x, 0) / week.length
            points.push({ x: mid, lbs: avg })
        }
        if (points[points.length - 1].x < lastDaily.x) points.push({ x: lastDaily.x, lbs: lastDaily.lbs })
    }

    const values = points.map((p) => p.lbs)
    let lo = Math.floor(Math.min(...values) * 2) / 2
    let hi = Math.ceil(Math.max(...values) * 2) / 2
    if (hi - lo < 1) {
        lo -= 0.5
        hi += 0.5
    }

    return {
        points,
        last: { x: lastDaily.x, lbs: lastDaily.lbs },
        delta: lastDaily.lbs - daily[0].lbs,
        ticks: [lo, (lo + hi) / 2, hi],
    }
}

// ── Supplements ─────────────────────────────────────────────────────────────

export type RunBar = {
    /** Window fractions; a one-day run has start === end. */
    start: number
    end: number
    live: boolean
    /** Began before the window (drawn without a rounded left end). */
    clipped: boolean
}

export type RunRow = {
    supplementId: number
    name: string
    bars: RunBar[]
    /** Day X of the current run; null = not in the stack now. */
    dayOfRun: number | null
}

/**
 * One row per supplement with a daily-stack run inside the window. Current
 * runs first, longest-running on top; then stopped ones, most recent first.
 */
export function runRows(
    supplements: { supplementId: number; name: string; runs: Run[] }[],
    today: string,
    days: number
): RunRow[] {
    const start = windowStart(today, days)
    const rows: (RunRow & { sortKey: string })[] = []
    for (const s of supplements) {
        const bars: RunBar[] = []
        for (const r of s.runs) {
            const end = r.end ?? today
            if (end < start || r.start > today) continue
            const from = r.start < start ? start : r.start
            bars.push({ start: frac(start, from, days), end: frac(start, end, days), live: r.end === null, clipped: r.start < start })
        }
        if (!bars.length) continue
        const current = s.runs.find((r) => r.end === null)
        const lastEnd = s.runs.reduce((max, r) => (r.end && r.end > max ? r.end : max), '')
        rows.push({
            supplementId: s.supplementId,
            name: s.name,
            bars,
            dayOfRun: current ? daysBetween(current.start, today) + 1 : null,
            // Live: oldest start first. Stopped: newest end first (inverted).
            sortKey: current ? `0${current.start}` : `1${String(99999999 - Number(lastEnd.replace(/-/g, '')))}`,
        })
    }
    rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    return rows.map((r) => ({ supplementId: r.supplementId, name: r.name, bars: r.bars, dayOfRun: r.dayOfRun }))
}
