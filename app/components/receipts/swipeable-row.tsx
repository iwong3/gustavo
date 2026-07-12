'use client'

import { Box } from '@mui/material'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'

// Each action button spans this fraction of the row; dragging to full reveal fires the action
const ACTION_FRACTION = 1 / 3

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
    const currentOffsetRef = useRef(0)
    const isHorizontalRef = useRef<boolean | null>(null)
    const firedRef = useRef(false) // action already fired for this gesture
    const actionWidthRef = useRef(0) // px trigger distance, measured at gesture start
    const offsetRef = useRef(0) // mirror of offset state for native listeners
    const contentRef = useRef<HTMLDivElement>(null)
    // Keep latest callbacks in refs so the listener effect doesn't re-attach
    // on every parent render (callers pass inline closures)
    const onEditRef = useRef(onEdit)
    const onDeleteRef = useRef(onDelete)
    useEffect(() => {
        onEditRef.current = onEdit
        onDeleteRef.current = onDelete
    }, [onEdit, onDelete])

    // Keep offsetRef in sync with state
    useEffect(() => {
        offsetRef.current = offset
    }, [offset])

    // Attach native touch listeners with { passive: false } to allow preventDefault
    useEffect(() => {
        const el = contentRef.current
        if (!el) return

        const handleTouchStart = (e: TouchEvent) => {
            startXRef.current = e.touches[0].clientX
            startYRef.current = e.touches[0].clientY
            currentOffsetRef.current = offsetRef.current
            isHorizontalRef.current = null
            firedRef.current = false
            // Buttons are sized as a fraction of the row, so the trigger
            // distance depends on the rendered width — measure per gesture
            actionWidthRef.current = el.clientWidth * ACTION_FRACTION
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (firedRef.current) return

            const dx = e.touches[0].clientX - startXRef.current
            const dy = e.touches[0].clientY - startYRef.current

            // Determine direction on first significant move
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

            let newOffset = currentOffsetRef.current + dx
            const actionWidth = actionWidthRef.current

            // Full reveal fires the action immediately — no resting-open
            // state, so at most one row is ever swiped open
            if (newOffset <= -actionWidth && canDelete) {
                firedRef.current = true
                navigator.vibrate?.(10)
                setSwiping(false)
                setOffset(0)
                onDeleteRef.current()
                return
            }
            if (newOffset >= actionWidth && canEdit) {
                firedRef.current = true
                navigator.vibrate?.(10)
                setSwiping(false)
                setOffset(0)
                onEditRef.current()
                return
            }

            // Rubber-band resistance in directions without a permitted action
            if (!canDelete && newOffset < 0) {
                newOffset *= 0.2
            } else if (!canEdit && newOffset > 0) {
                newOffset *= 0.2
            }

            setOffset(newOffset)
        }

        const handleTouchEnd = () => {
            setSwiping(false)
            isHorizontalRef.current = null
            // Released before full reveal — snap back to center
            if (!firedRef.current) setOffset(0)
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [canDelete, canEdit])

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

    return (
        <Box sx={{
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
            {/* Left action (edit) — revealed by swiping right; full reveal fires it */}
            {canEdit && (
                <Box
                    sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${ACTION_FRACTION * 100}%`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primaryYellow,
                        zIndex: 0,
                    }}>
                    <IconEdit size={22} color={colors.primaryBlack} />
                </Box>
            )}

            {/* Right action (delete) — revealed by swiping left; full reveal fires it */}
            {canDelete && (
                <Box
                    sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: `${ACTION_FRACTION * 100}%`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primaryRed,
                        zIndex: 0,
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
                    transition: swiping ? 'none' : 'transform 200ms cubic-bezier(0.25, 0.8, 0.25, 1)',
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
                    transition: swiping ? 'none' : 'transform 200ms cubic-bezier(0.25, 0.8, 0.25, 1)',
                    zIndex: 2,
                    pointerEvents: 'none',
                }} />
            )}

            {/* Sliding content — solid bg to cover action buttons when not swiped */}
            <Box
                ref={contentRef}
                sx={{
                    position: 'relative',
                    // Reserve horizontal gestures for the swipe handler; without
                    // this the browser can start a native scroll first, making
                    // preventDefault a no-op and the drag jittery
                    touchAction: 'pan-y',
                    transform: `translateX(${offset}px)`,
                    transition: swiping ? 'none' : 'transform 200ms cubic-bezier(0.25, 0.8, 0.25, 1)',
                    zIndex: 1,
                    backgroundColor,
                }}>
                {children}
            </Box>
        </Box>
    )
}
