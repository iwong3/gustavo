import { Box } from '@mui/material'
import { useShallow } from 'zustand/react/shallow'

import { ReceiptsRow } from 'components/receipts/receipt-row'
import { defaultBackgroundColor } from 'utils/colors'
import { Spend } from 'utils/spend'
import { useGustavoStore } from 'views/gustavo'

interface ReceiptsListProps {
    spendData?: Spend[] // optional override for spendData
}

export const ReceiptsList = ({ spendData }: ReceiptsListProps) => {
    const { filteredSpendData } = useGustavoStore(useShallow((state) => state))

    const useSpendData = spendData || filteredSpendData

    return (
        <Box id="receipts-list">
            {useSpendData.map((row, index) => (
                <Box
                    key={'row-' + index}
                    sx={{
                        marginX: 1,
                        marginBottom: 1,
                        border: row.error
                            ? '1px solid #C1121F'
                            : '1px solid #FBBC04',
                        borderRadius: 4,
                        backgroundColor: row.error
                            ? '#FFE3E0'
                            : defaultBackgroundColor,
                    }}>
                    <ReceiptsRow spend={row} />
                </Box>
            ))}
        </Box>
    )
}
