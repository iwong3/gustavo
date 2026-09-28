/** Compact relative timestamps for activity footers ("5m ago", "2d ago").
 *  Falls back to a short date once it's over a week old. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
    const then = new Date(iso).getTime()
    if (!Number.isFinite(then)) return ''
    const minutes = Math.round((now.getTime() - then) / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.round(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** A Date as YYYY-MM-DD in the device's local time zone — "today" as the
 *  person holding the phone sees it. Never `toISOString().slice(0, 10)`:
 *  that's the UTC date, a day ahead on US evenings. */
export function localDateString(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Before this hour, what you log belongs to the previous day — at 1am
 *  you're wrapping up last night, not starting today. */
export const NIGHT_CUTOFF_HOUR = 6

/** The day a log made at `d` counts for: the local date, except before
 *  NIGHT_CUTOFF_HOUR, when it's still yesterday. For daily check-offs
 *  (supplements) — pickers that merely default a date keep their own UI. */
export function logDateString(d: Date = new Date()): string {
    if (d.getHours() >= NIGHT_CUTOFF_HOUR) return localDateString(d)
    const prev = new Date(d)
    prev.setDate(prev.getDate() - 1)
    return localDateString(prev)
}
