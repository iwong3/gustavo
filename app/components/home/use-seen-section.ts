'use client'

import { useEffect, useState } from 'react'

const PREFIX = 'gustavo.home.seen.'

/**
 * Whether a home section (weight, workouts, supplements) was showing the last
 * time this device loaded home — so its loading placeholder only appears for
 * people who'll actually get that section. Trips-only people never see a
 * Workouts skeleton flash and vanish. `shownNow` is null while loading, then
 * whether the section rendered; it's recorded for next time. Per-device
 * convenience only (localStorage), safe to lose. Home renders client-only
 * (the app shell's ClientOnly), so reading storage on mount is hydration-safe.
 */
export function useSeenBefore(section: string, shownNow: boolean | null): boolean {
    const [seen] = useState(() => {
        try {
            return window.localStorage.getItem(PREFIX + section) === '1'
        } catch {
            return false
        }
    })
    useEffect(() => {
        if (shownNow === null) return
        try {
            window.localStorage.setItem(PREFIX + section, shownNow ? '1' : '0')
        } catch {
            // Storage blocked — placeholders just fall back to not showing
        }
    }, [section, shownNow])
    return seen
}
