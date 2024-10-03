import { Box } from '@mui/material'
import { SpendRow } from 'components/spend/spend-row'

import { Spend } from 'helpers/spend'

interface ISpendTableProps {
    spendData: Spend[]
}

export const SpendTable = ({ spendData }: ISpendTableProps) => {
    return (
        <Box
            sx={{
                marginBottom: 16, // could make this dynamic based on if filter menu is open or not
            }}>
            {spendData.map((row, index) => (
                <Box
                    key={'row-' + index}
                    sx={{
                        margin: 1,
                        border: '1px solid #FBBC04',
                        borderRadius: 4,
                        backgroundColor: 'white',
                    }}>
                    <SpendRow spend={row} />
                </Box>
            ))}
        </Box>
    )
}
