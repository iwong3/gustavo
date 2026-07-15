'use client'

import { useCallback, useEffect, useRef } from 'react'

// Gap between the visible top of the scroller and the focused input — keeps
// the field's label visible above it.
const TOP_BUFFER = 48
// Re-sync points after focus: the keyboard finishes animating somewhere in
// this window. visualViewport events also trigger a sync, but iOS doesn't
// always fire them (e.g. when focus moves between fields with the keyboard
// already open).
const SETTLE_PASSES_MS = [250, 600]
// First-focus estimate before a real keyboard has been measured. Overshooting
// is harmless — the scroller is just briefly shorter than needed.
const KEYBOARD_ESTIMATE = 350
// Ignore small visual-viewport insets (URL bar collapse etc.) — a real
// on-screen keyboard is big.
const MIN_KEYBOARD = 100

// Last measured keyboard height — remembered across focuses and forms so the
// first frame of a focus is right on devices we've seen a keyboard on.
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

// Only touch devices get the keyboard-avoidance resizing — desktop has no
// on-screen keyboard.
const expectsKeyboard = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches

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

// Height of the on-screen keyboard overlapping the layout viewport, measured
// via visualViewport. documentElement.clientHeight is the layout viewport and
// does NOT shrink with the keyboard (window.innerHeight does on iOS).
const measureKeyboard = () => {
    const vv = window.visualViewport
    if (!vv) return 0
    return Math.max(
        0,
        document.documentElement.clientHeight - (vv.offsetTop + vv.height)
    )
}

/**
 * Native-style keyboard avoidance for forms living inside a fixed-position
 * scroll container (#main-scroll).
 *
 * iOS handles focused inputs inside fixed scrollers badly: instead of
 * scrolling the scroller, it often shoves the whole visual viewport up —
 * dragging the fixed header off-screen — and leaves the input wherever it
 * lands. So while a typing input is focused we take over completely:
 *
 * 1. Shrink the scroller so it ends at the keyboard's top edge (synced from
 *    visualViewport). Nothing is ever hidden behind the keyboard, so iOS has
 *    no reason to push the viewport — and bottom fields gain the scroll room
 *    to reach the top.
 * 2. Instantly snap the focused input TOP_BUFFER below the scroller's top.
 * 3. Undo any viewport push iOS attempts anyway (window pin + re-snap on
 *    visualViewport resize/scroll).
 *
 * Everything restores on blur.
 *
 * Usage: spread the returned handlers onto the form's container element:
 *   const focusScroll = useScrollFocusedInput()
 *   <Box {...focusScroll}>...fields...</Box>
 */
