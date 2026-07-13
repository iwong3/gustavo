'use client'

import {
    Box,
    ClickAwayListener,
    InputAdornment,
    TextField,
} from '@mui/material'
import { IconCheck, IconChevronDown, IconSearch, IconX } from '@tabler/icons-react'
import { useState } from 'react'

import { colors, hardShadow } from '@/lib/colors'
import { fieldSx } from '@/lib/form-styles'

/** Date/amount sort ids shared by the insights list and debt detail page. */
export type ListSort = 'date-asc' | 'date-desc' | 'amount-desc' | 'amount-asc'

export const LIST_SORT_OPTIONS: {
    id: ListSort
    label: string
    menuLabel: string
}[] = [
    { id: 'date-asc', label: 'Date ↑', menuLabel: 'Date · trip order' },
    { id: 'date-desc', label: 'Date ↓', menuLabel: 'Date · latest first' },
    { id: 'amount-desc', label: '$ high', menuLabel: 'Amount · highest first' },
    { id: 'amount-asc', label: '$ low', menuLabel: 'Amount · lowest first' },
]

/**
 * Search field + one-tap sort menu on a single 34px row — the pattern
 * introduced on the insights page, shared with the debt detail page.
 */
export function ListControls({
    search,
    onSearchChange,
    sort,
    onSortChange,
    placeholder = 'Search expenses…',
}: {
    search: string
    onSearchChange: (search: string) => void
    sort: ListSort
    onSortChange: (sort: ListSort) => void
    placeholder?: string
}) {
    const [sortMenuOpen, setSortMenuOpen] = useState(false)
    const activeSort = LIST_SORT_OPTIONS.find((o) => o.id === sort)!

    return (
        <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={placeholder}
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
                            'transition': 'transform 0.1s, box-shadow 0.1s',
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
                            {LIST_SORT_OPTIONS.map((option, i) => {
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
                                            'justifyContent': 'space-between',
                                            'gap': 1,
                                            'paddingX': 1.5,
                                            'paddingY': 1,
                                            'fontSize': 13,
                                            'fontWeight': isActive ? 700 : 500,
                                            'cursor': 'pointer',
                                            'backgroundColor': isActive
                                                ? colors.secondaryYellow
                                                : colors.primaryWhite,
                                            'borderBottom':
                                                i <
                                                LIST_SORT_OPTIONS.length - 1
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
    )
}
