'use client'

import { Box, TextField } from '@mui/material'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { useCallback, useEffect, useRef } from 'react'

import { colors, pressShadowSx } from '@/lib/colors'
import { errorFieldSx, fieldSx } from '@/lib/form-styles'

const HOLD_DELAY_MS = 400 // press-and-hold: first repeat after this…
const REPEAT_MS = 90 // …then every this…
const FAST_AFTER = 10 // …and 5× steps after this many repeats

/**
 * A number field with − / + buttons either side, for nudging a pre-filled
 * value (e.g. today's weight from yesterday's) instead of retyping it.
 * Tapping the number still opens the decimal pad. Hold a button to repeat,
 * accelerating the longer it's held.
 */
export function StepperField({
    value,
    onChange,
    step,
    decimals,
    min = 0,
    error = false,
    placeholder,
    autoFocus,
    width = 200,
    ariaLabel,
}: {
    value: string
    onChange: (value: string) => void
    step: number
    /** Decimal places shown after a step (0.1 steps → 1). */
    decimals: number
    min?: number
    error?: boolean
    placeholder?: string
    autoFocus?: boolean
    width?: number
    ariaLabel: string
}) {
    // Latest value for the hold-to-repeat timer, which outlives renders
    const valueRef = useRef(value)
    useEffect(() => {
        valueRef.current = value
    }, [value])

    const nudge = useCallback(
        (direction: 1 | -1, times = 1) => {
            const current = parseFloat(valueRef.current)
            const base = Number.isFinite(current) ? current : min
            // Round to the displayed precision so 0.1 steps never show
            // float noise like 185.29999
            const next = Math.max(min, base + direction * step * times)
            const text = next.toFixed(decimals)
            valueRef.current = text
            onChange(text)
        },
        [min, step, decimals, onChange]
    )

    const timers = useRef<{ hold?: number; repeat?: number }>({})
    const stop = useCallback(() => {
        window.clearTimeout(timers.current.hold)
        window.clearInterval(timers.current.repeat)
        timers.current = {}
    }, [])
    useEffect(() => stop, [stop])

    const start = (direction: 1 | -1) => (e: React.PointerEvent) => {
        e.preventDefault() // keep focus (and the keyboard) where it was
        stop()
        nudge(direction)
        let repeats = 0
        timers.current.hold = window.setTimeout(() => {
            timers.current.repeat = window.setInterval(() => {
                repeats += 1
                nudge(direction, repeats > FAST_AFTER ? 5 : 1)
            }, REPEAT_MS)
        }, HOLD_DELAY_MS)
    }

    const buttonSx = {
        width: 40,
        height: 40,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        cursor: 'pointer',
        backgroundColor: colors.primaryWhite,
        color: colors.primaryBlack,
        border: `1px solid ${colors.primaryBlack}`,
        borderRadius: '4px',
        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
        touchAction: 'manipulation', // no double-tap zoom on fast taps
        userSelect: 'none',
        ...pressShadowSx,
    } as const

    const button = (direction: 1 | -1) => (
        <Box
            component="button"
            type="button"
            aria-label={`${direction > 0 ? 'Increase' : 'Decrease'} ${ariaLabel}`}
            onPointerDown={start(direction)}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            // Keyboard / screen-reader activation (no pointer events)
            onClick={(e: React.MouseEvent) => {
                if (e.detail === 0) nudge(direction)
            }}
            sx={buttonSx}>
            {direction > 0 ? <IconPlus size={18} stroke={2.5} /> : <IconMinus size={18} stroke={2.5} />}
        </Box>
    )

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width }}>
            {button(-1)}
            <TextField
                value={value}
                onChange={(e) => onChange(e.target.value)}
                size="small"
                type="number"
                autoFocus={autoFocus}
                placeholder={placeholder}
                slotProps={{
                    htmlInput: {
                        'inputMode': 'decimal',
                        'step': String(step),
                        'min': String(min),
                        'aria-label': ariaLabel,
                        'style': { textAlign: 'center' },
                    },
                }}
                sx={{ ...(error ? errorFieldSx : fieldSx), flex: 1, minWidth: 0 }}
            />
            {button(1)}
        </Box>
    )
}
