import { Box } from '@mui/material'

import { ReceiptsRow } from 'components/receipts/receipt-row'
import { useSpendData } from 'providers/spend-data-provider'
import { defaultBackgroundColor } from 'utils/colors'
import { Spend } from 'utils/spend'

interface ReceiptsListProps {
    spendData?: Spend[] // optional override for spendData
}

export const ReceiptsList = ({ spendData }: ReceiptsListProps) => {
    const { filteredSpendData } = useSpendData()

    const displayData = spendData || filteredSpendData

    return (
        <Box id="receipts-list">
            {displayData.map((row, index) => (
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
