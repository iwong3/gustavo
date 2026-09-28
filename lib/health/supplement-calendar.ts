/**
 * The Supplements page's history model: for any day, which supplements were
 * in your daily stack, how many doses were due vs taken, and what changed in
 * the stack (calendar badges + the day panel's change lines). Built once from
 * supplements + stack events + logs; runs come from supplement-runs.ts.
 *
 * A supplement is "due" on a day when that day is inside one of its runs and
 * its doses/day then (from its started / dose_changed events) isn't null —
 * as-needed supplements are never due and never badge the calendar.
 *
 * Pure + leaf — the page and the gallery both build it; tested in
 * tests/supplement-calendar.test.ts.
 */
import type { Supplement, SupplementEvent, SupplementLog } from '@/lib/health-types'
import { badgeFor, computeRuns, dayOfRun, type Run } from './supplement-runs'

export type DayStatus = 'full' | 'part' | 'none' | 'idle'

export type DayRow = {
    supplementId: number
    name: string
    dosage: string | null
    /** Doses due that day (0 = not in a run then — logging one starts it). */
    due: number
    /** Capsules to draw: due, else today's stack value, else what was taken. */
    dosesPerDay: number
    taken: number
    /** Day X of the run that day, if any. */
    dayOfRun: number | null
}

export type DayChange = { kind: 'add' | 'remove' | 'change'; text: string }

export type DaySummary = {
    status: DayStatus
    badge: '+' | '−' | '±' | null
    due: number
    /** Due doses taken (extra doses beyond what's due don't count). */
    taken: number
}

type Entry = {
    s: Supplement
    id: number
    events: SupplementEvent[]
    runs: Run[]
    doses: Map<string, number>
}

const fmtDoses = (n: number | null) => (n === null ? 'as needed' : `${n}× a day`)

export type SupplementHistory = ReturnType<typeof buildSupplementHistory>

export function buildSupplementHistory({
    supplements,
    events,
    logs,
    today,
    recordedOn,
}: {
    supplements: Supplement[]
    events: SupplementEvent[]
    logs: SupplementLog[]
    /** The current log day (before 6am, still yesterday). */
    today: string
    /** A timestamp → the log day it fell on (device time zone). */
    recordedOn: (iso: string) => string
}) {
    const entries = new Map<number, Entry>()
    for (const s of supplements) {
        entries.set(Number(s.id), { s, id: Number(s.id), events: [], runs: [], doses: new Map() })
    }
    for (const e of events) entries.get(Number(e.supplementId))?.events.push(e)
    for (const l of logs) {
        const q = Number(l.quantity) || 0
        if (q > 0) entries.get(Number(l.supplementId))?.doses.set(l.date, q)
    }

    /** Doses/day in effect on `date`, from the latest event on or before it. */
    const dosesPerDayOn = (e: Entry, date: string): number | null => {
        let n: number | null | undefined
        for (const ev of e.events) {
            if (ev.date > date) break
            if (ev.kind !== 'stopped') n = ev.dailyDoses
        }
        return n === undefined ? e.s.dailyDoses : n
    }

    const changes = new Map<string, DayChange[]>()
    const addChange = (date: string, c: DayChange) => {
        const list = changes.get(date)
        if (list) list.push(c)
        else changes.set(date, [c])
    }

    for (const e of Array.from(entries.values())) {
        e.events.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
        e.runs = computeRuns(
            e.events.map((ev) => ({
                date: ev.date,
                kind: ev.kind,
                trustedThrough: ev.kind === 'started' ? recordedOn(ev.recordedAt) : undefined,
            })),
            Array.from(e.doses.keys()),
            today
        )
        const name = e.s.name
        e.runs.forEach((run, i) => {
            if (dosesPerDayOn(e, run.start) !== null) {
                addChange(run.start, { kind: 'add', text: `${i === 0 ? 'Started' : 'Restarted'} ${name}` })
            }
            if (run.end && dosesPerDayOn(e, run.end) !== null) {
                addChange(run.end, {
                    kind: 'remove',
                    text: run.endReason === 'stopped' ? `Stopped ${name}` : `${name}: last dose before a break`,
                })
            }
        })
        let prev: number | null | undefined
        for (const ev of e.events) {
            if (ev.kind === 'dose_changed' && prev !== undefined && prev !== ev.dailyDoses) {
                addChange(ev.date, {
                    kind: 'change',
                    text: `${name}: ${fmtDoses(prev)} → ${fmtDoses(ev.dailyDoses)}`,
                })
            }
            if (ev.kind !== 'stopped') prev = ev.dailyDoses
        }
    }

    const sorted = Array.from(entries.values()).sort((a, b) => a.s.name.localeCompare(b.s.name))

    const dueOn = (e: Entry, date: string) =>
        dayOfRun(e.runs, date) === null ? 0 : (dosesPerDayOn(e, date) ?? 0)
    const startedBy = (e: Entry, date: string) => {
        const first = e.runs[0]?.start ?? e.events[0]?.date
        return first !== undefined && first <= date
    }

    /** Rows for one day: what was due, and anything logged. Alphabetical,
     *  like the Home card. */
    function rowsOn(date: string): DayRow[] {
        const rows: DayRow[] = []
        for (const e of sorted) {
            const due = dueOn(e, date)
            const taken = e.doses.get(date) ?? 0
            if (due === 0 && taken === 0) continue
            rows.push({
                supplementId: e.id,
                name: e.s.name,
                dosage: e.s.dosage,
                due,
                dosesPerDay: due || e.s.dailyDoses || Math.max(taken, 1),
                taken,
                dayOfRun: dayOfRun(e.runs, date),
            })
        }
        return rows
    }

    function summaryOn(date: string): DaySummary {
        let due = 0
        let taken = 0
        for (const e of sorted) {
            const d = dueOn(e, date)
            if (d === 0) continue
            due += d
            taken += Math.min(e.doses.get(date) ?? 0, d)
        }
        const status: DayStatus =
            due === 0 ? 'idle' : taken === 0 ? 'none' : taken >= due ? 'full' : 'part'
        const dayChanges = changes.get(date) ?? []
        return { status, badge: badgeFor(dayChanges.map((c) => c.kind)), due, taken }
    }

    /** "Also took": active supplements neither due nor logged on `date` —
     *  as-needed ones, and stack ones on a break then (or not restarted yet).
     *  One tap logs one (a stack one then rejoins its run). */
    function extrasOn(date: string): { supplementId: number; name: string }[] {
        return sorted
            .filter(
                (e) =>
                    e.s.isActive &&
                    !e.doses.get(date) &&
                    dueOn(e, date) === 0 &&
                    (e.s.dailyDoses === null || startedBy(e, date))
            )
            .map((e) => ({ supplementId: e.id, name: e.s.name }))
    }

    /** The earliest day with any history, for the calendar's back limit. */
    const firstDay = sorted.reduce<string | null>((min, e) => {
        const d = e.runs[0]?.start ?? e.events[0]?.date
        return d && (!min || d < min) ? d : min
    }, null)

    return {
        rowsOn,
        summaryOn,
        extrasOn,
        changesOn: (date: string) => changes.get(date) ?? [],
        dayOfRun: (supplementId: number, date: string) => {
            const e = entries.get(supplementId)
            return e ? dayOfRun(e.runs, date) : null
        },
        firstDay,
    }
}
