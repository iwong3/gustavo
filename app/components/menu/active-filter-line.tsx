'use client'

import { Box, Typography } from '@mui/material'
import { IconX } from '@tabler/icons-react'

import { colors } from '@/lib/colors'
import {
    useFilterLocationStore,
    useFilterPaidByStore,
    useFilterSpendTypeStore,
    useFilterSplitBetweenStore,
} from 'components/menu/filter/filter-stores'
import { resetRefine, useRefineStore } from 'components/menu/refine-store'
import { sortSpec, useSortStore } from 'components/menu/sort/sort-store'
import { useSpendData } from 'providers/spend-data-provider'
import { selectedOptions } from 'utils/expense-filters'

// One line saying what's on, under the search row.
//
// Replaces a chip-per-value row that grew without limit — ten filters made three
// rows and needed a chevron to expand. This says the same thing in a fixed 22px
// at any load, because extra values collapse to +N rather than each claiming a
// chip. It's a readout, not a control surface: the panel is one tap away and
// names everything in full, so this only has to remind you.
//
// Also carries the result count, which is otherwise nowhere on the page.

const ROW_HEIGHT = 22

type Part = { key: string; label: string; extra: number }

export function ActiveFilterLine() {
    const showPanel = useRefineStore((s) => s.show)
    const { filteredExpenses, expenses } = useSpendData()

    const sortField = useSortStore((s) => s.field)
    const sortDir = useSortStore((s) => s.dir)
    const sortIsDefault = useSortStore((s) => s.isDefault)()

    const paidBy = useFilterPaidByStore((s) => s.filters)
    const split = useFilterSplitBetweenStore((s) => s.filters)
    const spendType = useFilterSpendTypeStore((s) => s.filters)
    const location = useFilterLocationStore((s) => s.filters)

    const parts: Part[] = []

    // Sort first: it's the one that reorders everything below.
    if (!sortIsDefault) {
        parts.push({
            key: 'sort',
            label: `${sortSpec(sortField).label} ${sortDir === 'asc' ? '↑' : '↓'}`,
            extra: 0,
        })
    }
    // Panel order, so the line and the panel read the same way down.
    for (const [key, filters] of [
        ['paid', paidBy],
        ['split', split],
        ['cat', spendType],
        ['loc', location],
    ] as const) {
        const chosen = selectedOptions(filters)
        if (chosen.length === 0) continue
        parts.push({ key, label: chosen[0], extra: chosen.length - 1 })
    }

    // Nothing on — don't reserve the row.
    if (parts.length === 0) return null

    return (
        // 10px above; the toolbar drops its own bottom padding to 10px while
        // this row is up, so the line sits evenly between the search field and
        // the first card instead of hugging the search bar.
        <Box sx={{ paddingX: 2, paddingTop: 1.25 }}>
            <Box
                onClick={showPanel}
                role="button"
                aria-label="Active filters — open refine"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.875,
                    height: ROW_HEIGHT,
                    cursor: 'pointer',
                    userSelect: 'none',
                }}>
                <Typography
                    sx={{
                        fontSize: 11.5,
                        color: colors.primaryBrown,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 1,
                        minWidth: 0,
                    }}>
                    {parts.map((part, i) => (
                        <Box component="span" key={part.key}>
                            {i > 0 && ' · '}
                            <Box
                                component="span"
                                sx={{
                                    fontWeight: 700,
                                    color: colors.primaryBlack,
                                }}>
                                {part.label}
                            </Box>
                            {part.extra > 0 && ` +${part.extra}`}
                        </Box>
                    ))}
                </Typography>

                {/* Dotted rule to the count — the same device the receipt uses to
                    tie a label to its value. */}
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 8,
                        borderTop: `1px dashed ${colors.primaryBlack}4d`,
                    }}
                />
                <Typography
                    sx={{
                        fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: colors.primaryBrown,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                    {filteredExpenses.length} of {expenses.length}
                </Typography>

                <Box
                    onClick={(e) => {
                        // Otherwise the tap falls through and opens the panel.
                        e.stopPropagation()
                        resetRefine()
                    }}
                    role="button"
                    aria-label="Clear all filters and sorting"
                    sx={{
                        'display': 'flex',
                        'alignItems': 'center',
                        'justifyContent': 'center',
                        'width': 16,
                        'height': 16,
                        'flexShrink': 0,
                        'borderRadius': '3px',
                        'border': `1px solid ${colors.primaryBlack}`,
                        'backgroundColor': colors.primaryWhite,
                        'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                        'cursor': 'pointer',
                        '&:active': {
                            boxShadow: 'none',
                            transform: 'translate(1px, 1px)',
                        },
                        'transition': 'transform 0.1s, box-shadow 0.1s',
                    }}>
                    <IconX size={9} stroke={3} />
                </Box>
            </Box>
        </Box>
    )
}
