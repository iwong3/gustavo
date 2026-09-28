// Pure helpers for the home page. Leaf module — no component imports.

import type { TripSummary } from '@/lib/types'
import { canAddExpense } from 'utils/permissions'

/** Query string forms opened from home carry, so leaving them returns home
 *  (see useExitTo / getBackHref). */
export const FROM_HOME = 'from=home'

const MS_PER_DAY = 86400000

/** When a log happened, relative to `today`, in scale-LCD caps: "TODAY" /
 *  "YEST" / "FRI" (this past week) / "MAR 4". Both YYYY-MM-DD, local. */
export function lcdDayLabel(date: string, today: string): string {
    const days = Math.round(
        (new Date(today + 'T00:00:00').getTime() - new Date(date + 'T00:00:00').getTime()) / MS_PER_DAY
    )
    if (days <= 0) return 'TODAY'
    if (days === 1) return 'YEST'
    const d = new Date(date + 'T00:00:00')
    const label =
        days < 7
            ? d.toLocaleDateString('en-US', { weekday: 'short' })
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return label.toUpperCase()
}

/** When a trip is, in the departures board's words: "DAY 3/13" while it's on,
 *  "TOMORROW" / "IN 12 DAYS" / "IN 2 MO" before it. */
export function tripWhenLabel(trip: Pick<TripSummary, 'startDate' | 'endDate'>, today: string): string {
    const diff = (a: string, b: string) =>
        Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / MS_PER_DAY)
    if (trip.startDate <= today) {
        const total = Math.max(1, diff(trip.startDate, trip.endDate) + 1)
        return `DAY ${Math.min(total, diff(trip.startDate, today) + 1)}/${total}`
    }
    const d = diff(today, trip.startDate)
    if (d === 1) return 'TOMORROW'
    if (d < 30) return `IN ${d} DAYS`
    return `IN ${Math.round(d / 30)} MO`
}

/**
 * The trip the home "Add expense" button adds to: the ongoing trip (latest
 * start wins if several overlap), else the soonest upcoming one. Null when
 * there's neither — or you can't add expenses there — and the button hides.
 * `today` is the device's local YYYY-MM-DD.
 */
export function pickExpenseTrip(trips: TripSummary[], today: string): TripSummary | null {
    const mine = trips.filter((t) => canAddExpense(t.userRole))
    const ongoing = mine
        .filter((t) => t.startDate <= today && today <= t.endDate)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
    if (ongoing.length) return ongoing[0]
    const upcoming = mine
        .filter((t) => t.startDate > today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
    return upcoming[0] ?? null
}