export function useScrollFocusedInput() {
    const targetRef = useRef<HTMLElement | null>(null)
    const scrollerRef = useRef<HTMLElement | null>(null)
    const baseBottomRef = useRef<number | null>(null)
    const haveMeasuredRef = useRef(false)
    const passTimers = useRef<number[]>([])
    const blurTimer = useRef<number | null>(null)

    const sync = useCallback((initial: boolean) => {
        const target = targetRef.current
        const scroller = scrollerRef.current
        if (!target || !scroller || document.activeElement !== target) return

        const isElementScroller = scroller !== document.scrollingElement

        // Undo any whole-page push from iOS (it drags the fixed header
        // off-screen). Never for the document scroller — there window scroll
        // IS the scroll position we manage.
        if (isElementScroller && window.scrollY > 0) window.scrollTo(0, 0)

        const measured = measureKeyboard()
        if (measured > MIN_KEYBOARD) {
            lastKeyboardHeight = measured
            haveMeasuredRef.current = true
        }
        // Until the keyboard has actually opened this focus session, assume
        // the remembered height; after that, trust live measurements (so a
        // dismissed keyboard restores the scroller).
        const kb = haveMeasuredRef.current
            ? measured
            : Math.max(measured, lastKeyboardHeight)

        // End the scroller at the keyboard top. The scroller may only SHRINK
        // while typing continues: growing it back reduces the max scroll and
        // clamps scrollTop, yanking the view toward the form top (the "reset
        // then move down" flicker on field switches). It grows back only on a
        // real keyboard dismissal — or in detach().
        if (isElementScroller && expectsKeyboard()) {
            if (baseBottomRef.current === null) {
                baseBottomRef.current =
                    parseFloat(getComputedStyle(scroller).bottom) || 0
            }
            const applied = parseFloat(scroller.style.bottom) || 0
            const dismissed =
                haveMeasuredRef.current && measured < MIN_KEYBOARD
            const next = dismissed ? 0 : Math.max(applied, kb)
            scroller.style.bottom =
                next > baseBottomRef.current ? `${next}px` : ''
        }

        // vv.offsetTop covers any viewport push that survived the pin above.
        const vv = window.visualViewport
        const vvTop = vv?.offsetTop ?? 0
        const bounds = isElementScroller
            ? scroller.getBoundingClientRect()
            : { top: 0, bottom: document.documentElement.clientHeight }
        const visibleTop = Math.max(bounds.top, vvTop)
        const rect = target.getBoundingClientRect()
        const delta = rect.top - visibleTop - TOP_BUFFER

        if (initial) {
            // Snap the input near the visible top, instantly.
            if (Math.abs(delta) >= 8) {
                scroller.scrollBy({ top: delta, behavior: 'auto' })
            }
            return
        }
        // Corrective passes: only re-scroll if the input actually drifted out
        // of view (above the top edge, or down behind the keyboard). Constant
        // re-snapping reads as flicker and fights the user's own scrolling.
        const visibleBottom = Math.min(
            bounds.bottom,
            vv ? vvTop + vv.height : bounds.bottom
        )
        const outOfView =
            rect.top < visibleTop + 8 || rect.bottom > visibleBottom - 8
        if (outOfView && Math.abs(delta) >= 8) {
            scroller.scrollBy({ top: delta, behavior: 'auto' })
        }
    }, [])

    // Stable zero-arg wrapper for timers and viewport listeners (passing
    // `sync` directly would make the Event object truthy as `initial`).
    const correct = useCallback(() => sync(false), [sync])

    const detach = useCallback(() => {
        for (const t of passTimers.current) window.clearTimeout(t)
        passTimers.current = []
        window.visualViewport?.removeEventListener('resize', correct)
        window.visualViewport?.removeEventListener('scroll', correct)
        targetRef.current = null
        haveMeasuredRef.current = false
        const scroller = scrollerRef.current
        if (scroller && scroller !== document.scrollingElement) {
            scroller.style.bottom = ''
        }
    }, [correct])

    // Restore everything if the form unmounts mid-focus
    useEffect(
        () => () => {
            detach()
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
        },
        [detach]
    )

    const onFocus = useCallback(
        (e: React.FocusEvent<HTMLElement>) => {
            const target = e.target
            if (!isTypingTarget(target)) return
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
            for (const t of passTimers.current) window.clearTimeout(t)
            passTimers.current = []

            targetRef.current = target
            scrollerRef.current = getScroller(e.currentTarget)

            // Same handler reference → duplicate adds are no-ops
            window.visualViewport?.addEventListener('resize', correct)
            window.visualViewport?.addEventListener('scroll', correct)

            sync(true)
            for (const delay of SETTLE_PASSES_MS) {
                passTimers.current.push(window.setTimeout(correct, delay))
            }
        },
        [sync, correct]
    )

    const onBlur = useCallback(
        (e: React.FocusEvent<HTMLElement>) => {
            if (!isTypingTarget(e.target)) return
            const container = e.currentTarget
            if (blurTimer.current) window.clearTimeout(blurTimer.current)
            // Restore only once the keyboard is really gone. Focus often just
            // moves to another field — iOS can take a beat to deliver the new
            // focus, and restoring the scroller in that gap clamps the scroll
            // position and yanks the view. While the keyboard is still up,
            // keep waiting (a dismissed keyboard closes within ~2 checks).
            const settle = () => {
                blurTimer.current = null
                const active = document.activeElement
                if (isTypingTarget(active) && container.contains(active)) {
                    return
                }
                if (expectsKeyboard() && measureKeyboard() > MIN_KEYBOARD) {
                    blurTimer.current = window.setTimeout(settle, 250)
                    return
                }
                detach()
            }
            blurTimer.current = window.setTimeout(settle, 250)
        },
        [detach]
    )

    return { onFocus, onBlur }
}
