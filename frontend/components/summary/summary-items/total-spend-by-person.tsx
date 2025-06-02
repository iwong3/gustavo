import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { Graph } from 'components/graphs/graph'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { defaultBackgroundColor } from 'helpers/colors'
import { FormattedMoney } from 'helpers/currency'
import { getInitialsIconColors, InitialsIcon } from 'helpers/icons'
import { Person } from 'helpers/person'
import { useGustavoStore } from 'views/gustavo'

export const TotalSpendByPerson = () => {
    const { totalSpendByPerson } = useGustavoStore(useShallow((state) => state))
    const { filters, handleFilterClick } = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )

    const totalSpendByPersonArray = Array.from(totalSpendByPerson)

    // cards
    const rowLength = 4
    const renderTotalSpendByPerson = () => {
        const rows = []
        let row = []
        for (let i = 0; i < totalSpendByPersonArray.length; i++) {
            // render current person
            const [person, totalSpend] = totalSpendByPersonArray[i]
            row.push(renderPerson(person as Person, totalSpend))

            // if row is full, push current row and start a new row
            if (
                row.length === rowLength ||
                i === totalSpendByPersonArray.length - 1
            ) {
                rows.push(
                    <Box
                        key={'total-spend-by-person-row-' + rows.length}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: rows.length === 0 ? 0 : 0.5,
                            marginBottom:
                                i === totalSpendByPersonArray.length - 1
                                    ? 0
                                    : 0.5,
                        }}>
                        {row}
                    </Box>
                )
                row = []
            }
        }
        return rows
    }

    const renderPerson = (person: Person, totalSpend: number) => {
        const key = 'total-spend-by-person-' + person
        const isActive = filters.get(person)

        return (
            <Box
                key={key}
                onClick={() => {
                    handleFilterClick(person)
                }}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'space-between',
                    width: '23%',
                    border: isActive
                        ? '1px solid #A7C957'
                        : '1px solid #FBBC04',
                    borderRadius: '10px',
                    backgroundColor: isActive
                        ? '#E9F5DB'
                        : defaultBackgroundColor,
                    boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                    transition: 'background-color 0.1s',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0.5,
                    }}>
                    <InitialsIcon
                        person={person}
                        sx={{
                            width: 18,
                            height: 18,
                            fontSize: 10,
                        }}
                    />
                    <Box
                        sx={{
                            marginLeft: 0.5,
                            fontSize: 12,
                        }}>
                        {person}
                    </Box>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        padding: 1,
                        borderTop: isActive
                            ? '1px solid #A7C957'
                            : '1px solid #FBBC04',
                        fontSize: 14,
                        fontWeight: 'bold',
                    }}>
                    {FormattedMoney('USD', 0).format(totalSpend)}
                </Box>
            </Box>
        )
    }

    // graph
    const personColors = totalSpendByPersonArray.map(
        ([person]) => getInitialsIconColors(person).bgColor
    )
    const activePeople = Object.entries(filters).map(
        ([_, isActive]) => isActive
    )

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                margin: 1,
                width: '100%',
                height: '100%',
            }}>
            {renderTotalSpendByPerson()}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginY: 2,
                }}>
                <Graph
                    data={totalSpendByPersonArray}
                    width={window.innerWidth * 0.9}
                    height={window.innerWidth * 0.5}
                    barColors={personColors}
                    activeData={activePeople}
                />
            </Box>
        </Box>
    )
}
