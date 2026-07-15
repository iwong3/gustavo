'use client'

import { useCallback, useEffect, useRef } from 'react'

// Gap between the top of the scroller and the focused input — enough to keep
// the field's label visible above it.
const TOP_BUFFER = 48
// Corrective passes after focus: the keyboard finishes animating somewhere in
// this window, and iOS's native reveal-on-focus can drag the scroll position
// around during it. Each pass re-measures and snaps back if we drifted.
const SETTLE_PASSES_MS = [250, 600]
// Estimated keyboard height for the very first focus, before we've measured a
// real one. Overshoot is invisible (the padding hides under the keyboard).
const KEYBOARD_ESTIMATE = 350

// Last measured keyboard height — remembered across focuses and forms so the
// bottom padding is exact from the first frame of subsequent focuses.
let lastKeyboardHeight = KEYBOARD_ESTIMATE

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

// Only touch devices get the keyboard padding — desktop has no on-screen
// keyboard, and adding/removing an estimated padding there causes scroll jumps.
const expectsKeyboard = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches

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

// Instantly put the input TOP_BUFFER below the scroller's top edge.
const snapToTop = (scroller: HTMLElement, target: HTMLElement) => {
    const delta =
        target.getBoundingClientRect().top -
        scrollerBounds(scroller).top -
        TOP_BUFFER
    if (Math.abs(delta) < 8) return
    scroller.scrollBy({ top: delta, behavior: 'auto' })
}

/**
 * Keeps the focused text input near the top of the scroll container so the
 * mobile keyboard never hides it. The browser's default reveal-on-focus
 * behavior is unreliable inside a fixed-position scroller (it often leaves the
 * input behind the keyboard), so this scrolls explicitly — instantly on focus
 * (winning the race against the native reveal), with corrective passes while
 * the keyboard animates in. While an input is focused, the form container gets
 * bottom padding matching the keyboard height so even the last field has room
 * to scroll up.
 *
 * Usage: spread the returned handlers onto the form's container element:
 *   const focusScroll = useScrollFocusedInput()
 *   <Box {...focusScroll}>...fields...</Box>
 */
export function useScrollFocusedInput() {
    const passTimers = useRef<number[]>([])
    const blurTimer = useRef<number | null>(null)
    const containerRef = useRef<HTMLElement | null>(null)

    const clearPasses = () => {
        for (const t of passTimers.current) window.clearTimeout(t)
        passTimers.current = []
    }

    useEffect(
        () => () => {
            clearPasses()
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
        clearPasses()

        const scroller = getScroller(container)

        // Padding first (so there's room), then snap — all synchronous, before
        // the browser's own reveal logic runs.
        if (expectsKeyboard()) {
            container.style.paddingBottom = `${lastKeyboardHeight}px`
        }
        snapToTop(scroller, target)

        for (const delay of SETTLE_PASSES_MS) {
            passTimers.current.push(
                window.setTimeout(() => {
                    if (document.activeElement !== target) return
                    const kb = keyboardOverlap(scrollerBounds(scroller).bottom)
                    if (kb > 0) {
                        lastKeyboardHeight = kb
                        container.style.paddingBottom = `${kb}px`
                    }
                    snapToTop(scroller, target)
                }, delay)
            )
        }
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
            clearPasses()
            container.style.paddingBottom = ''
        }, 100)
    }, [])

    return { onFocus, onBlur }
}
