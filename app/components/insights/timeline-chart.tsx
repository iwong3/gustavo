'use client'

import { cardSx, colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { BarStack } from '@visx/shape'

import { useWindowSize } from 'hooks/useWindowSize'
import { FormattedMoney } from 'utils/currency'

import type { TimelineDataPoint } from 'hooks/useDashboardData'

interface TimelineChartProps {
    data: TimelineDataPoint[]
    categories: { name: string; color: string }[]
}

type StackDatum = {
    date: string
    [category: string]: number | string
}

const fmt = FormattedMoney('USD', 0)

const margin = { top: 12, right: 8, bottom: 28, left: 48 }

export function TimelineChart({ data, categories }: TimelineChartProps) {
    const { width: windowWidth } = useWindowSize()
    const containerWidth = Math.min((windowWidth || 390) * 0.9, 420)

    if (data.length === 0) {
        return (
            <Box sx={{ width: '100%' }}>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: colors.primaryBlack,
                        marginBottom: 1,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                    }}>
                    Daily Spend
                </Typography>
                <Box
                    sx={{
                        ...cardSx,
                        borderRadius: '8px',
                        width: containerWidth,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                        No data to display
                    </Typography>
                </Box>
            </Box>
        )
    }

    // Transform data for visx BarStack — each datum is { date, [cat]: amount }
    const keys = categories.map((c) => c.name)
    const colorScale = scaleOrdinal<string, string>({
        domain: keys,
        range: categories.map((c) => c.color),
    })

    const stackData: StackDatum[] = data.map((d) => {
        const datum: StackDatum = { date: d.date }
        for (const seg of d.segments) {
            datum[seg.category] = seg.value
        }
        // Fill missing categories with 0
        for (const key of keys) {
            if (!(key in datum)) datum[key] = 0
        }
        return datum
    })

    // Sizing — allow horizontal scroll for long trips
    const barsLimit = 14
    const minWidth = containerWidth - margin.left - margin.right
    const innerWidth = Math.max(
        (data.length / barsLimit) * minWidth,
        minWidth
    )
    const totalSvgWidth = innerWidth + margin.left + margin.right
    const chartHeight = containerWidth * 0.5
    const innerHeight = chartHeight - margin.top - margin.bottom

    const xScale = scaleBand<string>({
        domain: stackData.map((d) => d.date),
        range: [0, innerWidth],
        padding: 0.25,
    })

    const yMax = Math.max(...data.map((d) => d.total), 1)
    const yScale = scaleLinear<number>({
        domain: [0, yMax * 1.05],
        range: [innerHeight, 0],
        nice: true,
    })

    return (
        <Box sx={{ width: '100%' }}>
            <Typography
                sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.primaryBlack,
                    marginBottom: 1,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}>
                Daily Spend
            </Typography>

            {/* Chart container */}
            <Box
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                sx={{
                    ...cardSx,
                    borderRadius: '8px',
                    padding: 1,
                    width: containerWidth,
                    overflowX: data.length > barsLimit ? 'scroll' : 'hidden',
                }}>
                <svg width={totalSvgWidth} height={chartHeight}>
                    <defs>
                        <filter id="stack-bar-shadow" x="-5%" y="-5%" width="120%" height="120%">
                            <feDropShadow dx="1" dy="1" stdDeviation="0" floodColor={colors.primaryBlack} floodOpacity="1" />
                        </filter>
                    </defs>
                    <Group top={margin.top} left={margin.left}>
                        <BarStack<StackDatum, string>
                            data={stackData}
                            keys={keys}
                            x={(d) => d.date}
                            xScale={xScale}
                            yScale={yScale}
                            color={colorScale}>
                            {(barStacks) =>
                                barStacks.map((barStack) =>
                                    barStack.bars.map((bar) => (
                                        <rect
                                            key={`bar-stack-${barStack.index}-${bar.index}`}
                                            x={bar.x}
                                            y={bar.y}
                                            height={bar.height}
                                            width={bar.width}
                                            fill={bar.color}
                                            stroke={colors.primaryBlack}
                                            strokeWidth={0.75}
                                            rx={2}
                                            filter="url(#stack-bar-shadow)"
                                            style={{
                                                transition: 'all 0.2s',
                                            }}
                                        />
                                    ))
                                )
                            }
                        </BarStack>
                        <AxisLeft
                            scale={yScale}
                            numTicks={4}
                            tickFormat={(v) => fmt.format(v as number)}
                            stroke={colors.primaryBlack}
                            tickStroke={colors.primaryBlack}
                            tickLabelProps={() => ({
                                fill: colors.primaryBlack,
                                fontSize: 9,
                                textAnchor: 'end' as const,
                                dy: '0.33em',
                                dx: -4,
                            })}
                            hideTicks
                        />
                        <AxisBottom
                            top={innerHeight}
                            scale={xScale}
                            stroke={colors.primaryBlack}
                            tickStroke={colors.primaryBlack}
                            tickLabelProps={() => ({
                                fill: colors.primaryBlack,
                                fontSize: 10,
                                textAnchor: 'middle' as const,
                            })}
                            hideTicks
                        />
                    </Group>
                </svg>
            </Box>

            {/* Legend */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    marginTop: 1.5,
                    paddingX: 0.5,
                }}>
                {categories.map((cat) => (
                    <Box
                        key={cat.name}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                        }}>
                        <Box
                            sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: cat.color,
                                border: `1px solid ${colors.primaryBlack}`,
                                flexShrink: 0,
                            }}
                        />
                        <Typography
                            sx={{
                                fontSize: 11,
                                color: 'text.secondary',
                            }}>
                            {cat.name}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
