import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { Graph } from 'components/graphs/graph'
import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { FormattedMoney } from 'helpers/currency'
import { getTablerIcon } from 'helpers/icons'
import { Location } from 'helpers/location'
import { useGustavoStore } from 'views/gustavo'

export const TotalSpendByLocation = () => {
    const { totalSpendByLocation } = useGustavoStore(useShallow((state) => state))
    const { filters, handleFilterClick } = useFilterLocationStore(useShallow((state) => state))

    const totalSpendByLocationArray = Array.from(totalSpendByLocation)

    const rowLength = 3
    const renderTotalSpendByLocation = () => {
        const rows = []
        let row = []
        for (let i = 0; i < totalSpendByLocationArray.length; i++) {
            // render current location
            const [location, totalSpend] = totalSpendByLocationArray[i]
            row.push(renderLocation(location, totalSpend))

            // if row is full, push current row and start a new row
            if (row.length === rowLength || i === totalSpendByLocationArray.length - 1) {
                rows.push(
                    <Box
                        key={'total-spend-by-location-row-' + rows.length}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: rows.length === 0 ? 0 : 0.5,
                            marginBottom: i === totalSpendByLocationArray.length - 1 ? 0 : 0.5,
                        }}>
                        {row}
                    </Box>
                )
                row = []
            }
        }
        return rows
    }

    const renderLocation = (location: Location, totalSpend: number) => {
        const isActive = filters[location]

        return (
            <Box
                key={'total-spend-by-location-' + location}
                onClick={() => {
                    handleFilterClick(location)
                }}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'space-between',
                    width: '31%',
                    border: isActive ? '1px solid #588157' : '1px solid #FBBC04',
                    borderRadius: '10px',
                    backgroundColor: isActive ? '#FAEDCD' : 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
                    transition: 'background-color 0.1s',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        paddingY: 0.5,
                        paddingX: 0.75,
                    }}>
                    {getTablerIcon({ name: 'IconMap2', size: 18 })}
                    <Box
                        sx={{
                            marginLeft: 1,
                            fontSize: 12,
                        }}>
                        {location}
                    </Box>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        padding: 1,
                        fontSize: 14,
                        fontWeight: 'bold',
                        borderTop: '1px solid #FBBC04',
                    }}>
                    {FormattedMoney('USD', 2).format(totalSpend)}
                </Box>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                margin: 1,
            }}>
            {renderTotalSpendByLocation()}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginY: 2,
                }}>
                <Graph
                    data={totalSpendByLocationArray}
                    width={window.innerWidth * 0.9}
                    height={window.innerWidth * 0.5}
                />
            </Box>
        </Box>
    )
}
