'use client'

import { colors } from '@/lib/colors'
import { Box, Slide } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const HEADER_HEIGHT = 56
const DISMISS_THRESHOLD = 120

type Props = {
    open: boolean
    onClose: () => void
    children: React.ReactNode
}

export default function FormDrawer({ open, onClose, children }: Props) {
    const panelRef = useRef<HTMLDivElement>(null)
    const [dragOffset, setDragOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)

    // Refs for touch tracking (no re-renders during drag)
    const touchStartY = useRef(0)
    const gestureDecided = useRef(false)
    const gestureDragging = useRef(false)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    const findScrollContainer = useCallback((): HTMLElement | null => {
        if (!panelRef.current) return null
        const candidates = panelRef.current.querySelectorAll('*')
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i] as HTMLElement
            const style = window.getComputedStyle(el)
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                return el
            }
        }
        return null
    }, [])

    // Native event listeners for non-passive touchmove
    useEffect(() => {
        const panel = panelRef.current
        if (!panel || !open) return

        const handleTouchStart = (e: TouchEvent) => {
            touchStartY.current = e.touches[0].clientY
            gestureDecided.current = false
            gestureDragging.current = false
        }

        const handleTouchMove = (e: TouchEvent) => {
            const deltaY = e.touches[0].clientY - touchStartY.current

            if (!gestureDecided.current) {
                if (Math.abs(deltaY) < 5) return

                const scrollContainer = findScrollContainer()
                const scrollTop = scrollContainer?.scrollTop ?? 0

                if (deltaY > 0 && scrollTop <= 0) {
                    gestureDecided.current = true
                    gestureDragging.current = true
                } else {
                    gestureDecided.current = true
                    gestureDragging.current = false
                    return
                }
            }

            if (!gestureDragging.current) return

            e.preventDefault()
            const offset = Math.max(0, deltaY)
            setDragOffset(offset)
            setIsDragging(true)
        }

        const handleTouchEnd = () => {
            if (gestureDragging.current) {
                // Read current dragOffset from the DOM transform to avoid stale closure
                const currentOffset = panelRef.current
                    ? parseFloat(
                          panelRef.current.style.transform?.replace('translateY(', '').replace('px)', '') || '0'
                      )
                    : 0
                if (currentOffset > DISMISS_THRESHOLD) {
                    onCloseRef.current()
                }
                setDragOffset(0)
                setIsDragging(false)
            }
            gestureDecided.current = false
            gestureDragging.current = false
        }

        panel.addEventListener('touchstart', handleTouchStart, { passive: true })
        panel.addEventListener('touchmove', handleTouchMove, { passive: false })
        panel.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            panel.removeEventListener('touchstart', handleTouchStart)
            panel.removeEventListener('touchmove', handleTouchMove)
            panel.removeEventListener('touchend', handleTouchEnd)
        }
    }, [open, findScrollContainer])

    if (typeof document === 'undefined') return null

    return createPortal(
        <>
            {/* Backdrop (transparent, just catches clicks to close) */}
            {open && (
                <Box
                    onClick={onClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1400,
                    }}
                />
            )}

            {/* Drawer panel */}
            <Slide
                direction="up"
                in={open}
                mountOnEnter
                unmountOnExit
                easing={{ enter: 'ease-out', exit: 'ease-in' }}
                timeout={300}>
                <Box
                    ref={panelRef}
                    sx={{
                        position: 'fixed',
                        top: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px) + 8px)`,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.primaryWhite,
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        borderTop: `2px solid ${colors.primaryBlack}`,
                        boxShadow: `2px -2px 0px ${colors.primaryBlack}`,
                        zIndex: 1500,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
                        transition: isDragging ? 'none' : 'transform 0.25s ease-out',
                    }}>
                    {/* Drag handle */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            py: 1,
                            cursor: 'grab',
                            flexShrink: 0,
                        }}>
                        <Box
                            sx={{
                                width: 36,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: `${colors.primaryBlack}30`,
                            }}
                        />
                    </Box>
                    {children}
                </Box>
            </Slide>
        </>,
        document.body
    )
}
