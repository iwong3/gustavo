'use client'

import {
    Box,
    ClickAwayListener,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material'
import { IconCheck, IconChevronDown, IconSearch, IconX } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'

import { cardSx, colors, hardShadow } from '@/lib/colors'
import { fieldSx } from '@/lib/form-styles'
import type { Expense } from '@/lib/types'
import type { MySpendRow, MySpendSort } from 'hooks/useMySpendData'
import { CategoryIcon } from 'utils/icons'

const SORT_OPTIONS: { id: MySpendSort; label: string; menuLabel: string }[] = [
    { id: 'date-asc', label: 'Date ↑', menuLabel: 'Date · trip order' },
    { id: 'date-desc', label: 'Date ↓', menuLabel: 'Date · latest first' },
    { id: 'amount-desc', label: '$ high', menuLabel: 'Amount · highest first' },
    { id: 'amount-asc', label: '$ low', menuLabel: 'Amount · lowest first' },
]

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
    const [sortMenuOpen, setSortMenuOpen] = useState(false)

    const activeSort = SORT_OPTIONS.find((o) => o.id === sort)!
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
            <Box sx={{ display: 'flex', gap: 1, marginBottom: 1.25 }}>
                <TextField
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search expenses…"
                    size="small"
                    sx={{
                        ...fieldSx,
                        'flex': 1,
                        '& .MuiOutlinedInput-root': {
                            height: 34,
                            fontSize: 13,
                            boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        },
                    }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch
                                        size={15}
                                        color={colors.primaryBrown}
                                    />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <Box
                                        onClick={() => onSearchChange('')}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            padding: 0.25,
                                        }}>
                                        <IconX
                                            size={15}
                                            color={colors.primaryBrown}
                                        />
                                    </Box>
                                </InputAdornment>
                            ) : undefined,
                        },
                    }}
                />

                {/* Sort menu */}
                <ClickAwayListener onClickAway={() => setSortMenuOpen(false)}>
                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                        <Box
                            onClick={() => setSortMenuOpen((o) => !o)}
                            sx={{
                                'display': 'flex',
                                'alignItems': 'center',
                                'justifyContent': 'center',
                                'gap': 0.5,
                                'height': 34,
                                'minWidth': 88,
                                'paddingX': 1.25,
                                'backgroundColor': sortMenuOpen
                                    ? colors.primaryYellow
                                    : colors.primaryWhite,
                                ...hardShadow,
                                'borderRadius': '4px',
                                'fontSize': 12.5,
                                'fontWeight': 700,
                                'cursor': 'pointer',
                                'userSelect': 'none',
                                '&:active': {
                                    boxShadow: 'none',
                                    transform: 'translate(2px, 2px)',
                                },
                                'transition':
                                    'transform 0.1s, box-shadow 0.1s',
                            }}>
                            {activeSort.label}
                            <IconChevronDown
                                size={13}
                                stroke={2.5}
                                style={{
                                    transform: sortMenuOpen
                                        ? 'rotate(180deg)'
                                        : 'none',
                                    transition: 'transform 0.15s',
                                }}
                            />
                        </Box>
                        {sortMenuOpen && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    right: 0,
                                    zIndex: 20,
                                    minWidth: 200,
                                    backgroundColor: colors.primaryWhite,
                                    border: `1.5px solid ${colors.primaryBlack}`,
                                    borderRadius: '6px',
                                    boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                                    overflow: 'hidden',
                                }}>
                                {SORT_OPTIONS.map((option, i) => {
                                    const isActive = option.id === sort
                                    return (
                                        <Box
                                            key={option.id}
                                            onClick={() => {
                                                onSortChange(option.id)
                                                setSortMenuOpen(false)
                                            }}
                                            sx={{
                                                'display': 'flex',
                                                'alignItems': 'center',
                                                'justifyContent':
                                                    'space-between',
                                                'gap': 1,
                                                'paddingX': 1.5,
                                                'paddingY': 1,
                                                'fontSize': 13,
                                                'fontWeight': isActive
                                                    ? 700
                                                    : 500,
                                                'cursor': 'pointer',
                                                'backgroundColor': isActive
                                                    ? colors.secondaryYellow
                                                    : colors.primaryWhite,
                                                'borderBottom':
                                                    i < SORT_OPTIONS.length - 1
                                                        ? `1px solid ${colors.primaryBlack}20`
                                                        : 'none',
                                                '&:active': {
                                                    backgroundColor:
                                                        colors.primaryYellow,
                                                },
                                            }}>
                                            {option.menuLabel}
                                            {isActive && (
                                                <IconCheck
                                                    size={15}
                                                    stroke={2.5}
                                                />
                                            )}
                                        </Box>
                                    )
                                })}
                            </Box>
                        )}
                    </Box>
                </ClickAwayListener>
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
