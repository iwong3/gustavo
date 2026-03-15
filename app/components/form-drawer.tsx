'use client'

import { colors } from '@/lib/colors'
import { Box } from '@mui/material'
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
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    // Drag state — use refs for perf, only setState for final render
    const dragOffsetRef = useRef(0)
    const touchStartY = useRef(0)
    const gestureDecided = useRef(false)
    const gestureDragging = useRef(false)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    // Mount/unmount with animation
    useEffect(() => {
        if (open) {
            setMounted(true)
            // Trigger slide-up on next frame after mount
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setVisible(true)
                })
            })
        } else {
            setVisible(false)
            // Unmount after transition completes
            const timer = setTimeout(() => setMounted(false), 300)
            return () => clearTimeout(timer)
        }
    }, [open])

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

    // Apply drag offset directly to DOM for performance (no React re-renders)
    const applyDragOffset = useCallback((offset: number, animate: boolean) => {
        const panel = panelRef.current
        if (!panel) return
        if (animate) {
            panel.style.transition = 'transform 0.25s ease-out'
        } else {
            panel.style.transition = 'none'
        }
        if (offset > 0) {
            panel.style.transform = `translateY(${offset}px)`
        } else {
            panel.style.transform = ''
        }
    }, [])

    // Touch event listeners — capture phase to intercept before scroll container
    useEffect(() => {
        const panel = panelRef.current
        if (!panel || !open) return

        const handleTouchStart = (e: TouchEvent) => {
            touchStartY.current = e.touches[0].clientY
            gestureDecided.current = false
            gestureDragging.current = false
            dragOffsetRef.current = 0
        }

        const handleTouchMove = (e: TouchEvent) => {
            const deltaY = e.touches[0].clientY - touchStartY.current

            if (!gestureDecided.current) {
                if (Math.abs(deltaY) < 8) return

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
            e.stopPropagation()

            const offset = Math.max(0, deltaY)
            dragOffsetRef.current = offset
            applyDragOffset(offset, false)
        }

        const handleTouchEnd = () => {
            if (gestureDragging.current) {
                if (dragOffsetRef.current > DISMISS_THRESHOLD) {
                    // Animate off-screen then close
                    applyDragOffset(window.innerHeight, true)
                    setTimeout(() => {
                        onCloseRef.current()
                        applyDragOffset(0, false)
                    }, 250)
                } else {
                    // Snap back
                    applyDragOffset(0, true)
                }
                dragOffsetRef.current = 0
            }
            gestureDecided.current = false
            gestureDragging.current = false
        }

        // Use capture phase so we see events before the scroll container
        panel.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true })
        panel.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
        panel.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true })

        return () => {
            panel.removeEventListener('touchstart', handleTouchStart, { capture: true })
            panel.removeEventListener('touchmove', handleTouchMove, { capture: true })
            panel.removeEventListener('touchend', handleTouchEnd, { capture: true })
        }
    }, [open, findScrollContainer, applyDragOffset])

    if (typeof document === 'undefined' || !mounted) return null

    return createPortal(
        <>
            {/* Backdrop */}
            <Box
                onClick={onClose}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1400,
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            />

            {/* Drawer panel */}
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
                    transform: visible ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.3s ease-out',
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
        </>,
        document.body
    )
}
