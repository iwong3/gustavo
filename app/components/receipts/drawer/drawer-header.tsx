'use client'

import { Box, IconButton, Typography } from '@mui/material'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import { CategoryIcon } from 'utils/icons'

import type { Expense } from '@/lib/types'

interface DrawerHeaderProps {
    expense: Expense
    expenseIndex: number // 0-based index in the full expense list
    totalExpenses: number
    dayNumber: number | null
    totalDays: number | null
    canEdit: boolean
    canDelete: boolean
    onEdit: () => void
    onDelete: () => void
}

export const DrawerHeader = ({
    expense,
    expenseIndex,
    totalExpenses,
    dayNumber,
    totalDays,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
}: DrawerHeaderProps) => {
    const locationDisplay = expense.place?.address?.split(',')[0] || expense.locationName
    const dateDisplay = dayjs(expense.date + 'T00:00:00').format('M/D')
    const positionLabel = `Expense ${expenseIndex + 1} of ${totalExpenses}`
    const dayLabel = dayNumber && totalDays ? ` · Day ${dayNumber} of ${totalDays}` : ''

    return (
        <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
            {/* Name + actions row */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                }}>
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
                            {locationDisplay && ` \u2022 ${locationDisplay}`}
                        </Typography>
                    </Box>
                </Box>

                {/* Action buttons */}
                {(canEdit || canDelete) && (
                    <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, mt: 0.5 }}>
                        {canEdit && (
                            <IconButton
                                size="small"
                                onClick={onEdit}
                                sx={{
                                    border: `1px solid ${colors.primaryBlack}`,
                                    borderRadius: '4px',
                                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                    backgroundColor: colors.primaryWhite,
                                    '&:hover': { backgroundColor: colors.secondaryYellow },
                                }}>
                                <IconEdit size={18} color={colors.primaryBlack} />
                            </IconButton>
                        )}
                        {canDelete && (
                            <IconButton
                                size="small"
                                onClick={onDelete}
                                sx={{
                                    border: `1px solid ${colors.primaryBlack}`,
                                    borderRadius: '4px',
                                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                    backgroundColor: colors.primaryWhite,
                                    '&:hover': { backgroundColor: colors.secondaryYellow },
                                }}>
                                <IconTrash size={18} color={colors.primaryRed} />
                            </IconButton>
                        )}
                    </Box>
                )}
            </Box>

            {/* Position label */}
            <Typography
                sx={{
                    fontSize: 11,
                    color: 'text.secondary',
                    mt: 0.75,
                    textAlign: 'center',
                }}>
                {positionLabel}{dayLabel}
            </Typography>
        </Box>
    )
}
