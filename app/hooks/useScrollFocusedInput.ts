'use client'

import { useCallback, useEffect, useRef } from 'react'

// Gap between the top of the scroller and the focused input — enough to keep
// the field's label visible above it.
const TOP_BUFFER = 72
// Mobile keyboards animate open; measure/scroll after they settle.
const KEYBOARD_SETTLE_MS = 300

// Inputs that pop a typing keyboard. Pickers (date, select) handle themselves.
const isTypingTarget = (el: EventTarget | null): el is HTMLElement => {
    if (el instanceof HTMLTextAreaElement) return !el.readOnly
    if (el instanceof HTMLInputElement) {
        if (el.readOnly) return false
        return ![
            'date',
            'time',
            'datetime-local',
            'month',
            'checkbox',
            'radio',
            'button',
            'submit',
            'file',
            'range',
            'color',
        ].includes(el.type)
    }
    return false
}

// Nearest overflow-scrolling ancestor (e.g. #main-scroll in the app layout),
// falling back to the document scroller (e.g. the dev gallery, which scrolls
// the body). Deliberately no scrollHeight check: the ancestor may only become
// scrollable once the keyboard padding is applied.
const getScroller = (el: HTMLElement): HTMLElement => {
    let node = el.parentElement
    while (node) {
        const { overflowY } = getComputedStyle(node)
        if (overflowY === 'auto' || overflowY === 'scroll') return node
        node = node.parentElement
    }
    return (document.scrollingElement as HTMLElement) ?? document.documentElement
}

// The scroller's visible box in layout-viewport coordinates.
const scrollerBounds = (scroller: HTMLElement) => {
    if (scroller === document.scrollingElement) {
        return { top: 0, bottom: document.documentElement.clientHeight }
    }
    const rect = scroller.getBoundingClientRect()
    return { top: rect.top, bottom: rect.bottom }
}

// How much of the scroller the on-screen keyboard covers. Measured against
// the visual viewport (not window.innerHeight, which iOS Safari shrinks along
// with the keyboard). 0 on desktop and while the keyboard is closed.
const keyboardOverlap = (scrollerBottom: number) => {
    const vv = window.visualViewport
    if (!vv) return 0
    const visibleBottom = vv.offsetTop + vv.height
    return Math.max(0, scrollerBottom - visibleBottom)
}

/**
 * Keeps the focused text input near the top of the scroll container so the
 * mobile keyboard never hides it. The browser's default reveal-on-focus
 * behavior is unreliable inside a fixed-position scroller (it often leaves the
 * input behind the keyboard), so this scrolls explicitly after the keyboard
 * settles. While an input is focused, the form container gets bottom padding
 * equal to the keyboard height so even the last field has room to scroll up.
 *
 * Usage: spread the returned handlers onto the form's container element:
 *   const focusScroll = useScrollFocusedInput()
 *   <Box {...focusScroll}>...fields...</Box>
 */
export function useScrollFocusedInput() {
    const focusTimer = useRef<number | null>(null)
    const blurTimer = useRef<number | null>(null)
    const containerRef = useRef<HTMLElement | null>(null)

    useEffect(
        () => () => {
            if (focusTimer.current) window.clearTimeout(focusTimer.current)
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
            if (containerRef.current) {
                containerRef.current.style.paddingBottom = ''
            }
        },
        []
    )

    const onFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
        const target = e.target
        if (!isTypingTarget(target)) return
        const container = e.currentTarget

        containerRef.current = container
        if (blurTimer.current) window.clearTimeout(blurTimer.current)
        if (focusTimer.current) window.clearTimeout(focusTimer.current)

        focusTimer.current = window.setTimeout(() => {
            focusTimer.current = null
            if (document.activeElement !== target) return

            const scroller = getScroller(container)
            const bounds = scrollerBounds(scroller)

            // Extra scroll room so fields near the bottom of the form can
            // still reach the top while the keyboard is up.
            const kb = keyboardOverlap(bounds.bottom)
            if (kb > 0) container.style.paddingBottom = `${kb}px`

            const delta =
                target.getBoundingClientRect().top - bounds.top - TOP_BUFFER
            if (Math.abs(delta) < 8) return
            scroller.scrollBy({ top: delta, behavior: 'smooth' })
        }, KEYBOARD_SETTLE_MS)
    }, [])

    const onBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
        if (!isTypingTarget(e.target)) return
        const container = e.currentTarget
        if (blurTimer.current) window.clearTimeout(blurTimer.current)
        // Wait a tick: focus may just be moving to another field in the form.
        blurTimer.current = window.setTimeout(() => {
            blurTimer.current = null
            const active = document.activeElement
            if (isTypingTarget(active) && container.contains(active)) return
            container.style.paddingBottom = ''
        }, 100)
    }, [])

    return { onFocus, onBlur }
}
