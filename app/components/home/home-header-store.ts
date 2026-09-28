// Whether the home page's greeting (big Gus + "Good evening…") has moved up
// into the header to give the content room. The home page decides — compact
// when its content wouldn't fit on screen under the full greeting — and the
// app shell's header reads it to show the small Gus + greeting line. Kept
// after leaving home so the Gus morph between home and the other tabs knows
// where Gus is sitting. UI state only (see CLAUDE.md: Zustand is for UI).
//
// Leaf module (no component imports).

import { create } from 'zustand'

type HomeHeaderStore = {
    compact: boolean
    setCompact: (compact: boolean) => void
}

export const useHomeHeaderStore = create<HomeHeaderStore>((set) => ({
    compact: false,
    setCompact: (compact) => set((s) => (s.compact === compact ? s : { compact })),
}))
