'use client'

import { useCallback, useEffect, useRef } from 'react'

// Gap between the top of the scroll area and the focused input.
const TOP_BUFFER = 48
// Scroll animation — quick and snappy, one clean move.
const SCROLL_MS = 200
// Wait this long on blur before restoring, so focus hopping to a sibling
// field doesn't trigger a restore-then-rescroll.
const BLUR_GRACE_MS = 60
// Below this, treat the input as already at the target and don't move it.
const MIN_DELTA = 4

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

// Only soft-keyboard devices auto-scroll. On desktop (fine pointer) focusing an
// input hides nothing, so any scroll would just be unexplained motion.
const expectsKeyboard = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Nearest overflow-scrolling ancestor (e.g. #main-scroll in the app layout),
// falling back to the document scroller (e.g. the dev gallery, which scrolls
// the body).
const getScroller = (el: HTMLElement): HTMLElement => {
    let node = el.parentElement
    while (node) {
        const { overflowY } = getComputedStyle(node)
        if (overflowY === 'auto' || overflowY === 'scroll') return node
        node = node.parentElement
    }
    return (document.scrollingElement as HTMLElement) ?? document.documentElement
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Keyboard-aware focus scrolling for forms inside a fixed-position scroller.
 *
 * On a touch device, when a text input is focused it glides to TOP_BUFFER below
 * the top of the scroll area in one quick (~200ms) animated scroll — so the
 * mobile keyboard never covers it. If the field sits near the bottom and there
 * isn't enough content beneath it to reach the top, we grow the scroll content
 * with invisible bottom padding just enough to get there ("bottoming out").
 *
 * On blur we glide back to the furthest-down position that still has no empty
 * space below the content — which only actually moves when we bottomed out,
 * putting the last field back at the bottom — then drop the extra padding.
 *
 * Both moves are a single rAF tween (retargetable mid-flight, so switching
 * fields never resets to the top first), and honor prefers-reduced-motion. On
 * desktop the whole thing is inert.
 *
 * Usage: spread the returned handlers onto the form's fields container:
 *   const focusScroll = useScrollFocusedInput()
 *   <Box {...focusScroll}>...fields...</Box>
 */
export function useScrollFocusedInput() {
    const scrollerRef = useRef<HTMLElement | null>(null)
    const containerRef = useRef<HTMLElement | null>(null)
    const targetRef = useRef<HTMLElement | null>(null)
    // The container's own bottom padding, and the extra we've added for room.
    const basePadRef = useRef<number | null>(null)
    const addedPadRef = useRef(0)
    const cancelAnimRef = useRef<() => void>(() => {})
    const blurTimerRef = useRef<number | null>(null)

    // Undo any whole-page push iOS makes to reveal a focused input (it drags
    // the fixed header off-screen). Skipped for the document scroller, where
    // window scroll IS the position we're animating.
    const pinWindow = useCallback(() => {
        const s = scrollerRef.current
        if (
            s &&
            s !== document.scrollingElement &&
            window.scrollY !== 0
        ) {
            window.scrollTo(0, 0)
        }
    }, [])

    // Single retargetable scroll tween. Starting a new one cancels the old from
    // wherever it is (no snap-to-start), so field-to-field moves stay smooth.
    const animate = useCallback(
        (to: number, onDone?: () => void) => {
            cancelAnimRef.current()
            const el = scrollerRef.current
            if (!el) return
            const from = el.scrollTop
            const dist = to - from
            if (prefersReducedMotion() || Math.abs(dist) < 1) {
                el.scrollTop = to
                cancelAnimRef.current = () => {}
                onDone?.()
                return
            }
            let raf = 0
            let start = 0
            const step = (ts: number) => {
                if (!start) start = ts
                const p = Math.min(1, (ts - start) / SCROLL_MS)
                el.scrollTop = from + dist * easeOutCubic(p)
                pinWindow()
                if (p < 1) {
                    raf = requestAnimationFrame(step)
                } else {
                    cancelAnimRef.current = () => {}
                    onDone?.()
                }
            }
            raf = requestAnimationFrame(step)
            cancelAnimRef.current = () => cancelAnimationFrame(raf)
        },
        [pinWindow]
    )

    const clearRoom = useCallback(() => {
        const c = containerRef.current
        if (c && addedPadRef.current > 0) {
            c.style.paddingBottom = basePadRef.current
                ? `${basePadRef.current}px`
                : ''
        }
        addedPadRef.current = 0
        basePadRef.current = null
    }, [])

    const detach = useCallback(() => {
        cancelAnimRef.current()
        cancelAnimRef.current = () => {}
        window.visualViewport?.removeEventListener('resize', pinWindow)
        window.visualViewport?.removeEventListener('scroll', pinWindow)
        clearRoom()
        targetRef.current = null
    }, [pinWindow, clearRoom])

    // Restore everything if the form unmounts mid-focus.
    useEffect(
        () => () => {
            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current)
            detach()
        },
        [detach]
    )

    const onFocus = useCallback(
        (e: React.FocusEvent<HTMLElement>) => {
            if (!expectsKeyboard()) return
            const target = e.target
            if (!isTypingTarget(target)) return
            const container = e.currentTarget
            const scroller = getScroller(container)

            scrollerRef.current = scroller
            pinWindow()

            // Target: the input sits TOP_BUFFER below the visible top. That
            // top is stable while the keyboard animates in, so we can aim for
            // it immediately without re-correcting.
            const vvTop = window.visualViewport?.offsetTop ?? 0
            const scrollerTop =
                scroller === document.scrollingElement
                    ? 0
                    : scroller.getBoundingClientRect().top
            const visibleTop = Math.max(scrollerTop, vvTop)
            const delta =
                target.getBoundingClientRect().top - visibleTop - TOP_BUFFER

            // Already at the target line (e.g. a top field) — leave it be.
            if (Math.abs(delta) <= MIN_DELTA) return

            if (blurTimerRef.current) {
                window.clearTimeout(blurTimerRef.current)
                blurTimerRef.current = null
            }
            targetRef.current = target
            containerRef.current = container

            const desired = scroller.scrollTop + delta

            // Grow the content so a bottom field can reach the top. Only ever
            // grow within a session — shrinking mid-session would clamp the
            // scroll and yank the view; the extra room is removed on blur.
            const naturalMax =
                scroller.scrollHeight -
                addedPadRef.current -
                scroller.clientHeight
            const need = Math.max(0, Math.ceil(desired) - naturalMax)
            if (need > addedPadRef.current) {
                if (basePadRef.current === null) {
                    basePadRef.current =
                        parseFloat(getComputedStyle(container).paddingBottom) ||
                        0
                }
                container.style.paddingBottom = `${basePadRef.current + need}px`
                addedPadRef.current = need
            }

            window.visualViewport?.addEventListener('resize', pinWindow)
            window.visualViewport?.addEventListener('scroll', pinWindow)

            const max = scroller.scrollHeight - scroller.clientHeight
            animate(Math.max(0, Math.min(desired, max)))
        },
        [pinWindow, animate]
    )

    const onBlur = useCallback(
        (e: React.FocusEvent<HTMLElement>) => {
            if (!expectsKeyboard()) return
            if (!isTypingTarget(e.target)) return
            const container = e.currentTarget
            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current)
            blurTimerRef.current = window.setTimeout(() => {
                blurTimerRef.current = null
                // Focus may have just hopped to another field in the form.
                const active = document.activeElement
                if (isTypingTarget(active) && container.contains(active)) return

                const scroller = scrollerRef.current
                if (!scroller) {
                    detach()
                    return
                }
                // Settle to the furthest-down position with no empty space
                // below the content. Equals the current position unless we
                // bottomed out — so middle fields don't move, bottom fields
                // glide back down to sit at the bottom. Drop the room after.
                const naturalMax =
                    scroller.scrollHeight -
                    addedPadRef.current -
                    scroller.clientHeight
                const settle = Math.max(
                    0,
                    Math.min(scroller.scrollTop, naturalMax)
                )
                animate(settle, detach)
            }, BLUR_GRACE_MS)
        },
        [animate, detach]
    )

    return { onFocus, onBlur }
}
