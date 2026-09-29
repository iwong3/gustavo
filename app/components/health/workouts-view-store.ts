// The Workouts page's view: List or Calendar, the calendar's window and its
// routine filter. Kept in memory so opening a workout and coming back keeps
// them; a fresh app launch opens on List (and Calendar on 30D, All).
//
// Leaf module (no component imports).

import { create } from 'zustand'

import type { HubWindow } from '@/lib/health/hub-window'

export type WorkoutsView = 'list' | 'calendar'
/** 'all', or a routine's (preset's) id as a string. */
export type WorkoutsFilter = string

type WorkoutsViewStore = {
    view: WorkoutsView
    window: HubWindow
    filter: WorkoutsFilter
    setView: (view: WorkoutsView) => void
    setWindow: (window: HubWindow) => void
    setFilter: (filter: WorkoutsFilter) => void
}

export const useWorkoutsViewStore = create<WorkoutsViewStore>((set) => ({
    view: 'list',
    window: '30d',
    filter: 'all',
    setView: (view) => set({ view }),
    setWindow: (window) => set({ window }),
    setFilter: (filter) => set({ filter }),
}))
