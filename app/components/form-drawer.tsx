'use client'

import { colors } from '@/lib/colors'
import { Box } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const HEADER_HEIGHT = 56
const DISMISS_THRESHOLD = 120

// Sits at MUI's drawer layer (1200), below its modal layer (1300), so any
// Dialog opened from inside the drawer stacks above it. Drawers opened over
// drawers still stack correctly: same z-index, later portal wins.
const BACKDROP_Z_INDEX = 1190
const PANEL_Z_INDEX = 1200

type Props = {
    open: boolean
    onClose: () => void
    children: React.ReactNode
}

export default function FormDrawer({ open, onClose, children }: Props) {
    const panelRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [dragOffset, setDragOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const touchStartY = useRef(0)

    // Mount/unmount with slide animation
    useEffect(() => {
        if (open) {
            setMounted(true)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true))
            })
        } else {
            setVisible(false)
            setDragOffset(0)
            setIsDragging(false)
            const timer = setTimeout(() => setMounted(false), 300)
            return () => clearTimeout(timer)
        }
    }, [open])

    // React touch handlers on the drag handle — no timing issues with refs
    const onHandleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
        setIsDragging(true)
    }, [])

    const onHandleTouchMove = useCallback((e: React.TouchEvent) => {
        const deltaY = e.touches[0].clientY - touchStartY.current
        setDragOffset(Math.max(0, deltaY))
    }, [])

    const onHandleTouchEnd = useCallback(() => {
        if (dragOffset > DISMISS_THRESHOLD) {
            // Animate off, then close
            setDragOffset(window.innerHeight)
            setIsDragging(false) // re-enable transition for animate-out
            setTimeout(() => {
                onClose()
                setDragOffset(0)
            }, 250)
        } else {
            setDragOffset(0)
            setIsDragging(false)
        }
    }, [dragOffset, onClose])

    if (typeof document === 'undefined' || !mounted) return null

    // Compute transform: drag offset takes priority over slide animation
    const transform = dragOffset > 0
        ? `translateY(${dragOffset}px)`
        : visible
            ? 'translateY(0)'
            : 'translateY(100%)'

    // No transition while actively dragging (follow thumb), animate otherwise
    const transition = isDragging ? 'none' : 'transform 0.3s ease-out'

    return createPortal(
        <>
            {/* Backdrop */}
            <Box
                onClick={onClose}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: BACKDROP_Z_INDEX,
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
                    zIndex: PANEL_Z_INDEX,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transform,
                    transition,
                }}>
                {/* Drag handle zone */}
                <Box
                    onTouchStart={onHandleTouchStart}
                    onTouchMove={onHandleTouchMove}
                    onTouchEnd={onHandleTouchEnd}
                    onTouchCancel={onHandleTouchEnd}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 32,
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
                {/* Children wrapper */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                    }}>
                    {children}
                </Box>
            </Box>
        </>,
        document.body
    )
}
