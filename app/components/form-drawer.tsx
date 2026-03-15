'use client'

import { colors } from '@/lib/colors'
import { Box } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const HEADER_HEIGHT = 56
const DISMISS_THRESHOLD = 120
const SCROLL_LOCK_TIMEOUT = 300

type Props = {
    open: boolean
    onClose: () => void
    children: React.ReactNode
}

/**
 * Walk from the touch target up the DOM tree. If any scrollable ancestor
 * has scrollTop > 0, the user is mid-scroll and we must yield to native scrolling.
 * This is the standard "scrollTop gating" algorithm used by vaul, MUI SwipeableDrawer, etc.
 */
function shouldDrag(target: EventTarget | null, panelEl: HTMLElement): boolean {
    let el = target as HTMLElement | null
    while (el && el !== panelEl) {
        const style = window.getComputedStyle(el)
        const isScrollable =
            (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
            el.scrollHeight > el.clientHeight
        if (isScrollable && el.scrollTop > 0) {
            return false
        }
        el = el.parentElement
    }
    return true
}

export default function FormDrawer({ open, onClose, children }: Props) {
    const panelRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)

    // Stable ref for onClose so touch handlers don't go stale
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

    // ── Touch gesture handling ───────────────────────────────────────────
    useEffect(() => {
        const panel = panelRef.current
        if (!panel || !open) return

        let startY = 0
        let dragOffset = 0
        let decided = false       // Have we classified this gesture?
        let dragging = false      // Is it a drag (vs scroll)?
        let lastScrollTime = 0    // For scroll lock timeout

        // Track when content scrolls — suppress drag briefly after
        const handleScroll = () => {
            lastScrollTime = Date.now()
        }

        // Attach scroll listener to all scrollable descendants
        const scrollables: HTMLElement[] = []
        panel.querySelectorAll('*').forEach((el) => {
            const style = window.getComputedStyle(el)
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                const htmlEl = el as HTMLElement
                scrollables.push(htmlEl)
                htmlEl.addEventListener('scroll', handleScroll, { passive: true })
            }
        })

        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].clientY
            dragOffset = 0
            decided = false
            dragging = false
        }

        const handleTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY
            const deltaY = currentY - startY

            if (!decided) {
                // Wait for enough movement to decide
                if (Math.abs(deltaY) < 8) return

                // Scroll lock: if content was scrolling recently, don't drag
                if (Date.now() - lastScrollTime < SCROLL_LOCK_TIMEOUT) {
                    decided = true
                    dragging = false
                    return
                }

                // Walk from touch target up — if any scrollable ancestor has scrollTop > 0, yield
                if (deltaY > 0 && shouldDrag(e.target, panel)) {
                    decided = true
                    dragging = true
                } else {
                    decided = true
                    dragging = false
                    return
                }
            }

            if (!dragging) return

            // We've committed to dragging — suppress native scroll
            e.preventDefault()

            dragOffset = Math.max(0, deltaY)
            panel.style.transition = 'none'
            panel.style.transform = `translateY(${dragOffset}px)`
        }

        const handleTouchEnd = () => {
            if (!dragging) {
                decided = false
                return
            }

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
            decided = false
            dragging = false
        }

        panel.addEventListener('touchstart', handleTouchStart, { passive: true })
        panel.addEventListener('touchmove', handleTouchMove, { passive: false })
        panel.addEventListener('touchend', handleTouchEnd, { passive: true })
        panel.addEventListener('touchcancel', handleTouchEnd, { passive: true })

        return () => {
            panel.removeEventListener('touchstart', handleTouchStart)
            panel.removeEventListener('touchmove', handleTouchMove)
            panel.removeEventListener('touchend', handleTouchEnd)
            panel.removeEventListener('touchcancel', handleTouchEnd)
            scrollables.forEach((el) => el.removeEventListener('scroll', handleScroll))
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
