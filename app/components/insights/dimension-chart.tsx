'use client'

import { colors, hardShadow } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { SlidingToggle } from 'components/sliding-toggle'
import { useWindowSize } from 'hooks/useWindowSize'

import { Graph } from 'components/graphs/graph'

import type { ChartDatum, Dimension, PersonMetric } from 'hooks/useDashboardData'

interface DimensionChartProps {
    dimension: Dimension
    onDimensionChange: (dim: Dimension) => void
    data: ChartDatum[]
    selectedKey: string | null
    onBarClick: (index: number) => void
    personMetric: PersonMetric
    onPersonMetricChange: (metric: PersonMetric) => void
}

const dimensionOptions = [
    { value: 'person', label: 'Person' },
    { value: 'category', label: 'Category' },
    { value: 'location', label: 'Location' },
]

const personMetricOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'spent', label: 'Net Spent' },
]

export function DimensionChart({
    dimension,
    onDimensionChange,
    data,
    selectedKey,
    onBarClick,
    personMetric,
    onPersonMetricChange,
}: DimensionChartProps) {
    const { width: windowWidth } = useWindowSize()
    const chartWidth = Math.min((windowWidth || 390) * 0.9, 420)

    // Build graph-compatible arrays from ChartDatum[]
    const graphData: [string, number][] = data.map((d) => [d.label, d.value])
    const barColors = data.map((d) => d.color)
    const activeData = selectedKey
        ? data.map((d) => d.key === selectedKey)
        : undefined

    return (
        <Box sx={{ width: '100%' }}>
            {/* Dimension toggle */}
            <Box sx={{ marginBottom: 2 }}>
                <SlidingToggle
                    value={dimension}
                    options={dimensionOptions}
                    onChange={(val) => onDimensionChange(val as Dimension)}
                    fontSize={13}
                    borderWidth={1}
                />
            </Box>

            {/* Person metric toggle (Paid vs Net Spent) */}
            {dimension === 'person' && (
                <Box sx={{ marginBottom: 2, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ maxWidth: 200, width: '100%' }}>
                        <SlidingToggle
                            value={personMetric}
                            options={personMetricOptions}
                            onChange={(val) => onPersonMetricChange(val as PersonMetric)}
                            fontSize={12}
                            borderWidth={1}
                        />
                    </Box>
                </Box>
            )}

            {/* Bar chart */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                {data.length > 0 ? (
                    <Graph
                        data={graphData}
                        width={chartWidth}
                        height={chartWidth * 0.6}
                        barColors={barColors}
                        activeData={activeData}
                        onBarClick={onBarClick}
                    />
                ) : (
                    <Box
                        sx={{
                            ...hardShadow,
                            borderRadius: '8px',
                            backgroundColor: colors.primaryWhite,
                            width: chartWidth,
                            height: 120,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                        <Typography
                            sx={{
                                color: 'text.secondary',
                                fontSize: 13,
                            }}>
                            No data to display
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
