'use client'

import { Box } from '@mui/material'
import { useEffect, useState } from 'react'

import { colors } from '@/lib/colors'
import { TextBone } from 'components/skeleton/bones'

export type SlidingToggleOption = { value: string; label: string }

export function SlidingToggle({
    value,
    options,
    onChange,
    fontSize = 14,
    borderWidth = 2,
    paddingY = 0.75,
    loading = false,
}: {
    value: string
    options: SlidingToggleOption[]
    onChange: (value: string) => void
    fontSize?: number
    borderWidth?: 1 | 2
    paddingY?: number
    /**
     * The value isn't known yet: same frame and size, pulsing bars instead
     * of labels, not tappable. The real toggle then takes its place with the
     * selection already set — nothing shown and then swapped.
     */
    loading?: boolean
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

    const frameSx = {
        position: 'relative',
        display: 'flex',
        backgroundColor: colors.primaryWhite,
        border: `${borderWidth}px solid ${colors.primaryBlack}`,
        borderRadius: 1,
        boxShadow:
            borderWidth === 2
                ? `3px 4px 0px ${colors.primaryBlack}`
                : `2px 2px 0px ${colors.primaryBlack}`,
        overflow: 'hidden',
    } as const
    const segmentSx = (i: number) =>
        ({
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingY,
            paddingX: 1.5,
            borderRight:
                i < options.length - 1
                    ? `${borderWidth}px solid ${colors.primaryBlack}`
                    : 'none',
        }) as const

    if (loading) {
        return (
            <Box sx={frameSx} aria-busy="true">
                {options.map((opt, i) => (
                    <Box key={opt.value} sx={segmentSx(i)}>
                        <TextBone fontSize={fontSize} width="60%" />
                    </Box>
                ))}
            </Box>
        )
    }

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                backgroundColor: colors.primaryWhite,
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
                        // Quick and snappy: fast start, soft landing
                        transition: hasTransition
                            ? 'left 0.16s cubic-bezier(0.2, 0.9, 0.3, 1)'
                            : 'none',
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
                        'paddingY': paddingY,
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
                        // Hover only with a real pointer (sticks on touch)
                        '@media (hover: hover)': {
                            '&:hover': {
                                backgroundColor:
                                    value !== opt.value
                                        ? 'rgba(0,0,0,0.04)'
                                        : 'transparent',
                            },
                        },
                    }}>
                    {opt.label}
                </Box>
            ))}
        </Box>
    )
}
