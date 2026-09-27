'use client'

import { useEffect, useState } from 'react'

import { localDateString } from 'utils/time'

/**
 * Today's local date (YYYY-MM-DD), kept current. A PWA can stay open for days
 * without a reload, so a date computed once at mount goes stale overnight and
 * "today" logs land on yesterday. Re-checked when the app returns to the
 * foreground and every minute while it's open; same-day checks don't re-render.
 */
export function useToday(): string {
    const [today, setToday] = useState(localDateString)

    useEffect(() => {
        const refresh = () => setToday(localDateString())
        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        const id = setInterval(refresh, 60_000)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            clearInterval(id)
        }
    }, [])

    return today
}
