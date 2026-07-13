'use client'

import { Box, Typography } from '@mui/material'
import { useLayoutEffect, useState } from 'react'

import { cardSx, colors } from '@/lib/colors'
import type { MySpendChartDatum, MySpendDimension } from 'hooks/useMySpendData'

const CHART_AREA_HEIGHT = 150
const BAR_MAX_HEIGHT = 118
const MIN_BAR_WIDTH = 30

const formatUsd = (n: number) =>
    n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    })

// Bar that animates to its target height on mount and on every change.
// Mounting from 0 makes tab/person switches "grow in"; later data changes
// morph from the current height via the CSS transition.
function AnimatedBar({ height, color }: { height: number; color: string }) {
    const [animatedHeight, setAnimatedHeight] = useState(0)

    useLayoutEffect(() => {
        // Double rAF: let the browser paint the current height first so the
        // transition has a starting frame
        let raf2: number
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setAnimatedHeight(height))
        })
        return () => {
            cancelAnimationFrame(raf1)
            cancelAnimationFrame(raf2)
        }
    }, [height])

    return (
        <Box
            sx={{
                width: '100%',
                height: animatedHeight,
                backgroundColor: color,
                border: `1px solid ${colors.primaryBlack}`,
                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
                '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                },
            }}
        />
    )
}

interface MySpendChartProps {
    data: MySpendChartDatum[]
    /** Keys bars by dimension so switching tabs remounts (re-grows) them. */
    dimension: MySpendDimension
    selectedKey: string | null
    onBarClick: (key: string) => void
}

export function MySpendChart({
    data,
    dimension,
    selectedKey,
    onBarClick,
}: MySpendChartProps) {
    const max = Math.max(...data.map((d) => d.value), 1)

    if (data.length === 0) {
        return (
            <Box
                sx={{
                    ...cardSx,
                    width: '100%',
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                    No data to display
                </Typography>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                ...cardSx,
                width: '100%',
                paddingY: 1.5,
                paddingX: 1,
                // Wide day domains scroll inside the card, never the page
                overflowX: 'auto',
            }}>
            <Box
                sx={{
                    minWidth: data.length * MIN_BAR_WIDTH,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 0.75,
                        height: CHART_AREA_HEIGHT,
                    }}>
                    {data.map((d) => {
                        const dimmed =
                            selectedKey !== null && selectedKey !== d.key
                        const barHeight = Math.max(
                            (d.value / max) * BAR_MAX_HEIGHT,
                            d.value > 0 ? 4 : 1
                        )
                        return (
                            <Box
                                key={`${dimension}|${d.key}`}
                                onClick={() => onBarClick(d.key)}
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    cursor: 'pointer',
                                }}>
                                <Typography
                                    sx={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                        whiteSpace: 'nowrap',
                                        marginBottom: '3px',
                                        opacity: dimmed ? 0.4 : 1,
                                    }}>
                                    {d.value > 0 ? formatUsd(d.value) : ''}
                                </Typography>
                                <Box
                                    sx={{
                                        width: '100%',
                                        opacity: dimmed ? 0.3 : 1,
                                        transition: 'opacity 0.15s',
                                    }}>
                                    <AnimatedBar
                                        height={barHeight}
                                        color={d.color}
                                    />
                                </Box>
                            </Box>
                        )
                    })}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, marginTop: 0.5 }}>
                    {data.map((d) => (
                        <Typography
                            key={`${dimension}|${d.key}-label`}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                textAlign: 'center',
                                fontSize: 10,
                                fontWeight: 600,
                                color: colors.primaryBrown,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                            {d.label}
                        </Typography>
                    ))}
                </Box>
            </Box>
        </Box>
    )
}
