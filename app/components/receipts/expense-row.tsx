'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'

import { colors, pressRowSx } from '@/lib/colors'
import { expenseAreaLabel } from '@/lib/place-display'
import { CategoryIcon, InitialsIcon } from 'utils/icons'
import { FormattedMoney } from 'utils/currency'

import type { Expense } from '@/lib/types'
import type { ReactNode } from 'react'

interface ExpenseRowProps {
    expense: Expense
    onTap: (expense: Expense) => void
    /** When true, hides the date from the subtext (shown above the card instead). */
    hideDate?: boolean
    /** Extra column after the price + payer (the debts page adds each
     *  expense's effect on a balance). Spans the row's full height. */
    trailing?: ReactNode
}

export const ExpenseRow = ({ expense, onTap, hideDate = false, trailing }: ExpenseRowProps) => {
    // Area, e.g. "Shibuya, Tokyo" — the neighborhood is how anyone actually
    // remembers a place, and the city anchors it. Beats the old street fragment
    // ("1-22-7 Jinnan"), which told you nothing. Falls back to the trip location
    // name for places saved before migration 00039.
    const locationDisplay = expenseAreaLabel(expense.place, expense.locationName)

    // Currency-exchange rows store the USD PAID in costOriginal while `currency`
    // names the currency RECEIVED (see drawer-receipt.tsx) — format as USD, or
    // $200 would print as "¥200".
    const amountCurrency =
        expense.categorySlug === 'currency_exchange' ? 'USD' : expense.currency

    const expenseDate = dayjs(expense.date + 'T00:00:00')

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
                '&:active': pressRowSx['&:active'],
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
                    {!hideDate && expenseDate.format('M/D')}
                    {!hideDate && locationDisplay && ' \u2022 '}
                    {hideDate ? (locationDisplay || '\u2014') : locationDisplay}
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
                    {FormattedMoney(amountCurrency, 0).format(expense.costOriginal)}
                </Typography>
                <InitialsIcon
                    name={expense.paidBy.firstName}
                    initials={expense.paidBy.initials}
                    iconColor={expense.paidBy.iconColor}
                    sx={{ width: 20, height: 20, fontSize: 9 }}
                />
            </Box>
            {trailing}
        </Box>
    )
}
