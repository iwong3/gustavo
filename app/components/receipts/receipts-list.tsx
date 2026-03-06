import { Box } from '@mui/material'

import { colors } from '@/lib/colors'
import { ReceiptsRow } from 'components/receipts/receipt-row'
import { useRefresh } from 'providers/refresh-provider'
import { useSpendData } from 'providers/spend-data-provider'

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
                            ? `1.5px solid ${colors.primaryRed}`
                            : `1.5px solid ${colors.primaryBlack}`,
                        borderRadius: 4,
                        backgroundColor: row.conversionError
                            ? '#ffe8e5'
                            : colors.primaryWhite,
                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                    }}>
                    <ReceiptsRow expense={row} onRefresh={onRefresh} />
                </Box>
            ))}
        </Box>
    )
}
