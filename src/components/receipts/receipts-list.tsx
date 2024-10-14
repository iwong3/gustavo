import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { ReceiptsRow } from 'components/receipts/receipt-row'
import { Spend } from 'helpers/spend'
import { useGustavoStore } from 'views/gustavo'

interface ReceiptsListProps {
    spendData?: Spend[] // optional override for spendData
}

export const ReceiptsList = ({ spendData }: ReceiptsListProps) => {
    const { filteredSpendData } = useGustavoStore(useShallow((state) => state))

    const useSpendData = spendData || filteredSpendData

    return (
        <Box>
            {useSpendData.map((row, index) => (
                <Box
                    key={'row-' + index}
                    sx={{
                        marginX: 1,
                        marginBottom: 1,
                        border: '1px solid #FBBC04',
                        borderRadius: 4,
                        backgroundColor: 'white',
                    }}>
                    <ReceiptsRow spend={row} />
                </Box>
            ))}
        </Box>
    )
}
