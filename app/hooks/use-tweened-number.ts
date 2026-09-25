'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * `value`, eased over `duration` ms whenever it changes — for totals that
 * should roll to their new amount instead of snapping. Jumps straight there
 * when the user prefers reduced motion, and on first render.
 */
export function useTweenedNumber(value: number, duration = 320): number {
    const [shown, setShown] = useState(value)
    // What's on screen right now — a new value mid-animation continues
    // from here instead of jumping back to the previous target
    const shownRef = useRef(value)

    useEffect(() => {
        const from = shownRef.current
        let frame = 0
        const jump =
            from === value ||
            !Number.isFinite(from) ||
            !Number.isFinite(value) ||
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (jump) {
            frame = requestAnimationFrame(() => {
                shownRef.current = value
                setShown(value)
            })
            return () => cancelAnimationFrame(frame)
        }
        const start = performance.now()
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
            shownRef.current = from + (value - from) * eased
            setShown(shownRef.current)
            if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [value, duration])

    return shown
}
