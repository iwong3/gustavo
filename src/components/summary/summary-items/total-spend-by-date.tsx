import { Box } from '@mui/material'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Graph } from 'components/graphs/graph'
import { LineGraph } from 'components/graphs/line-graph'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { getInitialsIconColors } from 'helpers/icons'
import { Person } from 'helpers/person'
import { useGustavoStore } from 'views/gustavo'

export const TotalSpendByDate = () => {
    const { totalSpendByDate, totalSpendByDateByPerson } = useGustavoStore(
        useShallow((state) => state)
    )
    const { order } = useSortDateStore(useShallow((state) => state))

    const [totalSpendByDateArray, setTotalSpendByDateArray] = useState(Array.from(totalSpendByDate))
    const [totalSpendByDateByPersonArray, setTotalSpendByDateByPersonArray] = useState<
        [string, number][][]
    >([])

    useEffect(() => {
        // total spend by date
        let totalSpendByDateArray = Array.from(totalSpendByDate)

        // sort
        sortSpendByDateArray(totalSpendByDateArray, order)

        // format date
        totalSpendByDateArray = totalSpendByDateArray.map(([date, value]) => [
            dayjs(date).format('M/D'),
            value,
        ])

        setTotalSpendByDateArray(totalSpendByDateArray)

        // total spend by date by person
        let totalSpendByDateByPersonArray: [string, number][][] = []

        // for each person
        totalSpendByDateByPerson.forEach((personsSpendByDate, _) => {
            // get spend by date data in array
            let personData: [string, number][] = []
            personsSpendByDate.forEach((value, date) => {
                personData.push([date, value])
            })

            // sort
            sortSpendByDateArray(personData, order)

            // format date
            personData = personData.map(([date, value]) => [dayjs(date).format('M/D'), value])

            totalSpendByDateByPersonArray.push(personData)
        })

        setTotalSpendByDateByPersonArray(totalSpendByDateByPersonArray)
    }, [totalSpendByDate, totalSpendByDateByPerson, order])

    const personColors: string[] = []
    Object.values(Person)
        .filter((person) => person !== Person.Everyone)
        .forEach((person) => {
            personColors.push(getInitialsIconColors(person).bgColor)
        })

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
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginY: 2,
                }}>
                <LineGraph
                    data={totalSpendByDateByPersonArray}
                    width={window.innerWidth * 0.9}
                    height={window.innerWidth * 0.5}
                    lineColors={personColors}
                />
            </Box>
        </Box>
    )
}

const sortSpendByDateArray = (array: [string, number][], order: number) => {
    if (order === 0 || order == 2) {
        // Default is ascending
        array = array.sort((a, b) => {
            const dateA = dayjs(a[0])
            const dateB = dayjs(b[0])
            return dateA.isAfter(dateB) ? 1 : -1
        })
    } else if (order === 1) {
        array = array.sort((a, b) => {
            const dateA = dayjs(a[0])
            const dateB = dayjs(b[0])
            return dateB.isAfter(dateA) ? 1 : -1
        })
    }
}
