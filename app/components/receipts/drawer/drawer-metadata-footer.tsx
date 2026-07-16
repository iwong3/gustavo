'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import type { Expense } from '@/lib/types'

// Just attribution, in prose. Position/day live in the receipt's fine print,
// where they read as a serial number instead of a sentence.

interface DrawerMetadataFooterProps {
    expense: Expense
}

export const DrawerMetadataFooter = ({ expense }: DrawerMetadataFooterProps) => {
    if (!expense.reportedBy) return null

    return (
        <Box sx={{ marginX: 2.5, paddingTop: 1.5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                Submitted by {expense.reportedBy.firstName}
                {expense.reportedAt && ` · ${dayjs(expense.reportedAt).format('M/D h:mm A')}`}
            </Typography>
        </Box>
    )
}
