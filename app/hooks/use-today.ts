'use client'

import { useEffect, useState } from 'react'

import { localDateString, logDateString } from 'utils/time'

/** A date string from `compute`, re-checked when the app returns to the
 *  foreground and every minute while it's open; same-day checks don't
 *  re-render (setState bails out on an equal string). */
function useLiveDate(compute: () => string): string {
    const [date, setDate] = useState(compute)

    useEffect(() => {
        const refresh = () => setDate(compute())
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        const id = setInterval(refresh, 60_000)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            clearInterval(id)
        }
    }, [compute])

    return date
}

const today = () => localDateString()
const logDay = () => logDateString()

/**
 * Today's local date (YYYY-MM-DD), kept current. A PWA can stay open for days
 * without a reload, so a date computed once at mount goes stale overnight and
 * "today" logs land on yesterday.
 */
export function useToday(): string {
    return useLiveDate(today)
}

/**
 * The day a check-off made now counts for (logDateString): today, except
 * before 6am, when it's still yesterday. Kept current like useToday, so it
 * rolls over at 6am on its own.
 */
export function useLogDay(): string {
    return useLiveDate(logDay)
}
