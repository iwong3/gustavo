'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'

// Minimal Navigation API surface (Chromium; Safari 26.2+) — not in every
// TS DOM lib version, so typed locally
type NavigationLike = {
    currentEntry: { index: number } | null
    entries: () => { url: string | null }[]
}

// Fallback for browsers without the Navigation API: the last pathname we
// rendered before this one. Only approximates the entry behind us (wrong
// after a history pop), so it's used only when the real list is unavailable.
let currentPath: string | null = null
let previousPath: string | null = null

/** Mount once in the app layout (feeds the no-Navigation-API fallback). */
export function useTrackPreviousPath() {
    const pathname = usePathname()
    useEffect(() => {
        if (pathname === currentPath) return
        previousPath = currentPath
        currentPath = pathname
    }, [pathname])
}

/** Pathname of the history entry directly behind the current one. */
function entryBehindPathname(): string | null {
    const nav = (window as { navigation?: NavigationLike }).navigation
    if (nav?.currentEntry && typeof nav.entries === 'function') {
        const index = nav.currentEntry.index
        const url = index > 0 ? nav.entries()[index - 1]?.url : null
        return url ? new URL(url).pathname : null
    }
    return previousPath
}

/**
 * Leave a page (header back, form cancel/save, delete) for `url`. If `url` is
 * the history entry behind us, pop history instead of replacing — replace
 * would leave a duplicate of `url` behind us, so native swipe-back / browser
 * back would land on the same screen again. Compared by pathname, so a popped
 * entry keeps its original query (e.g. ?from=graphs).
 */
export function useExitTo() {
    const router = useRouter()
    return useCallback(
        (url: string) => {
            if (entryBehindPathname() === url.split('?')[0]) router.back()
            else router.replace(url)
        },
        [router]
    )
}
