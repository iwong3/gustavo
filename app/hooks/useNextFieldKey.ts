'use client'

import { useCallback, useEffect, useRef } from 'react'

// Inputs that pop a typing keyboard (same idea as useScrollFocusedInput).
// Textareas are left out on purpose: Enter there is a newline, and jumping
// into an optional notes field isn't useful.
const NON_TYPING = new Set([
    'date', 'time', 'datetime-local', 'month', 'checkbox', 'radio',
    'button', 'submit', 'file', 'range', 'color', 'hidden',
])

function typedInputs(root: HTMLElement): HTMLInputElement[] {
    return Array.from(root.querySelectorAll('input')).filter(
        (el) =>
            !el.readOnly &&
            !el.disabled &&
            !NON_TYPING.has(el.type) &&
            el.tabIndex !== -1 && // MUI Select's hidden native input
            el.getAttribute('aria-hidden') !== 'true' &&
            el.offsetParent !== null // rendered (not in a collapsed section)
    )
}

/**
 * The keyboard's return key on a form: "Next" moves to the next typed field
 * (skipping pickers — dates, dropdowns, chips), and on the last one shows
 * "Done" and just closes the keyboard. It never saves: forms have pickers
 * below the typed fields, so an Enter-to-save would fire before you've set
 * them — Save stays a deliberate tap.
 *
 * Spread `{ ref, onKeyDown }` onto the fields container (FormPage does).
 */
export function useNextFieldKey<T extends HTMLElement>() {
    const ref = useRef<T | null>(null)

    // Label the key per field — re-run every render, since fields come and go
    useEffect(() => {
        const root = ref.current
        if (!root) return
        const inputs = typedInputs(root)
        inputs.forEach((el, i) => {
            el.enterKeyHint = i < inputs.length - 1 ? 'next' : 'done'
        })
    })

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing) return
        const target = e.target
        const root = ref.current
        if (!(target instanceof HTMLInputElement) || !root) return
        // An open suggestion list (place / people search) owns Enter
        if (target.getAttribute('aria-expanded') === 'true') return
        const inputs = typedInputs(root)
        const i = inputs.indexOf(target)
        if (i === -1) return
        e.preventDefault()
        const next = inputs[i + 1]
        if (next) next.focus()
        else target.blur() // Done: drop the keyboard
    }, [])

    return { ref, onKeyDown }
}
