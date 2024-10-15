import { Label } from '@visx/annotation'
import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { Box } from '@mui/material'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import { useShallow } from 'zustand/react/shallow'

import { SortOrder as CostOrder, useSortCostStore } from 'components/menu/sort/sort-cost'
import { FormattedMoney } from 'helpers/currency'
import { useEffect, useState } from 'react'

interface GraphProps {
    data: [string, number][]
    width?: number
    height?: number
}

export const Graph = ({ data, width, height }: GraphProps) => {
    const [displayData, setDisplayData] = useState(data)

    const { order: costOrder } = useSortCostStore(useShallow((state) => state))

    useEffect(() => {
        let displayData = data

        if (costOrder === CostOrder.Descending) {
            displayData = data.slice().sort((a, b) => b[1] - a[1])
        } else if (costOrder === CostOrder.Ascending) {
            displayData = data.slice().sort((a, b) => a[1] - b[1])
        }

        setDisplayData(displayData)
    }, [data, costOrder])

    const graphWidth = width && width !== 0 ? width : window.innerWidth * 0.9
    const graphHeight = height && height !== 0 ? height : graphWidth
    const marginY = 12

    const xData = displayData.map(([label]) => label)

    const xScale = scaleBand<string>({
        range: [0, graphWidth],
        domain: xData,
        padding: 0.4,
    })

    const yScale = scaleLinear<number>({
        range: [graphHeight, 4 * marginY],
        domain: [0, Math.max(...displayData.map(([_, value]) => value))],
    })

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
            <svg width={width} height={height}>
                <rect width={width} height={height} fill="none" rx={14} />
                <Group>
                    {displayData.map((d, index) => {
                        const yLabel = d[1]

                        const barWidth = xScale.bandwidth()
                        const barHeight = graphHeight - (yScale(yLabel) ?? 0)
                        const barX = xScale(d[0]) ?? 0
                        const barY = graphHeight - barHeight - marginY

                        return (
                            <g key={'graph-bar-' + index}>
                                <Bar
                                    x={barX}
                                    y={barY - marginY}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={'#F4D35E'}
                                />
                                <Label
                                    title={FormattedMoney('USD', 0).format(yLabel)}
                                    titleProps={{
                                        textAnchor: 'middle',
                                    }}
                                    x={barX}
                                    y={barY}
                                    width={barWidth}
                                    horizontalAnchor="start"
                                    titleFontSize={14}
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
