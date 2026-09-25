'use client'

import { Box } from '@mui/material'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'

// Width of each revealed action button, and how far the row rests open
const ACTION_WIDTH = 72
// Past this much travel on release the row settles open, otherwise closed
const OPEN_THRESHOLD = ACTION_WIDTH / 2
const SETTLE = 'transform 200ms cubic-bezier(0.25, 0.8, 0.25, 1)'

// Only one row is open at a time app-wide: opening a row closes the last one
let closeOpenRow: (() => void) | null = null
// A tap that closes an open row is swallowed if it lands on another row, so
// it doesn't also open that row's detail (iOS Mail behaviour)
let swallowClicksUntil = 0

interface SwipeableRowProps {
    children: React.ReactNode
    canEdit: boolean
    canDelete: boolean
    onEdit: () => void
    onDelete: () => void
    backgroundColor?: string
    showBottomBorder?: boolean
    borderRadius?: string | number
    boxShadow?: string
    border?: string
    borderColor?: string
}

/**
 * Swipe to reveal, tap to act — the app's one swipe-action pattern. Swipe
 * left reveals Delete, swipe right reveals Edit; the row rests open until
 * you tap the button (the tap is the confirmation, so callers delete
 * directly — no dialog) or tap/swipe anywhere else to close it.
 *
 * For bordered cards, render this INSIDE the card's box (with
 * overflow: hidden) so the revealed button reads as part of the card.
 */
