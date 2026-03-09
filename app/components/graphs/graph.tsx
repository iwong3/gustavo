import { Box } from '@mui/material'
import { Label } from '@visx/annotation'
import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { cardSx, colors } from '@/lib/colors'
import {
    SortOrder as CostOrder,
    useSortCostStore,
} from 'components/menu/sort/sort-cost'
import { FormattedMoney } from 'utils/currency'

interface GraphProps {
    data: [string, number][]
    width?: number
    height?: number
    barColors?: string[]
    activeData?: boolean[]
    onBarClick?: (index: number) => void
}

interface GraphData {
    value: number
    label: string
    barColor: string
    isActive: boolean
}

export const Graph = ({
    data,
    width,
    height,
    barColors,
    activeData,
    onBarClick,
}: GraphProps) => {
    const [graphData, setGraphData] = useState<GraphData[]>([])
    const [totalValue, setTotalValue] = useState<number>(0)

    const { order: costOrder } = useSortCostStore(useShallow((state) => state))

    useEffect(() => {
        let graphData: GraphData[] = []
        let totalValue = 0
        data.forEach(([label, value], index) => {
            graphData.push({
                value: value,
                label: label,
                barColor: barColors
                    ? barColors[index % barColors.length]
                    : '#F4D35E',
                isActive: activeData ? activeData[index] : true,
            })
            totalValue += value
        })

        if (costOrder === CostOrder.Descending) {
            graphData = graphData.sort((a, b) => b.value - a.value)
        } else if (costOrder === CostOrder.Ascending) {
            graphData = graphData.sort((a, b) => a.value - b.value)
        }

        setGraphData(graphData)
        setTotalValue(totalValue)
    }, [data, costOrder])

    // graph properties
    const graphWidth = width && width !== 0 ? width : 350
    const graphHeight = height && height !== 0 ? height : graphWidth
    const marginY = 12

    // scroll logic
    const barsLimit = 10
    const totalWidth = Math.max(
        (graphData.length / barsLimit) * graphWidth,
        graphWidth
    )

    // data and scales
    const xData = graphData.map((data) => data.label)

    const xScale = scaleBand<string>({
        range: [0, totalWidth],
        domain: xData,
        padding: 0.3,
    })

    const yMax = Math.max(...graphData.map((data) => data.value))
    const yScale = scaleLinear<number>({
        range: [graphHeight - 2 * marginY, 4 * marginY],
        domain: [0, yMax],
    })

    // aesthetic properties
    const atLeastOneActive = graphData.some((data) => data.isActive)

    return (
        <Box
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            sx={{
                padding: 1,
                width: graphWidth,
                ...cardSx,
                borderRadius: '8px',
                overflowX: 'scroll',
            }}>
            <svg width={totalWidth} height={graphHeight}>
                <defs>
                    <filter id="bar-shadow" x="-5%" y="-5%" width="120%" height="120%">
                        <feDropShadow dx="1" dy="1" stdDeviation="0" floodColor={colors.primaryBlack} floodOpacity="1" />
                    </filter>
                </defs>
                <Group>
                    {graphData.map((data, index) => {
                        const yLabel = data.value
                        const percentage = (yLabel / totalValue) * 100
                        let percentageString = percentage.toFixed(0)
                        if (percentageString === '0') {
                            percentageString = '<1'
                        }

                        const barWidth = xScale.bandwidth()
                        const barHeight =
                            yLabel === 0
                                ? marginY
                                : graphHeight - (yScale(yLabel) ?? 0)
                        const barX = xScale(data.label) ?? 0
                        const barY = graphHeight - barHeight - marginY

                        return (
                            <g key={'graph-bar-' + index}>
                                <Bar
                                    x={barX}
                                    y={barY - marginY}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={data.barColor}
                                    stroke={colors.primaryBlack}
                                    strokeWidth={1}
                                    rx={3}
                                    filter={
                                        atLeastOneActive && !data.isActive
                                            ? 'brightness(0.75)'
                                            : 'url(#bar-shadow)'
                                    }
                                    style={{
                                        WebkitFilter:
                                            atLeastOneActive && !data.isActive
                                                ? 'brightness(0.75)'
                                                : undefined,
                                        transition: 'all 0.2s',
                                        cursor: onBarClick ? 'pointer' : 'default',
                                    }}
                                    onClick={() => onBarClick?.(index)}
                                />
                                {/* Spend label */}
                                <Label
                                    title={FormattedMoney('USD', 0).format(
                                        yLabel
                                    )}
                                    titleProps={{
                                        textAnchor: 'middle',
                                        fill: colors.primaryBlack,
                                    }}
                                    x={barX}
                                    y={barY - 2}
                                    width={barWidth}
                                    horizontalAnchor="start"
                                    titleFontSize={12}
                                    titleFontWeight={700}
                                    backgroundFill="none"
                                    showAnchorLine={false}
                                />
                                {/* Percentage label */}
                                {yLabel !== 0 && (
                                    <Label
                                        title={percentageString + '%'}
                                        titleProps={{
                                            textAnchor: 'middle',
                                            fill: colors.primaryBlack,
                                        }}
                                        x={barX}
                                        y={graphHeight - 14}
                                        width={barWidth}
                                        horizontalAnchor="start"
                                        titleFontSize={10}
                                        backgroundFill="none"
                                        showAnchorLine={false}
                                    />
                                )}
                            </g>
                        )
                    })}
                </Group>
                <AxisBottom
                    top={graphHeight - 2 * marginY}
                    scale={xScale}
                    numTicks={data.length}
                    stroke={colors.primaryBlack}
                    tickStroke={colors.primaryBlack}
                    tickLabelProps={() => ({
                        fill: colors.primaryBlack,
                        fontSize: 11,
                        fontWeight: 600,
                        textAnchor: 'middle' as const,
                    })}
                    hideTicks
                />
            </svg>
        </Box>
    )
}
