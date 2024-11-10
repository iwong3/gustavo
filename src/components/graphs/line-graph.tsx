import { Box } from '@mui/material'
import { AxisBottom } from '@visx/axis'
import * as allCurves from '@visx/curve'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import {
    SortOrder as CostOrder,
    useSortCostStore,
} from 'components/menu/sort/sort-cost'

interface GraphProps {
    data: [string, number][][]
    width?: number
    height?: number
    lineColors?: string[]
    activeData?: boolean[]
}

interface GraphData {
    value: number
    label: string
    isActive: boolean
}

export const LineGraph = ({
    data,
    width,
    height,
    lineColors,
    activeData,
}: GraphProps) => {
    const [graphData, setGraphData] = useState<GraphData[][]>([])
    const [yMax, setYMax] = useState<number>(0)

    const { order: costOrder } = useSortCostStore(useShallow((state) => state))

    useEffect(() => {
        let graphData: GraphData[][] = []
        let yMax = 0

        data.forEach((lineData, index) => {
            let currentLineData: GraphData[] = []
            lineData.forEach(([label, value]) => {
                currentLineData.push({
                    value: value,
                    label: label,
                    isActive: activeData ? activeData[index] : true,
                })

                if (value > yMax) {
                    yMax = value
                }
            })

            if (costOrder === CostOrder.Descending) {
                currentLineData = currentLineData.sort(
                    (a, b) => b.value - a.value
                )
            } else if (costOrder === CostOrder.Ascending) {
                currentLineData = currentLineData.sort(
                    (a, b) => a.value - b.value
                )
            }

            graphData.push(currentLineData)
        })

        setGraphData(graphData)
        setYMax(yMax)
    }, [data, costOrder])

    // graph properties
    const graphWidth = width && width !== 0 ? width : window.innerWidth * 0.9
    const graphHeight = height && height !== 0 ? height : graphWidth
    const marginY = 12
    const numTicks = graphData.length > 0 ? graphData[0].length : 0

    // scroll logic
    const barsLimit = 10
    const totalWidth = Math.max((numTicks / barsLimit) * graphWidth, graphWidth)

    // data and scales
    const xData =
        graphData.length > 0 ? graphData[0].map((data) => data.label) : []

    const xScale = scaleBand<string>({
        range: [0, totalWidth],
        domain: xData,
        padding: 0.3,
    })

    const yScale = scaleLinear<number>({
        range: [graphHeight - 2 * marginY, 4 * marginY],
        domain: [0, yMax],
    })

    // aesthetic properties
    // const atLeastOneActive = graphData.some((data) => data.isActive)

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
                boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                overflowX: 'scroll',
            }}>
            <svg width={totalWidth} height={graphHeight}>
                <Group>
                    {graphData.map((data, index) => {
                        return (
                            <LinePath
                                curve={allCurves['curveBasis']}
                                stroke={
                                    lineColors ? lineColors[index] : '#F4D35E'
                                }
                                strokeWidth={2}
                                data={data}
                                x={(d) =>
                                    (xScale(d.label) ?? 0) +
                                    xScale.bandwidth() / 2
                                }
                                y={(d) => (yScale(d.value) ?? 0) - 1}
                            />
                        )
                    })}
                </Group>
                <AxisBottom
                    top={graphHeight - 2 * marginY}
                    scale={xScale}
                    numTicks={numTicks}
                />
            </svg>
        </Box>
    )
}
