import Box from '@mui/material/Box'
import { Label } from '@visx/annotation'
import { AxisBottom } from '@visx/axis'
import { Group } from '@visx/group'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { FormattedMoney } from 'helpers/currency'
import { getTablerIcon } from 'helpers/icons'
import { Person } from 'helpers/person'
import { getSplitCost } from 'helpers/spend'
import { useGustavoStore } from 'views/gustavo'

export const SummaryByDate = () => {
    const { filteredSpendData: spendData } = useGustavoStore(useShallow((state) => state))
    const { filters: splitBetweenFilter } = useFilterSplitBetweenStore(useShallow((state) => state))

    const [totalSpendByDate, setTotalSpendByDate] = useState(new Map<string, number>())
    const [dateRange, setDateRange] = useState<string[]>([])

    useEffect(() => {
        if (spendData.length === 0) {
            setTotalSpendByDate(new Map<string, number>())
            setDateRange([])
            return
        }

        let earliestDate = dayjs(spendData[0].date)
        let latestDate = earliestDate

        // calculate total spend by date
        const totalSpendByDate = spendData.reduce((totalSpend, spend) => {
            const currentDate = dayjs(spend.date)

            if (currentDate.isBefore(earliestDate)) {
                earliestDate = currentDate
            }
            if (currentDate.isAfter(latestDate)) {
                latestDate = currentDate
            }

            const currentDateString = currentDate.format('M/D')
            const currentDateTotal = totalSpend.get(currentDateString) || 0
            let currentCost = spend.convertedCost
            const isAnyFilterActive = Object.values(splitBetweenFilter).some((isActive) => isActive)
            if (isAnyFilterActive) {
                const costPerPerson = getSplitCost(spend.convertedCost, spend.splitBetween)
                // people who are included in the filter
                const filteredPeople = Object.keys(splitBetweenFilter).filter(
                    (person) => splitBetweenFilter[person as Person]
                )
                // people who are splitting the cost and are included in the filter
                const numberOfPeople = spend.splitBetween.includes(Person.Everyone)
                    ? filteredPeople.length
                    : spend.splitBetween.filter((person) => filteredPeople.includes(person)).length
                currentCost = costPerPerson * numberOfPeople
            }
            totalSpend.set(currentDateString, currentDateTotal + currentCost)
            return totalSpend
        }, new Map<string, number>())
        setTotalSpendByDate(totalSpendByDate)

        // create date range using earliest and latest dates, used for axis
        const dateRange: string[] = []
        let currentDate = earliestDate
        while (currentDate.isBefore(latestDate, 'day') || currentDate.isSame(latestDate, 'day')) {
            dateRange.push(currentDate.format('M/D'))
            currentDate = currentDate.add(1, 'day')
        }
        setDateRange(dateRange)
    }, [spendData])

    const renderGraph = () => {
        const width = window.innerWidth * 0.9
        const height = width
        const marginY = 12

        const dateScale = scaleBand<string>({
            range: [0, width],
            domain: dateRange,
            padding: 0.2,
        })
        const spendScale = scaleLinear<number>({
            range: [height, 4 * marginY],
            domain: [0, Math.max(...Array.from(totalSpendByDate.values()))],
        })

        return (
            <svg width={width} height={height}>
                <rect width={width} height={height} fill="none" rx={14} />
                <Group>
                    {dateRange.map((date, index) => {
                        const totalSpend = totalSpendByDate.get(date) || 0

                        const barWidth = dateScale.bandwidth()
                        const barHeight = height - (spendScale(totalSpend) ?? 0)
                        const barX = dateScale(date) ?? 0
                        const barY = height - barHeight - marginY

                        return (
                            <g key={'summary-by-date-bar-' + index}>
                                <Bar
                                    x={barX}
                                    y={barY - marginY}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={'#F4D35E'}
                                />
                                <Label
                                    title={FormattedMoney('USD', 0).format(totalSpend)}
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
                <AxisBottom top={height - 2 * marginY} scale={dateScale} />
            </svg>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 2,
                margin: 1,
                height: window.innerWidth * 0.9,
                border: '1px solid #FBBC04',
                borderRadius: '10%',
                backgroundColor: 'white',
            }}>
            {totalSpendByDate.size > 0 ? (
                renderGraph()
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '14px',
                    }}>
                    {getTablerIcon({ name: 'IconChartBarOff', size: 48, color: 'lightgray' })}
                    No data
                </Box>
            )}
        </Box>
    )
}
