import type { Expense } from './types'

/** Two people logging the same bill rarely agree on the date to the day. */
const DAY_WINDOW = 1
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Existing expenses that look like the one being entered: same currency, same
 * amount to the cent, dated within a day. Only a hint for the form — two
 * identical charges are legitimate (two equal tickets), so it never blocks.
 */
export function findPossibleDuplicates(
    expenses: Expense[],
    draft: {
        cost: number
        currency: string
        date: string
        /** The expense being edited, so it doesn't match itself. */
        excludeId?: string | number
    }
): Expense[] {
    if (!Number.isFinite(draft.cost) || draft.cost <= 0) return []
    // YYYY-MM-DD parses as UTC midnight, so the day math is DST-proof
    const day = Date.parse(draft.date)
    if (Number.isNaN(day)) return []
    const cents = Math.round(draft.cost * 100)

    return expenses.filter((e) => {
        if (draft.excludeId != null && String(e.id) === String(draft.excludeId))
            return false
        if (e.currency !== draft.currency) return false
        const cost = Number(e.costOriginal)
        if (!Number.isFinite(cost) || Math.round(cost * 100) !== cents)
            return false
        const other = Date.parse(e.date)
        return (
            !Number.isNaN(other) && Math.abs(other - day) <= DAY_WINDOW * DAY_MS
        )
    })
}
