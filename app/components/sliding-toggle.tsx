'use client'

import { Box } from '@mui/material'
import { useEffect, useState } from 'react'

import { colors } from '@/lib/colors'

export type SlidingToggleOption = { value: string; label: string }

export function SlidingToggle({
    value,
    options,
    onChange,
    fontSize = 14,
    borderWidth = 2,
}: {
    value: string
    options: SlidingToggleOption[]
    onChange: (value: string) => void
    fontSize?: number
    borderWidth?: 1 | 2
}) {
    const activeIndex = options.findIndex((o) => o.value === value)
    const count = options.length
    const widthPct = 100 / count
    const leftPct = activeIndex >= 0 ? activeIndex * widthPct : 0
    const [hasTransition, setHasTransition] = useState(false)

    useEffect(() => {
        if (activeIndex >= 0 && !hasTransition) {
            requestAnimationFrame(() => setHasTransition(true))
        }
    }, [activeIndex, hasTransition])

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                border: `${borderWidth}px solid ${colors.primaryBlack}`,
                borderRadius: 1,
                boxShadow:
                    borderWidth === 2
                        ? `3px 4px 0px ${colors.primaryBlack}`
                        : `2px 2px 0px ${colors.primaryBlack}`,
                overflow: 'hidden',
            }}>
            {/* Sliding yellow indicator */}
            {activeIndex >= 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        height: '100%',
                        backgroundColor: colors.primaryYellow,
                        transition: hasTransition ? 'left 0.25s ease' : 'none',
                        zIndex: 0,
                    }}
                />
            )}
            {options.map((opt, i) => (
                <Box
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    sx={{
                        'position': 'relative',
                        'zIndex': 1,
                        'flex': 1,
                        'display': 'flex',
                        'alignItems': 'center',
                        'justifyContent': 'center',
                        'paddingY': 0.75,
                        'paddingX': 1.5,
                        'fontSize': fontSize,
                        'fontWeight': value === opt.value ? 600 : 400,
                        'color': colors.primaryBlack,
                        'cursor': 'pointer',
                        'userSelect': 'none',
                        'borderRight':
                            i < options.length - 1
                                ? `${borderWidth}px solid ${colors.primaryBlack}`
                                : 'none',
                        '&:hover': {
                            backgroundColor:
                                value !== opt.value
                                    ? 'rgba(0,0,0,0.04)'
                                    : 'transparent',
                        },
                    }}>
                    {opt.label}
                </Box>
            ))}
        </Box>
    )
}
