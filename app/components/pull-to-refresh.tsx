'use client'

import { Box, CircularProgress } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'

type PullToRefreshProps = {
    onRefresh: () => Promise<unknown> | unknown
    children: React.ReactNode
    /** Distance (px) the user must pull past before a release triggers refresh. */
    threshold?: number
    /** Max distance (px) the indicator can travel; pull beyond this is dampened. */
    maxPull?: number
}

/**
 * Touch-driven pull-to-refresh. Activates only when the scroll container is at
 * the top. Calls `onRefresh` (which should return a promise) when the user
 * releases past the threshold; the spinner stays visible until the promise
 * resolves.
 */
export function PullToRefresh({
    onRefresh,
    children,
    threshold = 70,
    maxPull = 120,
}: PullToRefreshProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const startYRef = useRef<number | null>(null)
    const [pull, setPull] = useState(0)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const isAtTop = () =>
            (window.scrollY || document.documentElement.scrollTop || 0) <= 0

        const handleTouchStart = (e: TouchEvent) => {
            if (refreshing) return
            if (!isAtTop()) {
                startYRef.current = null
                return
            }
            startYRef.current = e.touches[0].clientY
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (refreshing || startYRef.current == null) return
            const dy = e.touches[0].clientY - startYRef.current
            if (dy <= 0) {
                setPull(0)
                return
            }
            // Damp pull so it slows down past maxPull
            const damped = Math.min(dy, maxPull) + Math.max(0, (dy - maxPull) * 0.2)
            setPull(damped)
        }

        const handleTouchEnd = async () => {
            if (refreshing) return
            if (pull >= threshold) {
                setRefreshing(true)
                setPull(threshold)
                try {
                    await onRefresh()
                } finally {
                    setRefreshing(false)
                    setPull(0)
                }
            } else {
                setPull(0)
            }
            startYRef.current = null
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: true })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })
        el.addEventListener('touchcancel', handleTouchEnd, { passive: true })

        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
            el.removeEventListener('touchcancel', handleTouchEnd)
        }
    }, [pull, refreshing, threshold, maxPull, onRefresh])

    const indicatorOpacity = Math.min(pull / threshold, 1)
    const spinnerProgress = refreshing ? undefined : (pull / threshold) * 100

    return (
        <Box ref={containerRef} sx={{ width: '100%' }}>
            <Box
                sx={{
                    position: 'relative',
                    height: pull,
                    transition: refreshing ? 'none' : 'height 0.2s',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                <CircularProgress
                    size={28}
                    thickness={4}
                    variant={refreshing ? 'indeterminate' : 'determinate'}
                    value={spinnerProgress}
                    sx={{
                        color: colors.primaryYellow,
                        opacity: indicatorOpacity,
                    }}
                />
            </Box>
            {children}
        </Box>
    )
}