export const SwipeableRow = ({
    children,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    backgroundColor = colors.primaryWhite,
    showBottomBorder = false,
    borderRadius,
    boxShadow,
    border,
    borderColor: borderColorProp,
}: SwipeableRowProps) => {
    const dividerColor = borderColorProp ?? 'rgba(0, 0, 0, 0.23)'
    const [offset, setOffset] = useState(0)
    const [swiping, setSwiping] = useState(false)
    const startXRef = useRef(0)
    const startYRef = useRef(0)
    const startOffsetRef = useRef(0)
    const isHorizontalRef = useRef<boolean | null>(null)
    const offsetRef = useRef(0) // mirror of offset state for native listeners
    const rootRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const moveTo = useCallback((next: number) => {
        offsetRef.current = next
        setOffset(next)
    }, [])

    const close = useCallback(() => moveTo(0), [moveTo])

    // Register as the open row / unregister when closed
    useEffect(() => {
        if (offset === 0) {
            if (closeOpenRow === close) closeOpenRow = null
            return
        }
        if (swiping) return
        if (closeOpenRow && closeOpenRow !== close) closeOpenRow()
        closeOpenRow = close
    }, [offset, swiping, close])

    // While open, a touch anywhere outside this row closes it
    useEffect(() => {
        if (offset === 0 || swiping) return
        const onOutsideTouch = (e: TouchEvent) => {
            const target = e.target as Element | null
            if (rootRef.current?.contains(target)) return
            close()
            if (target?.closest('[data-swipeable-row]')) {
                swallowClicksUntil = Date.now() + 500
            }
        }
        document.addEventListener('touchstart', onOutsideTouch, {
            capture: true,
            passive: true,
        })
        return () =>
            document.removeEventListener('touchstart', onOutsideTouch, {
                capture: true,
            })
    }, [offset, swiping, close])

    // Attach native touch listeners with { passive: false } to allow preventDefault
    useEffect(() => {
        const el = contentRef.current
        if (!el) return

        const handleTouchStart = (e: TouchEvent) => {
            startXRef.current = e.touches[0].clientX
            startYRef.current = e.touches[0].clientY
            startOffsetRef.current = offsetRef.current
            isHorizontalRef.current = null
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (e.defaultPrevented) return // a descendant owns this gesture
            const dx = e.touches[0].clientX - startXRef.current
            const dy = e.touches[0].clientY - startYRef.current

            // Axis-lock on the first significant move
            if (isHorizontalRef.current === null) {
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    isHorizontalRef.current = Math.abs(dx) > Math.abs(dy)
                }
                return
            }
            if (!isHorizontalRef.current) return

            // Prevent vertical scroll while swiping horizontally
            if (e.cancelable) e.preventDefault()
            setSwiping(true)

            let next = startOffsetRef.current + dx
            // Rubber-band past the button, and in directions with no action
            if (next < 0) {
                if (!canDelete) next *= 0.2
                else if (next < -ACTION_WIDTH)
                    next = -ACTION_WIDTH + (next + ACTION_WIDTH) * 0.3
            } else if (next > 0) {
                if (!canEdit) next *= 0.2
                else if (next > ACTION_WIDTH)
                    next = ACTION_WIDTH + (next - ACTION_WIDTH) * 0.3
            }
            moveTo(next)
        }

        const handleTouchEnd = () => {
            const wasSwipe = isHorizontalRef.current === true
            isHorizontalRef.current = null
            setSwiping(false)
            if (!wasSwipe) return // taps are handled by onClickCapture
            const current = offsetRef.current
            let settled = 0
            if (current <= -OPEN_THRESHOLD && canDelete) settled = -ACTION_WIDTH
            else if (current >= OPEN_THRESHOLD && canEdit) settled = ACTION_WIDTH
            if (settled !== 0 && settled !== startOffsetRef.current) {
                navigator.vibrate?.(10)
            }
            moveTo(settled)
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })
        el.addEventListener('touchcancel', handleTouchEnd, { passive: true })

        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
            el.removeEventListener('touchcancel', handleTouchEnd)
        }
    }, [canDelete, canEdit, moveTo])

    // Tapping the content of an open row closes it instead of opening it;
    // a tap that just closed another row is swallowed too
    const handleContentClickCapture = (e: React.MouseEvent) => {
        if (offsetRef.current !== 0 || Date.now() < swallowClicksUntil) {
            e.preventDefault()
            e.stopPropagation()
            swallowClicksUntil = 0
            close()
        }
    }

    const fire = (action: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation()
        close()
        action()
    }

    if (!canEdit && !canDelete) {
        return (
            <Box sx={{
                ...(showBottomBorder && {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }),
                ...(borderRadius != null && { borderRadius }),
                ...(boxShadow != null && { boxShadow }),
                ...(border != null && { border }),
            }}>
                {children}
            </Box>
        )
    }

    const actionButtonSx = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: ACTION_WIDTH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        zIndex: 0,
    } as const

    return (
        <Box
            ref={rootRef}
            data-swipeable-row=""
            sx={{
                position: 'relative',
                overflow: 'hidden',
                ...(showBottomBorder && {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }),
                ...(borderRadius != null && { borderRadius }),
                ...(boxShadow != null && { boxShadow }),
                ...(border != null && { border }),
            }}>
            {/* Left action (edit) — revealed by swiping right, tap to fire */}
            {canEdit && (
                <Box
                    component="button"
                    type="button"
                    aria-label="Edit"
                    tabIndex={offset > 0 ? 0 : -1}
                    onClick={fire(onEdit)}
                    sx={{
                        ...actionButtonSx,
                        left: 0,
                        backgroundColor: colors.primaryYellow,
                    }}>
                    <IconEdit size={22} color={colors.primaryBlack} />
                </Box>
            )}

            {/* Right action (delete) — revealed by swiping left, tap to fire */}
            {canDelete && (
                <Box
                    component="button"
                    type="button"
                    aria-label="Delete"
                    tabIndex={offset < 0 ? 0 : -1}
                    onClick={fire(onDelete)}
                    sx={{
                        ...actionButtonSx,
                        right: 0,
                        backgroundColor: colors.primaryRed,
                    }}>
                    <IconTrash size={22} color={colors.primaryWhite} />
                </Box>
            )}

            {/* Border dividers — travel with the content edge */}
            {canEdit && offset > 0 && (
                <Box sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 0,
                    borderRight: `1px solid ${dividerColor}`,
                    transform: `translateX(${offset}px)`,
                    transition: swiping ? 'none' : SETTLE,
                    zIndex: 2,
                    pointerEvents: 'none',
                }} />
            )}
            {canDelete && offset < 0 && (
                <Box sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 0,
                    borderLeft: `1px solid ${dividerColor}`,
                    transform: `translateX(${offset}px)`,
                    transition: swiping ? 'none' : SETTLE,
                    zIndex: 2,
                    pointerEvents: 'none',
                }} />
            )}

            {/* Sliding content — solid bg to cover action buttons when not swiped */}
            <Box
                ref={contentRef}
                onClickCapture={handleContentClickCapture}
                sx={{
                    position: 'relative',
                    // Reserve horizontal gestures for the swipe handler; without
                    // this the browser can start a native scroll first, making
                    // preventDefault a no-op and the drag jittery
                    touchAction: 'pan-y',
                    transform: `translateX(${offset}px)`,
                    transition: swiping ? 'none' : SETTLE,
                    zIndex: 1,
                    backgroundColor,
                }}>
                {children}
            </Box>
        </Box>
    )
}
