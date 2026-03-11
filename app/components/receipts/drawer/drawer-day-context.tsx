'use client'

import { Box, Typography } from '@mui/material'

import { colors, hardShadow } from '@/lib/colors'

import type { Expense } from '@/lib/types'

interface DrawerDayContextProps {
    dayExpenses: Expense[] // all expenses for the same date
    currentExpenseId: number
    onJumpToExpense: (expense: Expense) => void
}

export const DrawerDayContext = ({
    dayExpenses,
    currentExpenseId,
    onJumpToExpense,
}: DrawerDayContextProps) => {
    if (dayExpenses.length <= 1) return null

    return (
        <Box
            sx={{
                mx: 2.5,
                mb: 2,
            }}>
            {/* Label */}
            <Typography
                sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    mb: 0.75,
                }}>
                Also on this day
            </Typography>

            {/* Expense pills */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 0.75,
                    flexWrap: 'wrap',
                }}>
                {dayExpenses.map((exp) => {
                    const isCurrent = exp.id === currentExpenseId

                    return (
                        <Box
                            key={exp.id}
                            onClick={() => {
                                if (!isCurrent) onJumpToExpense(exp)
                            }}
                            sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: '4px',
                                border: `1px solid ${colors.primaryBlack}`,
                                backgroundColor: isCurrent
                                    ? colors.primaryBlack
                                    : colors.primaryWhite,
                                cursor: isCurrent ? 'default' : 'pointer',
                                ...(isCurrent ? {} : hardShadow),
                                '&:hover': !isCurrent ? {
                                    backgroundColor: colors.secondaryYellow,
                                } : {},
                                transition: 'background-color 150ms ease',
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    fontWeight: isCurrent ? 700 : 500,
                                    color: isCurrent
                                        ? colors.primaryWhite
                                        : colors.primaryBlack,
                                    lineHeight: 1.3,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 120,
                                }}>
                                {exp.name}
                            </Typography>
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
