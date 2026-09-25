'use client'

import { useEffect, useLayoutEffect } from 'react'

// Scroll restoration for #main-scroll (the layout's own scroller, so the
// browser's/Next's window scroll restoration never applies to it).
//
// Native-app convention: going BACK (swipe, ←, browser back) returns you to
// where you were; going FORWARD (links, tabs) starts at the top.

const SCROLLER_ID = 'main-scroll'
// How long to keep re-applying a restored position while the page's content
// streams in (cache → skeleton → data can change the height a few times)
const RESTORE_WINDOW_MS = 1500

type NavigationLike = { currentEntry: { key: string } | null }

const positions = new Map<string, number>()
let traversing = false

// One key per history entry: the Navigation API's entry key where available
// (Chromium, Safari 26.2+), else the URL — close enough as a fallback
function entryKey(): string {
    const nav = (window as { navigation?: NavigationLike }).navigation
    return nav?.currentEntry?.key ?? location.pathname + location.search
}

export function useScrollRestoration(pathname: string) {
    // Record positions as you scroll, and flag history traversals
    useEffect(() => {
        // Captured at the document: the scroller mounts after this layout
        // (ClientOnly), and scroll events don't bubble
        const onScroll = (e: Event) => {
            const el = e.target as HTMLElement
            if (el.id === SCROLLER_ID) positions.set(entryKey(), el.scrollTop)
        }
        // Registered before Next's own popstate listener (child effects run
        // first), so the flag is set before the traversal renders
        const onPopState = () => {
            traversing = true
        }
        document.addEventListener('scroll', onScroll, {
            capture: true,
            passive: true,
        })
        window.addEventListener('popstate', onPopState)
        return () => {
            document.removeEventListener('scroll', onScroll, { capture: true })
            window.removeEventListener('popstate', onPopState)
        }
    }, [])

    // Layout effect: position the new page before it paints
    useLayoutEffect(() => {
        const el = document.getElementById(SCROLLER_ID)
        if (!el) return
        const wasTraversal = traversing
        traversing = false

        const target = wasTraversal ? (positions.get(entryKey()) ?? 0) : 0
        el.scrollTo(0, target)
        if (target === 0) return

        // Content may not be tall enough yet — keep re-applying until it is
        // (or the window closes), and stop the moment the user takes over
        let frame = 0
        const deadline = performance.now() + RESTORE_WINDOW_MS
        const stop = () => {
            cancelAnimationFrame(frame)
            el.removeEventListener('touchstart', stop)
            el.removeEventListener('wheel', stop)
        }
        const tick = () => {
            if (Math.abs(el.scrollTop - target) > 1) el.scrollTo(0, target)
            if (performance.now() < deadline) frame = requestAnimationFrame(tick)
            else stop()
        }
        el.addEventListener('touchstart', stop, { passive: true })
        el.addEventListener('wheel', stop, { passive: true })
        frame = requestAnimationFrame(tick)
        return stop
    }, [pathname])
}

/** Smooth-scroll the main scroller to the top (active-tab re-tap). */
export function scrollMainToTop() {
    document
        .getElementById(SCROLLER_ID)
        ?.scrollTo({ top: 0, behavior: 'smooth' })
}
