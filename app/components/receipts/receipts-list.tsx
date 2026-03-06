import { Box } from '@mui/material'

import { ReceiptsRow } from 'components/receipts/receipt-row'
import { useSpendData } from 'providers/spend-data-provider'
import { useRefresh } from 'providers/refresh-provider'
import { defaultBackgroundColor } from 'utils/colors'

import type { Expense } from '@/lib/types'

interface ReceiptsListProps {
    expenses?: Expense[]
}

export const ReceiptsList = ({ expenses }: ReceiptsListProps) => {
    const { filteredExpenses } = useSpendData()
    const { onRefresh } = useRefresh()

    const displayData = expenses || filteredExpenses

    return (
        <Box id="receipts-list">
            {displayData.map((row, index) => (
                <Box
                    key={'row-' + index}
                    sx={{
                        marginX: 1,
                        marginBottom: 1,
                        border: row.conversionError
                            ? '1px solid #C1121F'
                            : '1px solid #FBBC04',
                        borderRadius: 4,
                        backgroundColor: row.conversionError
                            ? '#FFE3E0'
                            : defaultBackgroundColor,
                    }}>
                    <ReceiptsRow expense={row} onRefresh={onRefresh} />
                </Box>
            ))}
        </Box>
    )
}
