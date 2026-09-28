'use client'

import { useState } from 'react'

import type { NightNote } from 'components/health/supplements/night-line'
import { useLogDay, useToday } from 'hooks/use-today'

const weekdayOf = (iso: string, weekday: 'long' | 'short') =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday })

/**
 * The day supplement check-offs count for, shared by the Home card and the
 * Supplements page. Before 6am that's still yesterday (a 1am dose is last
 * night's) — `nightNote` then explains it, with a switch to the new day that
 * lasts until the calendar day changes. Undefined from 6am on.
 */
export function useStackDay(): { date: string; today: string; nightNote?: NightNote } {
    const today = useToday()
    const logDay = useLogDay()
    const [newDayPick, setNewDayPick] = useState<string | null>(null)
    const date = newDayPick === today ? today : logDay

    if (logDay === today) return { date, today }
    return {
        date,
        today,
        nightNote:
            date === logDay
                ? {
                      text: `Counting for ${weekdayOf(logDay, 'long')} until 6 AM.`,
                      action: `Log for ${weekdayOf(today, 'short')}`,
                      onAction: () => setNewDayPick(today),
                  }
                : {
                      text: `Logging for ${weekdayOf(today, 'long')}.`,
                      action: `Back to ${weekdayOf(logDay, 'short')}`,
                      onAction: () => setNewDayPick(null),
                  },
    }
}
