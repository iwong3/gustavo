// The Health hub's rolling window (30D / 90D / 1Y). Kept in memory so
// drilling into a sub-page and coming back keeps it; a fresh app launch opens
// on 30D.
//
// Leaf module (no component imports).

import { create } from 'zustand'

import type { HubWindow } from '@/lib/health/hub-window'

type HubWindowStore = {
    window: HubWindow
    setWindow: (window: HubWindow) => void
}

export const useHubWindowStore = create<HubWindowStore>((set) => ({
    window: '30d',
    setWindow: (window) => set({ window }),
}))
