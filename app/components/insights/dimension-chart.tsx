'use client'

import { colors, hardShadow } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { useWindowSize } from 'hooks/useWindowSize'

import { Graph } from 'components/graphs/graph'

import type { ChartDatum, Dimension } from 'hooks/useDashboardData'

interface DimensionChartProps {
    dimension: Dimension
    onDimensionChange: (dim: Dimension) => void
    data: ChartDatum[]
    selectedKey: string | null
    onBarClick: (index: number) => void
}

const dimensions: { key: Dimension; label: string }[] = [
    { key: 'person', label: 'Person' },
    { key: 'category', label: 'Category' },
    { key: 'location', label: 'Location' },
]

export function DimensionChart({
    dimension,
    onDimensionChange,
    data,
    selectedKey,
    onBarClick,
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
            {/* Dimension toggle — matches settings page ToggleButtonGroup style */}
            <Box
                sx={{
                    display: 'flex',
                    border: `1px solid ${colors.primaryBlack}`,
                    borderRadius: '4px',
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                    overflow: 'hidden',
                    marginBottom: 2,
                    width: '100%',
                }}>
                {dimensions.map((dim, i) => {
                    const isActive = dimension === dim.key
                    return (
                        <Box
                            key={dim.key}
                            onClick={() => onDimensionChange(dim.key)}
                            sx={{
                                'flex': 1,
                                'display': 'flex',
                                'justifyContent': 'center',
                                'alignItems': 'center',
                                'paddingY': 1,
                                'cursor': 'pointer',
                                'userSelect': 'none',
                                'backgroundColor': isActive
                                    ? colors.primaryYellow
                                    : colors.primaryWhite,
                                'borderRight':
                                    i < dimensions.length - 1
                                        ? `1px solid ${colors.primaryBlack}`
                                        : 'none',
                                '&:active': { opacity: 0.7 },
                                'transition': 'background-color 0.15s',
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontWeight: isActive ? 700 : 500,
                                    color: colors.primaryBlack,
                                }}>
                                {dim.label}
                            </Typography>
                        </Box>
                    )
                })}
            </Box>

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
