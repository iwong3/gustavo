'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import { expenseAreaLabel } from '@/lib/place-display'
import { CategoryIcon } from 'utils/icons'

import type { Expense } from '@/lib/types'

interface DrawerHeaderProps {
    expense: Expense
    dayNumber: number | null
    totalDays: number | null
}

export const DrawerHeader = ({ expense, dayNumber, totalDays }: DrawerHeaderProps) => {
    // Weekday included: "Sat" recalls a trip day in a way "7/12" doesn't
    const subtitle = [
        dayjs(expense.date + 'T00:00:00').format('ddd M/D'),
        dayNumber && totalDays ? `Day ${dayNumber} of ${totalDays}` : null,
        expenseAreaLabel(expense.place, expense.locationName),
    ]
        .filter(Boolean)
        .join(' · ')

    return (
        <Box sx={{ paddingX: 2.5, paddingTop: 1, paddingBottom: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Box sx={{ flexShrink: 0 }}>
                    <CategoryIcon expense={expense} size={46} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 18,
                            fontWeight: 800,
                            lineHeight: 1.25,
                            color: colors.primaryBlack,
                            wordBreak: 'break-word',
                        }}>
                        {expense.name}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: 'text.secondary',
                            lineHeight: 1.4,
                            marginTop: 0.25,
                        }}>
                        {subtitle}
                    </Typography>
                </Box>
            </Box>
        </Box>
    )
}
