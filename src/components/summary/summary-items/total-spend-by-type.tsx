import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { FormattedMoney } from 'helpers/currency'
import { getIconFromSpendType } from 'helpers/icons'
import { SpendType } from 'helpers/spend'
import { useGustavoStore } from 'views/gustavo'
import { Graph } from 'components/graphs/graph'

export const TotalSpendByType = () => {
    const { totalSpendByType } = useGustavoStore(useShallow((state) => state))

    const totalSpendByTypeArray = Array.from(totalSpendByType)

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

    const renderSpendType = (spendType: SpendType, totalSpend: number) => (
        <Box
            key={'total-spend-by-type-' + spendType}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'space-between',
                width: '31%',
                border: '1px solid #FBBC04',
                borderRadius: '10px',
                backgroundColor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 1,
                }}>
                {getIconFromSpendType(spendType, 18)}
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
                    fontSize: 14,
                    fontWeight: 'bold',
                    borderTop: '1px solid #FBBC04',
                }}>
                {FormattedMoney('USD', 2).format(totalSpend)}
            </Box>
        </Box>
    )

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
                />
            </Box>
        </Box>
    )
}
