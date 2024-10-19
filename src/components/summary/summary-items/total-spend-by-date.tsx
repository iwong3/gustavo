import { Box } from '@mui/material'
import dayjs from 'dayjs'
import { useShallow } from 'zustand/react/shallow'

import { Graph } from 'components/graphs/graph'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useEffect, useState } from 'react'
import { useGustavoStore } from 'views/gustavo'

export const TotalSpendByDate = () => {
    const { totalSpendByDate } = useGustavoStore(useShallow((state) => state))
    const { order } = useSortDateStore(useShallow((state) => state))

    const [totalSpendByDateArray, setTotalSpendByDateArray] = useState(Array.from(totalSpendByDate))

    useEffect(() => {
        let totalSpendByDateArray = Array.from(totalSpendByDate)
        if (order === 0 || order == 2) {
            // Default is ascending
            totalSpendByDateArray = totalSpendByDateArray.sort((a, b) => {
                const dateA = dayjs(a[0])
                const dateB = dayjs(b[0])
                return dateA.isAfter(dateB) ? 1 : -1
            })
        } else if (order === 1) {
            totalSpendByDateArray = totalSpendByDateArray.sort((a, b) => {
                const dateA = dayjs(a[0])
                const dateB = dayjs(b[0])
                return dateB.isAfter(dateA) ? 1 : -1
            })
        }

        // format date
        totalSpendByDateArray = totalSpendByDateArray.map(([date, value]) => [
            dayjs(date).format('M/D'),
            value,
        ])

        setTotalSpendByDateArray(totalSpendByDateArray)
    }, [totalSpendByDate, order])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                margin: 1,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginY: 2,
                }}>
                <Graph
                    data={totalSpendByDateArray}
                    width={window.innerWidth * 0.9}
                    height={window.innerWidth * 0.5}
                />
            </Box>
        </Box>
    )
}
