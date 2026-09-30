'use client'

import { Box } from '@mui/material'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { colors, pressTextSx } from '@/lib/colors'

/**
 * Flat text tabs — the chosen one bold, with one underline that slides to it
 * (measured, since the labels differ in width); it snaps on first paint and
 * under reduced motion. For switches that sit inside or beside a box, where
 * a boxed toggle would read as a box in a box (the workout calendar's range,
 * the Categories / People sorts). Stretches to its container's height, so a
 * 38px strip gives 38px tap targets.
 */
export function FlatTabs<T extends string>({
    value,
    options,
    onChange,
    ariaLabel,
}: {
    value: T
    options: readonly { value: T; label: string }[]
    onChange: (value: T) => void
    ariaLabel: string
}) {
    const listRef = useRef<HTMLDivElement>(null)
    const labelRefs = useRef<Partial<Record<T, HTMLSpanElement | null>>>({})
    const [bar, setBar] = useState<{
        left: number
        width: number
        top: number
    } | null>(null)
    const [animate, setAnimate] = useState(false)

    useLayoutEffect(() => {
        const measure = () => {
            const el = labelRefs.current[value]
            if (el)
                setBar({
                    left: el.offsetLeft,
                    width: el.offsetWidth,
                    top: el.offsetTop + el.offsetHeight,
                })
        }
        measure()
        // Web fonts landing (or a resize) move the labels
        const ro = new ResizeObserver(measure)
        if (listRef.current) ro.observe(listRef.current)
        return () => ro.disconnect()
    }, [value])
    // Only slide once it has been placed
    useEffect(() => {
        if (bar && !animate) requestAnimationFrame(() => setAnimate(true))
    }, [bar, animate])

    return (
        <Box
            ref={listRef}
            role="tablist"
            aria-label={ariaLabel}
            sx={{
                position: 'relative',
                display: 'flex',
                alignSelf: 'stretch',
                flexShrink: 0,
            }}>
            {options.map((o) => {
                const on = o.value === value
                return (
                    <Box
                        key={o.value}
                        component="button"
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onChange(o.value)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            border: 'none',
                            background: 'none',
                            font: 'inherit',
                            cursor: 'pointer',
                            ...pressTextSx,
                        }}>
                        <Box
                            component="span"
                            ref={(el: HTMLSpanElement | null) => {
                                labelRefs.current[o.value] = el
                            }}
                            sx={{
                                fontSize: 11.5,
                                fontWeight: on ? 800 : 600,
                                letterSpacing: '0.04em',
                                lineHeight: 1.2,
                                // Room for the underline, so the text sits where it did
                                padding: '3px 0 5px',
                                color: on
                                    ? colors.primaryBlack
                                    : colors.primaryBrown,
                                transition: 'color 0.15s',
                                whiteSpace: 'nowrap',
                            }}>
                            {o.label}
                        </Box>
                    </Box>
                )
            })}
            {bar && (
                <Box
                    aria-hidden
                    sx={{
                        'position': 'absolute',
                        'left': 0,
                        'top': bar.top - 2,
                        'width': bar.width,
                        'height': 2,
                        'borderRadius': '1px',
                        'backgroundColor': colors.primaryBlack,
                        'transform': `translateX(${bar.left}px)`,
                        // The app's sliding-toggle easing: fast start, soft landing
                        'transition': animate
                            ? 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), width 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)'
                            : 'none',
                        '@media (prefers-reduced-motion: reduce)': {
                            transition: 'none',
                        },
                        'pointerEvents': 'none',
                    }}
                />
            )}
        </Box>
    )
}
