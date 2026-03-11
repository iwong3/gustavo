'use client'

import { Box } from '@mui/material'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'

const ACTION_WIDTH = 72 // px width of each action button
const SWIPE_THRESHOLD = 40 // min px to trigger action reveal

interface SwipeableRowProps {
    children: React.ReactNode
    canEdit: boolean
    canDelete: boolean
    onEdit: () => void
    onDelete: () => void
    backgroundColor?: string
    showBottomBorder?: boolean
}

export const SwipeableRow = ({
    children,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    backgroundColor = colors.primaryWhite,
    showBottomBorder = false,
}: SwipeableRowProps) => {
    const [offset, setOffset] = useState(0)
    const [swiping, setSwiping] = useState(false)
    const startXRef = useRef(0)
    const startYRef = useRef(0)
    const currentOffsetRef = useRef(0)
    const isHorizontalRef = useRef<boolean | null>(null)
    const offsetRef = useRef(0) // mirror of offset state for native listeners
    const contentRef = useRef<HTMLDivElement>(null)

    const maxSwipeLeft = canDelete ? -ACTION_WIDTH : 0
    const maxSwipeRight = canEdit ? ACTION_WIDTH : 0

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
        }

        const handleTouchMove = (e: TouchEvent) => {
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
            e.preventDefault()
            setSwiping(true)

            let newOffset = currentOffsetRef.current + dx

            // Clamp to action widths with resistance beyond
            if (newOffset < maxSwipeLeft) {
                newOffset = maxSwipeLeft + (newOffset - maxSwipeLeft) * 0.2
            } else if (newOffset > maxSwipeRight) {
                newOffset = maxSwipeRight + (newOffset - maxSwipeRight) * 0.2
            }

            setOffset(newOffset)
        }

        const handleTouchEnd = () => {
            setSwiping(false)
            isHorizontalRef.current = null

            const current = offsetRef.current
            // Snap to action or back to center
            if (current < -SWIPE_THRESHOLD && canDelete) {
                setOffset(maxSwipeLeft)
            } else if (current > SWIPE_THRESHOLD && canEdit) {
                setOffset(maxSwipeRight)
            } else {
                setOffset(0)
            }
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [maxSwipeLeft, maxSwipeRight, canDelete, canEdit])

    const resetSwipe = useCallback(() => {
        setOffset(0)
    }, [])

    if (!canEdit && !canDelete) {
        return (
            <Box sx={{
                ...(showBottomBorder && {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }),
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
        }}>
            {/* Left action (edit) — revealed by swiping right */}
            {canEdit && (
                <Box
                    onClick={() => { resetSwipe(); onEdit() }}
                    sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: ACTION_WIDTH,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primaryYellow,
                        cursor: 'pointer',
                        zIndex: 0,
                    }}>
                    <IconEdit size={22} color={colors.primaryBlack} />
                </Box>
            )}

            {/* Right action (delete) — revealed by swiping left */}
            {canDelete && (
                <Box
                    onClick={() => { resetSwipe(); onDelete() }}
                    sx={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: ACTION_WIDTH,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.primaryRed,
                        cursor: 'pointer',
                        zIndex: 0,
                    }}>
                    <IconTrash size={22} color={colors.primaryWhite} />
                </Box>
            )}

            {/* Sliding content — solid bg to cover action buttons when not swiped */}
            <Box
                ref={contentRef}
                sx={{
                    position: 'relative',
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
