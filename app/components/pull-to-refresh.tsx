'use client'

import { Box, CircularProgress } from '@mui/material'
import type { BoxProps } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'

type PullToRefreshProps = {
    onRefresh: () => Promise<unknown> | unknown
    children: React.ReactNode
    /** Pull distance (px, after resistance) the indicator must reach to arm a refresh. */
    threshold?: number
    /** Max distance (px) the indicator can travel; pull beyond this is heavily dampened. */
    maxPull?: number
    /**
     * Merged into the root Box. Use to stretch the touch surface beyond the
     * content, e.g. `{ flex: 1 }` in a column or `{ minHeight: '100%' }` as
     * a scroll-container child, so pulling works in the empty space below.
     */
    sx?: BoxProps['sx']
}

// Finger travel is multiplied by this, so arming takes threshold / RESISTANCE
// (~180px) of actual finger movement — deliberate pulls only.
const RESISTANCE = 0.5
// Indicator row height while the refresh promise is in flight.
const HOLD_HEIGHT = 52

/**
 * Touch-driven pull-to-refresh. Engages only when the nearest scrollable
 * ancestor (the app's #main-scroll container) is at the top. The indicator
 * tracks the finger linearly while dragging (no transition lag); the progress
 * ring fills toward the threshold and the badge turns yellow when a release
 * will trigger. Calls `onRefresh` on armed release; the spinner stays until
 * the returned promise resolves.
 */
export function PullToRefresh({
    onRefresh,
    children,
    threshold = 90,
    maxPull = 130,
    sx,
}: PullToRefreshProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const startYRef = useRef<number | null>(null)
    const pullRef = useRef(0)
    const refreshingRef = useRef(false)
    const onRefreshRef = useRef(onRefresh)
    useEffect(() => {
        onRefreshRef.current = onRefresh
    }, [onRefresh])

    const [pull, setPull] = useState(0)
    const [dragging, setDragging] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        // The layout scrolls inside a dedicated container (#main-scroll), not
        // the window — find the nearest scrollable ancestor so the gesture
        // only engages when that container is at the top.
        const getScrollTop = () => {
            let node: HTMLElement | null = el.parentElement
            while (node) {
                if (node.scrollHeight > node.clientHeight) {
                    const { overflowY } = getComputedStyle(node)
                    if (overflowY === 'auto' || overflowY === 'scroll') {
                        return node.scrollTop
                    }
                }
                node = node.parentElement
            }
            return window.scrollY || document.documentElement.scrollTop || 0
        }

        const setPullValue = (v: number) => {
            pullRef.current = v
            setPull(v)
        }

        const handleTouchStart = (e: TouchEvent) => {
            if (refreshingRef.current) return
            startYRef.current =
                getScrollTop() <= 0 ? e.touches[0].clientY : null
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (refreshingRef.current || startYRef.current == null) return
            const dy = e.touches[0].clientY - startYRef.current
            if (dy <= 0) {
                // Finger back at the start point — collapse instantly
                // (dragging stays true so no transition runs; an animated
                // collapse here shows a phantom gap while the browser takes
                // over scrolling) and release the rest of this touch
                if (pullRef.current !== 0) setPullValue(0)
                startYRef.current = null
                return
            }
            // Consume the gesture: without this the browser scrolls into the
            // indicator space when the finger reverses, so the spinner would
            // move at double speed on the way back up (position ↔ progress
            // mapping must be the same in both directions)
            if (e.cancelable) e.preventDefault()
            const resisted = dy * RESISTANCE
            const damped =
                resisted <= maxPull
                    ? resisted
                    : maxPull + (resisted - maxPull) * 0.15
            // Haptic tick the moment a release would trigger (Android only)
            if (pullRef.current < threshold && damped >= threshold) {
                navigator.vibrate?.(10)
            }
            setDragging(true)
            setPullValue(damped)
        }

        const handleTouchEnd = () => {
            if (refreshingRef.current) return
            startYRef.current = null
            setDragging(false)
            if (pullRef.current >= threshold) {
                refreshingRef.current = true
                setRefreshing(true)
                setPullValue(HOLD_HEIGHT)
                Promise.resolve()
                    .then(() => onRefreshRef.current())
                    .finally(() => {
                        refreshingRef.current = false
                        setRefreshing(false)
                        setPullValue(0)
                    })
            } else {
                setPullValue(0)
            }
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        // touchmove must be non-passive so an active pull can preventDefault
        // the browser's own scrolling (see handleTouchMove)
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })
        el.addEventListener('touchcancel', handleTouchEnd, { passive: true })

        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
            el.removeEventListener('touchcancel', handleTouchEnd)
        }
    }, [threshold, maxPull])

    const progress = Math.min(pull / threshold, 1)
    const armed = pull >= threshold

    return (
        <Box
            ref={containerRef}
            sx={[{ width: '100%' }, ...(Array.isArray(sx) ? sx : [sx])]}>
            <Box
                sx={{
                    height: pull,
                    transition: dragging ? 'none' : 'height 0.25s ease',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        border: `1.5px solid ${colors.primaryBlack}`,
                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        // Yellow = armed, a release will refresh
                        backgroundColor:
                            armed || refreshing
                                ? colors.primaryYellow
                                : colors.primaryWhite,
                        opacity: Math.min(progress * 1.5, 1),
                        transform: `scale(${0.6 + 0.4 * progress})`,
                        transition: dragging
                            ? 'background-color 0.15s'
                            : 'background-color 0.15s, transform 0.25s ease',
                    }}>
                    <CircularProgress
                        size={22}
                        thickness={4.5}
                        variant={refreshing ? 'indeterminate' : 'determinate'}
                        value={progress * 100}
                        sx={{ color: colors.primaryBlack }}
                    />
                </Box>
            </Box>
            {children}
        </Box>
    )
}
