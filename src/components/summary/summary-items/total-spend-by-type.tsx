import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { Graph } from 'components/graphs/graph'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { defaultBackgroundColor } from 'helpers/colors'
import { FormattedMoney } from 'helpers/currency'
import { getColorForSpendType, getIconFromSpendType } from 'helpers/icons'
import { SpendType } from 'helpers/spend'
import { useGustavoStore } from 'views/gustavo'

export const TotalSpendByType = () => {
    const { totalSpendByType } = useGustavoStore(useShallow((state) => state))
    const { filters, handleFilterClick } = useFilterSpendTypeStore(useShallow((state) => state))

    const totalSpendByTypeArray = Array.from(totalSpendByType)

    // cards
    const rowLength = 3
    const renderTotalSpendByType = () => {
        const rows = []
        let row = []
        for (let i = 0; i < totalSpendByTypeArray.length; i++) {
            // render current spend type
            const [spendType, totalSpend] = totalSpendByTypeArray[i]
            row.push(renderSpendType(spendType, totalSpend))

            // if row is full, push current row and start a new row
            if (row.length === rowLength || i === totalSpendByTypeArray.length - 1) {
                rows.push(
                    <Box
                        key={'total-spend-by-type-row-' + rows.length}
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: rows.length === 0 ? 0 : 0.5,
                            marginBottom: i === totalSpendByTypeArray.length - 1 ? 0 : 0.5,
                        }}>
                        {row}
                    </Box>
                )
                row = []
            }
        }
        return rows
    }

    const renderSpendType = (spendType: SpendType, totalSpend: number) => {
        const isActive = filters[spendType]

        return (
            <Box
                key={'total-spend-by-type-' + spendType}
                onClick={() => {
                    handleFilterClick(spendType)
                }}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'space-between',
                    width: '31%',
                    border: isActive ? '1px solid #A7C957' : '1px solid #FBBC04',
                    borderRadius: '10px',
                    backgroundColor: isActive ? '#E9F5DB' : defaultBackgroundColor,
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
                    <Box
                        sx={{
                            width: 18,
                            height: 18,
                            borderRadius: '100%',
                            backgroundColor: getColorForSpendType(spendType),
                        }}>
                        {getIconFromSpendType(spendType, 18)}
                    </Box>
                    <Box
                        sx={{
                            marginLeft: 1,
                            fontSize: 12,
                        }}>
                        {spendType}
                    </Box>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        padding: 1,
                        border: isActive ? '1px solid #A7C957' : '1px solid #FBBC04',
                        fontSize: 14,
                        fontWeight: 'bold',
                    }}>
                    {FormattedMoney('USD', 0).format(totalSpend)}
                </Box>
            </Box>
        )
    }

    // graph properties
    const spendTypeColors = totalSpendByTypeArray.map(([spendType]) =>
        getColorForSpendType(spendType)
    )
    const activeTypes = Object.entries(filters).map(([_, isActive]) => isActive)

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                margin: 1,
                width: '100%',
            }}>
            {renderTotalSpendByType()}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginY: 2,
                }}>
                <Graph
                    data={totalSpendByTypeArray}
                    width={window.innerWidth * 0.9}
                    height={window.innerWidth * 0.5}
                    barColors={spendTypeColors}
                    activeData={activeTypes}
                />
            </Box>
        </Box>
    )
}
