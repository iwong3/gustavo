import { Box } from '@mui/material'
import { Label } from '@visx/annotation'
import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import { FormattedMoney } from 'helpers/currency'

interface GraphProps {
    data: [string, number][]
    width?: number
    height?: number
}

export const Graph = ({ data, width, height }: GraphProps) => {
    const graphWidth = width && width !== 0 ? width : window.innerWidth * 0.9
    const graphHeight = height && height !== 0 ? height : graphWidth
    const marginY = 12

    const xData = data.map(([label]) => label)

    const xScale = scaleBand<string>({
        range: [0, graphWidth],
        domain: xData,
        padding: 0.4,
    })

    const yScale = scaleLinear<number>({
        range: [graphHeight, 4 * marginY],
        domain: [0, Math.max(...data.map(([_, value]) => value))],
    })

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 1,
                // width: '100%',
                border: '1px solid #FBBC04',
                borderRadius: '10px',
                backgroundColor: 'white',
            }}>
            <svg width={width} height={height}>
                <rect width={width} height={height} fill="none" rx={14} />
                <Group>
                    {data.map((d, index) => {
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
