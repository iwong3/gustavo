'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import type { Expense } from '@/lib/types'

interface DrawerMetadataFooterProps {
    expense: Expense
}

export const DrawerMetadataFooter = ({
    expense,
}: DrawerMetadataFooterProps) => {
    if (!expense.reportedBy) return null

    return (
        <Box
            sx={{
                mx: 2.5,
                mb: 2,
                pt: 1.5,
                borderTop: `1px solid`,
                borderColor: 'divider',
            }}>
            <Typography
                sx={{
                    fontSize: 12,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    textAlign: 'center',
                }}>
                Submitted by {expense.reportedBy.firstName}
                {expense.reportedAt && ` · ${dayjs(expense.reportedAt).format('M/D h:mm A')}`}
            </Typography>
        </Box>
    )
}
