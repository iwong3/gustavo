/**
 * Supplement runs — continuous stretches of taking a supplement — for "Day X",
 * run history, and the calendar's stack-change badges. Derived from the
 * explicit stack changes (supplement_events, 00043) plus the dose logs:
 *
 *  - a `started` event opens a run on its date; `stopped` closes it;
 *  - inside a run, RUN_GAP_DAYS days in a row with no dose end it, at the
 *    last dose (so you never have to remember to tap "Stop");
 *  - a dose outside any run opens a new one (a restart after a break).
 *
 * Gaps before a `started` event was recorded don't count (`trustedThrough`):
 * you vouched for that stretch — a backdated start, or old logs from before
 * you logged consistently. Day X counts the current run only.
 *
 * Dates are ISO YYYY-MM-DD log days. Pure + leaf (no component imports) —
 * unit-tested in tests/supplement-runs.test.ts.
 */

export const SUPPLEMENT_EVENT_KINDS = ['started', 'stopped', 'dose_changed'] as const
export type SupplementEventKind = (typeof SUPPLEMENT_EVENT_KINDS)[number]

export const isSupplementEventKind = (v: unknown): v is SupplementEventKind =>
    typeof v === 'string' && (SUPPLEMENT_EVENT_KINDS as readonly string[]).includes(v)

/** API validation: absent/null, or a YYYY-MM-DD string. */
export const isOptionalIsoDate = (v: unknown): v is string | null | undefined =>
    v === undefined || v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))

/** This many days in a row without a dose ends a run. */
export const RUN_GAP_DAYS = 7

export type RunEvent = {
    date: string
    kind: SupplementEventKind
    /** `started` only: the log day it was recorded/edited on. Gaps up to
     *  here don't end the run. Defaults to `date`. */
    trustedThrough?: string
}

export type Run = {
    start: string
    /** Last day of the run; null = still running. */
    end: string | null
    endReason: 'stopped' | 'gap' | null
}

const DAY_MS = 86_400_000
const toDay = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d) / DAY_MS
}
const toIso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)

type Point = { day: number; kind: 'start' | 'dose' | 'stop'; trust: number }
// Same day: a start opens before that day's dose; a stop closes after it
const ORDER = { start: 0, dose: 1, stop: 2 } as const

/** One supplement's runs, oldest first. `today` is the current log day. */
export function computeRuns(events: RunEvent[], doseDates: string[], today: string): Run[] {
    const points: Point[] = []
    for (const e of events) {
        if (e.kind === 'dose_changed') continue
        const day = toDay(e.date)
        points.push({
            day,
            kind: e.kind === 'started' ? 'start' : 'stop',
            trust: e.trustedThrough ? toDay(e.trustedThrough) : day,
        })
    }
    for (const d of Array.from(new Set(doseDates))) points.push({ day: toDay(d), kind: 'dose', trust: 0 })
    points.sort((a, b) => a.day - b.day || ORDER[a.kind] - ORDER[b.kind])

    const runs: Run[] = []
    let open: { start: number; last: number | null; trust: number } | null = null

    // Days strictly between the last vouched-for day and `day`
    const brokenBy = (day: number) => {
        if (!open) return false
        const from = Math.max(open.last ?? open.start, open.trust)
        return day - from - 1 >= RUN_GAP_DAYS
    }
    const close = (end: number, reason: 'stopped' | 'gap') => {
        if (!open) return
        runs.push({ start: toIso(open.start), end: toIso(end), endReason: reason })
        open = null
    }
    // A gap ends the run at its last dose — or, if it never had one, the
    // last day it was vouched for
    const gapEnd = () => (open ? (open.last ?? Math.max(open.start, open.trust)) : 0)

    for (const p of points) {
        if (p.kind === 'start') {
            if (open) open.trust = Math.max(open.trust, p.trust)
            else open = { start: p.day, last: null, trust: p.trust }
        } else if (p.kind === 'dose') {
            if (open && brokenBy(p.day)) close(gapEnd(), 'gap')
            if (open) open.last = Math.max(open.last ?? p.day, p.day)
            else open = { start: p.day, last: p.day, trust: p.day }
        } else {
            close(p.day, 'stopped')
        }
    }

    if (open) {
        if (brokenBy(toDay(today))) close(gapEnd(), 'gap')
        else runs.push({ start: toIso((open as { start: number }).start), end: null, endReason: null })
    }
    return runs
}

/** Day X of the current run (Day 1 = its first day), or null if not running. */
export function dayOfRun(runs: Run[], date: string): number | null {
    const run = runs.find((r) => r.start <= date && (r.end === null || r.end >= date))
    return run ? toDay(date) - toDay(run.start) + 1 : null
}

export type StackChange = { date: string; kind: 'add' | 'remove' | 'change' }

/** One supplement's stack changes: run starts (+), run ends (−), and dose
 *  changes (±). Merge across supplements for the calendar. */
export function stackChanges(runs: Run[], events: RunEvent[]): StackChange[] {
    const out: StackChange[] = []
    for (const r of runs) {
        out.push({ date: r.start, kind: 'add' })
        if (r.end) out.push({ date: r.end, kind: 'remove' })
    }
    for (const e of events) if (e.kind === 'dose_changed') out.push({ date: e.date, kind: 'change' })
    return out
}

/** The calendar badge for one day's changes: + only additions, − only
 *  removals, ± anything else (both, or a dose change). */
export function badgeFor(
    kinds: ReadonlyArray<StackChange['kind']> | ReadonlySet<StackChange['kind']>
): '+' | '−' | '±' | null {
    const set = new Set(kinds)
    if (set.size === 0) return null
    if (set.size > 1 || set.has('change')) return '±'
    return set.has('add') ? '+' : '−'
}
