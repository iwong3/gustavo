/**
 * The daily supplement stack — supplements with `dailyDoses` set, checked off
 * on the home page one dose at a time. A day's progress is the existing
 * supplement_logs row for that supplement + date (`quantity` = doses taken),
 * so taking a dose is "create the row, or +1", and undoing is "−1, or delete
 * the row at zero". Pure + leaf (no component imports) — unit-testable.
 */
import type { Supplement, SupplementLog } from '@/lib/health-types'

/** Upper bound for doses per day (validation; the form's stepper max). */
export const MAX_DAILY_DOSES = 12

export function isValidDailyDoses(v: unknown): v is number | null {
    return v === null || (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_DAILY_DOSES)
}

export type StackItem = {
    supplementId: number
    name: string
    dosesPerDay: number
    /** Doses logged today (can exceed dosesPerDay if logged elsewhere). */
    taken: number
    /** Today's log row, if any. */
    logId: number | null
}

/** The stack for one day: active supplements with doses set, alphabetical. */
export function buildStack(supplements: Supplement[], dayLogs: SupplementLog[]): StackItem[] {
    const bySupp = new Map(dayLogs.map((l) => [Number(l.supplementId), l]))
    return supplements
        .filter((s) => s.isActive && s.dailyDoses !== null && s.dailyDoses > 0)
        .map((s) => {
            const log = bySupp.get(Number(s.id))
            return {
                supplementId: Number(s.id),
                name: s.name,
                dosesPerDay: s.dailyDoses as number,
                taken: log ? Math.max(1, Number(log.quantity) || 1) : 0,
                logId: log ? Number(log.id) : null,
            }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
}

export const isDone = (item: StackItem) => item.taken >= item.dosesPerDay

/** A day's logs with one dose of `supplementId` added (optimistic cache). */
export function addDose(
    logs: SupplementLog[],
    supp: { id: number; name: string },
    date: string,
    tempId: number
): SupplementLog[] {
    const i = logs.findIndex((l) => Number(l.supplementId) === supp.id && l.date === date)
    if (i >= 0) {
        const next = [...logs]
        next[i] = { ...logs[i], quantity: (Number(logs[i].quantity) || 1) + 1 }
        return next
    }
    return [
        ...logs,
        {
            id: tempId,
            supplementId: supp.id,
            supplementName: supp.name,
            date,
            quantity: 1,
            createdAt: new Date().toISOString(),
        },
    ]
}

/** A day's logs with one dose of `supplementId` taken back (row removed at zero). */
export function removeDose(logs: SupplementLog[], supplementId: number, date: string): SupplementLog[] {
    const i = logs.findIndex((l) => Number(l.supplementId) === supplementId && l.date === date)
    if (i < 0) return logs
    const q = Number(logs[i].quantity) || 1
    if (q <= 1) return logs.filter((_, j) => j !== i)
    const next = [...logs]
    next[i] = { ...logs[i], quantity: q - 1 }
    return next
}
