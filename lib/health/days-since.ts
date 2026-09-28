/**
 * "Days since you trained it" — the colour scale and labels shared by the
 * Health dashboard's recency grid and the home page's workout card, so the two
 * can't drift. Green up to 3 days, orange 4–6, red from OVERDUE_DAYS; grey =
 * never trained. Leaf module (no component imports).
 */
import { getParents, isGroup } from './muscle-groups'

/** A group counts as overdue from this many days. */
export const OVERDUE_DAYS = 7

export function getDaysSinceColor(days: number | null): string {
    if (days === null) return '#9e9e9e'
    if (days <= 3) return '#4caf50'
    if (days < OVERDUE_DAYS) return '#ff9800'
    return '#f44336'
}

export function getDaysSinceBorder(days: number | null): string {
    if (days === null) return '#9e9e9ecc'
    if (days <= 3) return '#4caf50cc'
    if (days < OVERDUE_DAYS) return '#ff9800cc'
    return '#f44336cc'
}

export function getDaysSinceBg(days: number | null): string {
    if (days === null) return '#f5f5f5'
    if (days <= 3) return '#e8f5e9'
    if (days < OVERDUE_DAYS) return '#fff3e0'
    return '#fce4ec'
}

/** Day-count text on a plain (untinted) background — darker than the dot
 *  colours so it stays readable as text. */
export function getDaysSinceTextColor(days: number | null): string {
    if (days === null) return '#8a8a8a'
    if (days <= 3) return '#2e7d32'
    if (days < OVERDUE_DAYS) return '#a85d06'
    return '#c0392b'
}

export function formatDaysSince(days: number | null): string {
    if (days === null) return 'Never'
    if (days === 0) return 'Today'
    if (days === 1) return '1d ago'
    return `${days}d ago`
}

// ── History strip (home workout card) ─────────────────────────────────────────

type WorkoutLike = { date: string; muscleGroups: { name: string }[] }

/** The `days` dates ending at `today`, oldest first (YYYY-MM-DD, local). */
export function windowDates(today: string, days: number): string[] {
    const d = new Date(today + 'T00:00:00')
    d.setDate(d.getDate() - (days - 1))
    const out: string[] = []
    for (let i = 0; i < days; i++) {
        out.push(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        )
        d.setDate(d.getDate() + 1)
    }
    return out
}

/**
 * Group name → the dates it was trained. Targets roll up to their parent
 * groups (Lats → Upper Back), matching the days-since endpoint's SQL rollup.
 */
export function trainedDatesByGroup(workouts: WorkoutLike[]): Map<string, Set<string>> {
    const out = new Map<string, Set<string>>()
    for (const w of workouts) {
        for (const mg of w.muscleGroups) {
            const groups = isGroup(mg.name) ? [mg.name] : getParents(mg.name)
            for (const g of Array.from(groups)) {
                if (!out.has(g)) out.set(g, new Set())
                out.get(g)!.add(w.date)
            }
        }
    }
    return out
}

// ── Recommended routine (home workout card) ─────────────────────────────────

/** Recommend nothing until some group is at least this stale. */
export const RECOMMEND_AFTER_DAYS = 4

type PresetLike = { id: number; name: string; muscleGroups: { name: string }[] }

/**
 * The routine to do next: the one whose most-neglected group has gone longest
 * untrained (ties → most total days across its groups; then list order).
 * Targets roll up to their groups. Never-trained groups don't count — they're
 * usually groups you don't train, not ones you're behind on. Null when no
 * routine trains a group at RECOMMEND_AFTER_DAYS or more (you're on track).
 */
export function recommendPreset<P extends PresetLike>(
    presets: P[],
    daysSince: { muscleGroup: string; daysSince: number | null }[]
): { preset: P; days: number } | null {
    const days = new Map(daysSince.map((d) => [d.muscleGroup, d.daysSince]))
    let best: { preset: P; days: number; total: number } | null = null
    for (const preset of presets) {
        const groups = new Set(
            preset.muscleGroups.flatMap((mg) => (isGroup(mg.name) ? [mg.name] : getParents(mg.name)))
        )
        let max = 0
        let total = 0
        for (const g of Array.from(groups)) {
            const d = days.get(g)
            if (d == null) continue
            max = Math.max(max, d)
            total += d
        }
        if (max < RECOMMEND_AFTER_DAYS) continue
        if (!best || max > best.days || (max === best.days && total > best.total)) {
            best = { preset, days: max, total }
        }
    }
    return best && { preset: best.preset, days: best.days }
}
