import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'
import { useWindowSize } from 'hooks/useWindowSize'

import { Graph } from 'components/graphs/graph'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { defaultBackgroundColor } from 'utils/colors'
import { FormattedMoney } from 'utils/currency'
import { getInitialsIconColors, InitialsIcon } from 'utils/icons'
import { useSpendData } from 'providers/spend-data-provider'

import type { UserSummary } from '@/lib/types'

export const TotalSpendByPerson = () => {
    const { width: windowWidth } = useWindowSize()
    const { totalSpendByPerson, participants } = useSpendData()
    const { filters, handleFilterClick } = useFilterSplitBetweenStore(
        useShallow((state) => state)
    )

    const participantById = new Map<number, UserSummary>()
    for (const p of participants) {
        participantById.set(p.id, p)
    }

    // Convert Map<number,number> to array of [firstName, totalSpend]
    const totalSpendByPersonArray: [string, number][] = Array.from(
        totalSpendByPerson.entries()
    ).map(([userId, amount]) => {
        const p = participantById.get(userId)
        return [p?.firstName ?? String(userId), amount]
    })

    // cards
    const rowLength = 4
    const renderTotalSpendByPerson = () => {
        const rows = []
        let row = []
        for (let i = 0; i < totalSpendByPersonArray.length; i++) {
            const [personName, totalSpend] = totalSpendByPersonArray[i]
            row.push(renderPerson(personName, totalSpend))

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

    const renderPerson = (personName: string, totalSpend: number) => {
        const key = 'total-spend-by-person-' + personName
        const isActive = filters.get(personName)

        return (
            <Box
                key={key}
                onClick={() => {
                    handleFilterClick(personName)
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
                        name={personName}
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
                        {personName}
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
        ([personName]) => getInitialsIconColors(personName).bgColor
    )
    const activePeople = Array.from(filters.values())

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
                    width={(windowWidth || 390) * 0.9}
                    height={(windowWidth || 390) * 0.5}
                    barColors={personColors}
                    activeData={activePeople}
                />
            </Box>
        </Box>
    )
}
