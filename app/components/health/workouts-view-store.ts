// The Workouts page's view: List or Calendar, the calendar's window (a
// calendar month you page through, or the rolling 90D / 1Y), the month on
// show and the routine filter. Kept in memory so opening a workout and coming
// back keeps them; a fresh app launch opens on List (and Calendar on this
// month, All).
//
// Leaf module (no component imports).

import { create } from 'zustand'

export type WorkoutsView = 'list' | 'calendar'
export const CALENDAR_WINDOWS = ['month', '90d', '1y'] as const
export type CalendarWindow = (typeof CALENDAR_WINDOWS)[number]
/** 'all', or a routine's (preset's) id as a string. */
export type WorkoutsFilter = string

type WorkoutsViewStore = {
    view: WorkoutsView
    window: CalendarWindow
    /** YYYY-MM on show in Month; null = the current month. */
    month: string | null
    filter: WorkoutsFilter
    setView: (view: WorkoutsView) => void
    setWindow: (window: CalendarWindow) => void
    setMonth: (month: string | null) => void
    setFilter: (filter: WorkoutsFilter) => void
}

export const useWorkoutsViewStore = create<WorkoutsViewStore>((set) => ({
    view: 'list',
    window: 'month',
    month: null,
    filter: 'all',
    setView: (view) => set({ view }),
    setWindow: (window) => set({ window }),
    setMonth: (month) => set({ month }),
    setFilter: (filter) => set({ filter }),
}))
