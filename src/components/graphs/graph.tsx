import { Box } from '@mui/material'
import { Label } from '@visx/annotation'
import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { SortOrder as CostOrder, useSortCostStore } from 'components/menu/sort/sort-cost'
import { FormattedMoney } from 'helpers/currency'

interface GraphProps {
    data: [string, number][]
    width?: number
    height?: number
    barColors?: string[]
    activeData?: boolean[]
}

interface GraphData {
    value: number
    label: string
    barColor: string
    isActive: boolean
}

export const Graph = ({ data, width, height, barColors, activeData }: GraphProps) => {
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
                barColor: barColors ? barColors[index % barColors.length] : '#F4D35E',
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
    const graphWidth = width && width !== 0 ? width : window.innerWidth * 0.9
    const graphHeight = height && height !== 0 ? height : graphWidth
    const marginY = 12

    // scroll logic
    const barsLimit = 10
    const totalWidth = Math.max((graphData.length / barsLimit) * graphWidth, graphWidth)

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
                border: '1px solid #FBBC04',
                borderRadius: '10px',
                backgroundColor: '#FFFCEE',
                // backgroundImage: 'linear-gradient(0.125turn, #fffcee, #fff8ef)',
                boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                overflowX: 'scroll',
            }}>
            <svg width={totalWidth} height={graphHeight}>
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
                            yLabel === 0 ? marginY : graphHeight - (yScale(yLabel) ?? 0)
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
                                    filter={
                                        atLeastOneActive && !data.isActive
                                            ? 'brightness(0.75)'
                                            : 'none'
                                    }
                                    style={{
                                        WebkitFilter:
                                            atLeastOneActive && !data.isActive
                                                ? 'brightness(0.75)'
                                                : 'none',
                                        transition: 'all 0.2s',
                                    }}
                                />
                                {/* Spend label */}
                                <Label
                                    title={FormattedMoney('USD', 0).format(yLabel)}
                                    titleProps={{
                                        textAnchor: 'middle',
                                    }}
                                    x={barX}
                                    y={barY - 2}
                                    width={barWidth}
                                    horizontalAnchor="start"
                                    titleFontSize={12}
                                    backgroundFill="none"
                                    showAnchorLine={false}
                                />
                                {/* Percentage label */}
                                {yLabel !== 0 && (
                                    <Label
                                        title={percentageString + '%'}
                                        titleProps={{
                                            textAnchor: 'middle',
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
                <AxisBottom top={graphHeight - 2 * marginY} scale={xScale} numTicks={data.length} />
            </svg>
        </Box>
    )
}
