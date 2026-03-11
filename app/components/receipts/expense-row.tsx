'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import { CategoryIcon, InitialsIcon } from 'utils/icons'
import { FormattedMoney } from 'utils/currency'
import { useSpendData } from 'providers/spend-data-provider'

import type { Expense } from '@/lib/types'

interface ExpenseRowProps {
    expense: Expense
    onTap: (expense: Expense) => void
}

export const ExpenseRow = ({ expense, onTap }: ExpenseRowProps) => {
    const { getUsdValue } = useSpendData()

    const costUsd = getUsdValue(expense)

    // Location: prefer trip location name, fall back to place address
    const locationDisplay = expense.locationName || expense.place?.address?.split(',')[0]

    return (
        <Box
            onClick={() => onTap(expense)}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1.5,
                cursor: 'pointer',
                position: 'relative',
                // Conversion error red left accent
                ...(expense.conversionError && {
                    borderLeft: `3px solid ${colors.primaryRed}`,
                }),
                '&:active': {
                    backgroundColor: colors.secondaryYellow,
                },
                transition: 'background-color 150ms ease',
            }}>
            {/* Category icon */}
            <CategoryIcon expense={expense} size={28} />

            {/* Name + date/location */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: colors.primaryBlack,
                    }}>
                    {expense.name}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 12,
                        color: 'text.secondary',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mt: 0.25,
                    }}>
                    {dayjs(expense.date + 'T00:00:00').format('M/D')}
                    {locationDisplay && ` \u2022 ${locationDisplay}`}
                </Typography>
            </Box>

            {/* Right: cost + payer icon stacked */}
            <Box sx={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 0.5,
            }}>
                <Typography
                    sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: expense.conversionError
                            ? colors.primaryRed
                            : colors.primaryBlack,
                    }}>
                    {FormattedMoney('USD', 0).format(costUsd)}
                </Typography>
                <InitialsIcon
                    name={expense.paidBy.firstName}
                    initials={expense.paidBy.initials}
                    iconColor={expense.paidBy.iconColor}
                    sx={{ width: 20, height: 20, fontSize: 9 }}
                />
            </Box>
        </Box>
    )
}
