'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import { CategoryIcon } from 'utils/icons'

import type { Expense } from '@/lib/types'

interface DrawerHeaderProps {
    expense: Expense
}

export const DrawerHeader = ({ expense }: DrawerHeaderProps) => {
    const locationDisplay = expense.locationName || expense.place?.name
    const dateDisplay = dayjs(expense.date + 'T00:00:00').format('M/D')

    return (
        <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
            {/* Icon + name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                <Box sx={{ flexShrink: 0 }}>
                    <CategoryIcon expense={expense} size={48} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 18,
                            fontWeight: 700,
                            lineHeight: 1.3,
                            color: colors.primaryBlack,
                            wordBreak: 'break-word',
                        }}>
                        {expense.name}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 13,
                            color: 'text.secondary',
                            lineHeight: 1.4,
                            mt: 0.25,
                        }}>
                        {dateDisplay}
                        {locationDisplay && ` • ${locationDisplay}`}
                    </Typography>
                </Box>
            </Box>
        </Box>
    )
}
