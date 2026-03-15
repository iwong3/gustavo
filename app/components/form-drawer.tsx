'use client'

import { colors } from '@/lib/colors'
import { Box } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
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
    const handleRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    // Mount/unmount with slide animation
    useEffect(() => {
        if (open) {
            setMounted(true)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true))
            })
        } else {
            setVisible(false)
            const timer = setTimeout(() => setMounted(false), 300)
            return () => clearTimeout(timer)
        }
    }, [open])

    // Drag-to-dismiss: only from the handle zone
    useEffect(() => {
        const handle = handleRef.current
        const panel = panelRef.current
        if (!handle || !panel || !open) return

        let startY = 0
        let dragOffset = 0
        let active = false

        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY
            dragOffset = 0
            active = true
            // Kill the CSS transition so drag feels immediate
            panel.style.transition = 'none'
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (!active) return
            e.preventDefault()

            const deltaY = e.touches[0].clientY - startY
            dragOffset = Math.max(0, deltaY)
            panel.style.transform = `translateY(${dragOffset}px)`
        }

        const handleTouchEnd = () => {
            if (!active) return
            active = false

            if (dragOffset > DISMISS_THRESHOLD) {
                // Animate off-screen, then close
                panel.style.transition = 'transform 0.25s ease-out'
                panel.style.transform = `translateY(${window.innerHeight}px)`
                setTimeout(() => {
                    onCloseRef.current()
                    panel.style.transition = ''
                    panel.style.transform = ''
                }, 250)
            } else {
                // Snap back
                panel.style.transition = 'transform 0.25s ease-out'
                panel.style.transform = ''
            }

            dragOffset = 0
        }

        handle.addEventListener('touchstart', handleTouchStart, { passive: true })
        handle.addEventListener('touchmove', handleTouchMove, { passive: false })
        handle.addEventListener('touchend', handleTouchEnd, { passive: true })
        handle.addEventListener('touchcancel', handleTouchEnd, { passive: true })

        return () => {
            handle.removeEventListener('touchstart', handleTouchStart)
            handle.removeEventListener('touchmove', handleTouchMove)
            handle.removeEventListener('touchend', handleTouchEnd)
            handle.removeEventListener('touchcancel', handleTouchEnd)
        }
    }, [open])

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
                {/* Drag handle zone — tall enough to grab easily */}
                <Box
                    ref={handleRef}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 28,
                        cursor: 'grab',
                        flexShrink: 0,
                        touchAction: 'none',
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
