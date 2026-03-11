'use client'

import { Box, Typography } from '@mui/material'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'

interface DateGroupHeaderProps {
    date: string // ISO YYYY-MM-DD
    dayTotal: number // USD total for the day
    dayNumber: number | null // Day X of the trip (null if outside trip range)
    totalDays: number | null
    expenseCount: number
    collapsed: boolean
    onToggle: () => void
}

export const DateGroupHeader = ({
    date,
    dayTotal,
    dayNumber,
    totalDays,
    expenseCount,
    collapsed,
    onToggle,
}: DateGroupHeaderProps) => {
    // Append T00:00:00 to parse as local time (bare YYYY-MM-DD is parsed as UTC)
    const dateLabel = dayjs(date + 'T00:00:00').format('MMMM D, YYYY')

    const dayLabel = dayNumber && totalDays ? `Day ${dayNumber} of ${totalDays}` : null

    return (
        <Box
            onClick={onToggle}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                cursor: 'pointer',
                borderBottom: `1px solid ${colors.primaryBlack}`,
                backgroundColor: '#d4ddb6',
                userSelect: 'none',
                '&:active': {
                    backgroundColor: '#e2e8c8',
                },
                transition: 'background-color 150ms ease',
            }}>
            {/* Left: date + day label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', color: colors.primaryBlack }}>
                    {collapsed
                        ? <IconChevronRight size={16} />
                        : <IconChevronDown size={16} />
                    }
                </Box>
                <Box>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.3,
                            color: colors.primaryBlack,
                        }}>
                        {dateLabel}
                    </Typography>
                    {dayLabel && (
                        <Typography
                            sx={{
                                fontSize: 11,
                                color: 'text.secondary',
                                lineHeight: 1.3,
                            }}>
                            {dayLabel} · {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
                        </Typography>
                    )}
                    {!dayLabel && (
                        <Typography
                            sx={{
                                fontSize: 11,
                                color: 'text.secondary',
                                lineHeight: 1.3,
                            }}>
                            {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Right: day total */}
            <Typography
                sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: colors.primaryBlack,
                }}>
                {FormattedMoney('USD', 0).format(dayTotal)}
            </Typography>
        </Box>
    )
}
