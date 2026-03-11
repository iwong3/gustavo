'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import type { Expense } from '@/lib/types'

interface DrawerMetadataFooterProps {
    expense: Expense
    expenseIndex: number
    totalExpenses: number
    dayNumber: number | null
    totalDays: number | null
}

export const DrawerMetadataFooter = ({
    expense,
    expenseIndex,
    totalExpenses,
    dayNumber,
    totalDays,
}: DrawerMetadataFooterProps) => {
    const positionLabel = `Expense ${expenseIndex + 1} of ${totalExpenses}`
    const dayLabel = dayNumber && totalDays ? ` · Day ${dayNumber} of ${totalDays}` : ''
    const hasReporter = !!expense.reportedBy

    if (!hasReporter && totalExpenses <= 0) return null

    return (
        <Box
            sx={{
                mx: 2.5,
                mb: 2,
                pt: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
            }}>
            {/* Position / day context */}
            <Typography
                sx={{
                    fontSize: 11,
                    color: 'text.secondary',
                }}>
                {positionLabel}{dayLabel}
            </Typography>

            {/* Submitted by */}
            {hasReporter && (
                <Typography
                    sx={{
                        fontSize: 11,
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        mt: 0.25,
                    }}>
                    Submitted by {expense.reportedBy!.firstName}
                    {expense.reportedAt && ` · ${dayjs(expense.reportedAt).format('M/D h:mm A')}`}
                </Typography>
            )}
        </Box>
    )
}
