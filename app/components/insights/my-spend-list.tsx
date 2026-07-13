'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useMemo } from 'react'

import { cardSx, colors } from '@/lib/colors'
import type { Expense } from '@/lib/types'
import { ListControls } from 'components/list-controls'
import type { MySpendRow, MySpendSort } from 'hooks/useMySpendData'
import { CategoryIcon } from 'utils/icons'

// Null-safe: numeric API fields can be null at runtime (NaN → JSON null)
const formatUsd = (n: number | null | undefined, maxDigits = 0) =>
    Number.isFinite(n)
        ? n!.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: maxDigits,
          })
        : '—'

function ShareExpenseRow({
    row,
    subtext,
    showBottomBorder,
    onTap,
}: {
    row: MySpendRow
    subtext: string
    showBottomBorder: boolean
    onTap: (expense: Expense) => void
}) {
    return (
        <Box
            onClick={() => onTap(row.expense)}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'gap': 1.5,
                'px': 1.5,
                'py': 1.25,
                'cursor': 'pointer',
                'borderBottom': showBottomBorder
                    ? `1px solid ${colors.primaryBlack}20`
                    : 'none',
                '&:active': {
                    backgroundColor: colors.secondaryYellow,
                },
                'transition': 'background-color 150ms ease',
            }}>
            <CategoryIcon expense={row.expense} size={28} />
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
                    {row.expense.name}
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
                    {subtext}
                </Typography>
            </Box>
            <Box
                sx={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                }}>
                <Typography
                    sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1.2,
                        fontVariantNumeric: 'tabular-nums',
                        color: colors.primaryBlack,
                    }}>
                    {formatUsd(row.share, 2)}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 10,
                        color: 'text.secondary',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                    of {formatUsd(row.usdTotal)}
                </Typography>
            </Box>
        </Box>
    )
}

interface MySpendListProps {
    /** Already sorted by the active sort. */
    rows: MySpendRow[]
    sort: MySpendSort
    onSortChange: (sort: MySpendSort) => void
    search: string
    onSearchChange: (search: string) => void
    onRowTap: (expense: Expense) => void
    /** Right-column header, e.g. "my share" or "Jenny's share". */
    shareLabel: string
}

export function MySpendList({
    rows,
    sort,
    onSortChange,
    search,
    onSearchChange,
    onRowTap,
    shareLabel,
}: MySpendListProps) {
    const isDateSort = sort === 'date-asc' || sort === 'date-desc'

    // Date sorts group by day (biggest share first within a day);
    // amount sorts render one flat ranked list
    const dateGroups = useMemo(() => {
        if (!isDateSort) return []
        const groups: { date: string; rows: MySpendRow[]; total: number }[] = []
        for (const row of rows) {
            const last = groups[groups.length - 1]
            if (last && last.date === row.expense.date) {
                last.rows.push(row)
                last.total += row.share
            } else {
                groups.push({
                    date: row.expense.date,
                    rows: [row],
                    total: row.share,
                })
            }
        }
        for (const group of groups) {
            group.rows.sort((a, b) => b.share - a.share)
        }
        return groups
    }, [rows, isDateSort])

    return (
        <Box sx={{ width: '100%' }}>
            {/* Search + sort controls */}
            <Box sx={{ marginBottom: 1.25 }}>
                <ListControls
                    search={search}
                    onSearchChange={onSearchChange}
                    sort={sort}
                    onSortChange={onSortChange}
                />
            </Box>

            {/* List header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 1,
                    paddingX: 0.25,
                }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: colors.primaryBrown,
                    }}>
                    Matching expenses ({rows.length})
                </Typography>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: colors.primaryBrown,
                    }}>
                    {shareLabel}
                </Typography>
            </Box>

            {rows.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 13,
                        color: 'text.secondary',
                        textAlign: 'center',
                        paddingY: 2,
                    }}>
                    Nothing matches.
                </Typography>
            ) : isDateSort ? (
                dateGroups.map((group) => {
                    const groupDate = dayjs(group.date + 'T00:00:00')
                    return (
                        <Box key={group.date} sx={{ marginBottom: 1.5 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    marginBottom: 0.75,
                                    paddingX: 0.25,
                                }}>
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: colors.primaryBlack,
                                    }}>
                                    {groupDate.format('ddd · MMM D')}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: colors.primaryBrown,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                    {formatUsd(group.total)}
                                </Typography>
                            </Box>
                            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                {group.rows.map((row, i) => (
                                    <ShareExpenseRow
                                        key={row.expense.id}
                                        row={row}
                                        subtext={[
                                            row.expense.locationName,
                                            row.expense.categoryName ?? 'Other',
                                        ]
                                            .filter(Boolean)
                                            .join(' • ')}
                                        showBottomBorder={
                                            i < group.rows.length - 1
                                        }
                                        onTap={onRowTap}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )
                })
            ) : (
                <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                    {rows.map((row, i) => (
                        <ShareExpenseRow
                            key={row.expense.id}
                            row={row}
                            subtext={[
                                dayjs(
                                    row.expense.date + 'T00:00:00'
                                ).format('M/D'),
                                row.expense.locationName,
                                row.expense.categoryName ?? 'Other',
                            ]
                                .filter(Boolean)
                                .join(' • ')}
                            showBottomBorder={i < rows.length - 1}
                            onTap={onRowTap}
                        />
                    ))}
                </Box>
            )}
        </Box>
    )
}
