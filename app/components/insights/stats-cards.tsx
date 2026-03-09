'use client'

import { cardSx, colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'

import { FormattedMoney } from 'utils/currency'

import type { DashboardStats } from 'hooks/useDashboardData'

interface StatsCardsProps {
    stats: DashboardStats
}

function StatCard({
    value,
    label,
    accent,
}: {
    value: string
    label: string
    accent?: boolean
}) {
    return (
        <Box
            sx={{
                ...cardSx,
                borderRadius: '8px',
                padding: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                ...(accent && {
                    backgroundColor: colors.primaryYellow,
                }),
            }}>
            <Typography
                sx={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: colors.primaryBlack,
                    lineHeight: 1.2,
                    fontFamily: 'var(--font-serif)',
                }}>
                {value}
            </Typography>
            <Typography
                sx={{
                    fontSize: 11,
                    color: accent
                        ? colors.primaryBlack
                        : 'text.secondary',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}>
                {label}
            </Typography>
        </Box>
    )
}

const fmt = FormattedMoney('USD', 0)

export function StatsCards({ stats }: StatsCardsProps) {
    const prefix = stats.filterLabel ? `${stats.filterLabel} ` : ''

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                width: '100%',
            }}>
            <StatCard
                value={fmt.format(stats.totalSpend)}
                label={`${prefix}Total Spend`}
                accent
            />
            <StatCard
                value={fmt.format(stats.avgPerDay)}
                label={`${prefix}Avg / Day`}
            />
            <StatCard
                value={fmt.format(stats.avgPerPerson)}
                label="Avg / Person"
            />
            <StatCard
                value={String(stats.expenseCount)}
                label={`${prefix}Expenses`}
            />
            {stats.biggestExpense && (
                <StatCard
                    value={fmt.format(stats.biggestExpense.amount)}
                    label={`Biggest: ${stats.biggestExpense.name}`}
                />
            )}
            {stats.topCategory && (
                <StatCard
                    value={fmt.format(stats.topCategory.amount)}
                    label={`Top: ${stats.topCategory.name}`}
                />
            )}
        </Box>
    )
}
