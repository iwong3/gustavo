import { Box } from '@mui/material'
import { SpendRow } from 'components/spend-row'

import { Spend } from 'helpers/spend'

interface ISpendTableProps {
    spendData: Spend[]
}

export const SpendTable = ({ spendData }: ISpendTableProps) => {
    return (
        <Box>
            {spendData.map((row, index) => (
                <Box
                    key={'row-' + index}
                    sx={{
                        margin: 1,
                        border: '1px solid lightgray',
                        borderRadius: 4,
                    }}>
                    <SpendRow spend={row} />
                </Box>
            ))}
        </Box>
    )
}
