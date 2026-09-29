/**
 * The Workouts page's model: one row per day, labelled by routine, grouped
 * into Sunday-start weeks. Leaf module (no component imports).
 *
 *  - Routines: a day "is" a routine when it trained all of that routine's
 *    groups (targets roll up to their groups, so Lats counts as Upper Back).
 *    Groups no matched routine covers are extras ("+ Lower Back").
 *    A day matching no routine falls back to its group names.
 *  - Gap: days since the previous workout day (the date's badge). Per-routine
 *    history is for a routine calendar, not the rows.
 *  - Recency: days since each routine was last done, for the rotation tiles.
 *
 * A day has one workout (00044), but rows still group by date so a stale
 * cache with two same-day workouts renders as one row.
 */
import type { Workout } from '@/lib/health-types'

import { getParents, isGroup, MUSCLE_GROUPS } from './muscle-groups'

type PresetLike = { id: number | string; name: string; muscleGroups: { name: string }[] }

export type WorkoutDay<P extends PresetLike = PresetLike> = {
    date: string
    workouts: Workout[]
    /** Top-level groups trained, in MUSCLE_GROUPS order. */
    groups: string[]
    routines: P[]
    extras: string[]
    /** Days since the previous workout day (null = the first one). */
    gap: number | null
}

export type WorkoutWeek<P extends PresetLike = PresetLike> = {
    /** Sunday, ISO. */
    start: string
    days: WorkoutDay<P>[]
}

const DAY_MS = 86400000
const toTime = (iso: string) => new Date(iso + 'T00:00:00').getTime()
export const daysBetween = (later: string, earlier: string) =>
    Math.round((toTime(later) - toTime(earlier)) / DAY_MS)

export function addDaysIso(iso: string, n: number): string {
    const d = new Date(iso + 'T00:00:00')
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The Sunday on or before `iso`. */
export const weekStartOf = (iso: string) => addDaysIso(iso, -new Date(iso + 'T00:00:00').getDay())

/** Names → top-level groups (targets roll up to their parents). */
export function toGroups(names: string[]): Set<string> {
    return new Set(names.flatMap((n) => (isGroup(n) ? [n] : getParents(n))))
}

/** Which routines a set of groups covers, plus what's left over. */
export function matchRoutines<P extends PresetLike>(
    groups: Set<string>,
    presets: P[],
): { routines: P[]; extras: string[] } {
    const covered = new Set<string>()
    const routines = presets.filter((p) => {
        const need = toGroups(p.muscleGroups.map((m) => m.name))
        if (need.size === 0 || !Array.from(need).every((g) => groups.has(g))) return false
        need.forEach((g) => covered.add(g))
        return true
    })
    const extras = MUSCLE_GROUPS.filter((g) => groups.has(g) && !covered.has(g))
    return { routines, extras }
}

/** One row per date, newest first, with labels and the gap to the day before. */
export function buildWorkoutDays<P extends PresetLike>(workouts: Workout[], presets: P[]): WorkoutDay<P>[] {
    const byDate = new Map<string, Workout[]>()
    for (const w of workouts) {
        const list = byDate.get(w.date)
        if (list) list.push(w)
        else byDate.set(w.date, [w])
    }
    const dates = Array.from(byDate.keys()).sort().reverse()
    return dates.map((date, i) => {
        const list = byDate.get(date)!
        const groupSet = toGroups(list.flatMap((w) => w.muscleGroups.map((m) => m.name)))
        const { routines, extras } = matchRoutines(groupSet, presets)
        return {
            date,
            workouts: list,
            groups: MUSCLE_GROUPS.filter((g) => groupSet.has(g)),
            routines,
            extras,
            gap: i + 1 < dates.length ? daysBetween(date, dates[i + 1]) : null,
        }
    })
}

/** Days since each routine was last done (null = never), keyed by preset id. */
export function routineRecency<P extends PresetLike>(days: WorkoutDay<P>[], presets: P[], today: string) {
    const out = new Map<string, number | null>()
    for (const p of presets) {
        const last = days.find((d) => d.routines.some((r) => String(r.id) === String(p.id)))
        out.set(String(p.id), last ? Math.max(0, daysBetween(today, last.date)) : null)
    }
    return out
}

/** Sunday-start weeks from today's back to the oldest day's, empty weeks included. */
export function groupByWeek<P extends PresetLike>(days: WorkoutDay<P>[], today: string): WorkoutWeek<P>[] {
    const weeks: WorkoutWeek<P>[] = []
    const oldest = days[days.length - 1]?.date
    if (!oldest) return weeks
    const stop = weekStartOf(oldest)
    // A future-dated workout starts the list at its own week
    const first = weekStartOf(days[0].date > today ? days[0].date : today)
    let i = 0
    for (let start = first; start >= stop; start = addDaysIso(start, -7)) {
        const week: WorkoutDay<P>[] = []
        while (i < days.length && days[i].date >= start) week.push(days[i++])
        weeks.push({ start, days: week })
    }
    return weeks
}
