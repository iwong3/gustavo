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
                barColor: barColors ? barColors[index] : '#F4D35E',
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

    const xData = graphData.map((data) => data.label)

    const xScale = scaleBand<string>({
        range: [0, graphWidth],
        domain: xData,
        padding: 0.3,
    })

    const yMax = Math.max(...graphData.map((data) => data.value))
    const yScale = scaleLinear<number>({
        range: [graphHeight - 1.5 * marginY, 4 * marginY],
        domain: [0, yMax],
    })

    // aesthetic properties
    const atLeastOneActive = graphData.some((data) => data.isActive)

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 1,
                border: '1px solid #FBBC04',
                borderRadius: '10px',
                backgroundColor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
            }}>
            <svg width={graphWidth} height={graphHeight}>
                <rect width={graphWidth} height={graphHeight} fill="none" rx={14} />
                <Group>
                    {graphData.map((data, index) => {
                        const yLabel = data.value
                        const percentage = (yLabel / totalValue) * 100

                        const barWidth = xScale.bandwidth()
                        const barHeight = graphHeight - (yScale(yLabel) ?? 0)
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
                                <Label
                                    title={percentage.toFixed(0) + '%'}
                                    titleProps={{
                                        textAnchor: 'middle',
                                    }}
                                    x={barX}
                                    y={graphHeight - 14}
                                    width={barWidth}
                                    horizontalAnchor="start"
                                    titleFontSize={12}
                                    backgroundFill="none"
                                    showAnchorLine={false}
                                />
                            </g>
                        )
                    })}
                </Group>
                <AxisBottom top={graphHeight - 2 * marginY} scale={xScale} />
            </svg>
        </Box>
    )
}
