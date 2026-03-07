import { Box } from '@mui/material'

import { cardSx, colors } from '@/lib/colors'
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
        <Box id="receipts-list" sx={{ paddingTop: 1, scrollMarginTop: '54px' }}>
            {displayData.map((row) => (
                <Box
                    key={row.id}
                    sx={{
                        ...cardSx,
                        marginX: 3,
                        marginBottom: 1,
                        border: row.conversionError
                            ? `1.5px solid ${colors.primaryRed}`
                            : `1.5px solid ${colors.primaryBlack}`,
                        backgroundColor: row.conversionError
                            ? '#ffe8e5'
                            : colors.primaryWhite,
                    }}>
                    <ReceiptsRow expense={row} onRefresh={onRefresh} />
                </Box>
            ))}
        </Box>
    )
}
