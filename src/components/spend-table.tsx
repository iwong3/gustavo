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
                <SpendRow key={'row-' + index} spend={row} />
            ))}
        </Box>
    )
}
