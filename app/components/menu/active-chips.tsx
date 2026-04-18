'use client'

import { Box, Typography } from '@mui/material'
import { IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { colors } from '@/lib/colors'
import { useFilterLocationStore } from 'components/menu/filter/filter-location'
import { useFilterPaidByStore } from 'components/menu/filter/filter-paid-by'
import { useFilterSpendTypeStore } from 'components/menu/filter/filter-spend-type'
import { useFilterSplitBetweenStore } from 'components/menu/filter/filter-split-between'
import { useSortCostStore } from 'components/menu/sort/sort-cost'
import { useSortDateStore } from 'components/menu/sort/sort-date'
import { useSortItemNameStore } from 'components/menu/sort/sort-item-name'

type ChipSpec = {
    key: string
    label: string
    prefix?: string
    onRemove: () => void
}

const ROW_HEIGHT = 28

const orderSuffix = (order: number) => (order === 1 ? ' ↓' : order === 2 ? ' ↑' : '')

export function ActiveChips({ leading }: { leading?: React.ReactNode } = {}) {
    const splitFilters = useFilterSplitBetweenStore((s) => s.filters)
    const splitClick = useFilterSplitBetweenStore((s) => s.handleFilterClick)
    const paidByFilters = useFilterPaidByStore((s) => s.filters)
    const paidByClick = useFilterPaidByStore((s) => s.handleFilterClick)
    const spendTypeFilters = useFilterSpendTypeStore((s) => s.filters)
    const spendTypeClick = useFilterSpendTypeStore((s) => s.handleFilterClick)
    const locationFilters = useFilterLocationStore((s) => s.filters)
    const locationClick = useFilterLocationStore((s) => s.handleFilterClick)

    const dateOrder = useSortDateStore((s) => s.order)
    const toggleDate = useSortDateStore((s) => s.toggleSortOrder)
    const costOrder = useSortCostStore((s) => s.order)
    const toggleCost = useSortCostStore((s) => s.toggleSortOrder)
    const nameOrder = useSortItemNameStore((s) => s.order)
    const toggleName = useSortItemNameStore((s) => s.toggleSortOrder)

    const chips: ChipSpec[] = []

    if (dateOrder !== 0) {
        chips.push({
            key: 'sort-date',
            label: 'Date' + orderSuffix(dateOrder),
            prefix: 'Sort',
            onRemove: () => {
                while (useSortDateStore.getState().order !== 0) toggleDate()
            },
        })
    }
    if (costOrder !== 0) {
        chips.push({
            key: 'sort-cost',
            label: 'Cost' + orderSuffix(costOrder),
            prefix: 'Sort',
            onRemove: () => {
                while (useSortCostStore.getState().order !== 0) toggleCost()
            },
        })
    }
    if (nameOrder !== 0) {
        chips.push({
            key: 'sort-name',
            label: 'Name' + orderSuffix(nameOrder),
            prefix: 'Sort',
            onRemove: () => {
                while (useSortItemNameStore.getState().order !== 0) toggleName()
            },
        })
    }

    Array.from(splitFilters.entries()).forEach(([name, active]) => {
        if (active) chips.push({ key: 'split-' + name, label: name, prefix: 'Split', onRemove: () => splitClick(name) })
    })
    Array.from(paidByFilters.entries()).forEach(([name, active]) => {
        if (active) chips.push({ key: 'paid-' + name, label: name, prefix: 'Paid', onRemove: () => paidByClick(name) })
    })
    Array.from(spendTypeFilters.entries()).forEach(([cat, active]) => {
        if (active) chips.push({ key: 'cat-' + cat, label: cat, onRemove: () => spendTypeClick(cat) })
    })
    Array.from(locationFilters.entries()).forEach(([loc, active]) => {
        if (active) chips.push({ key: 'loc-' + loc, label: loc, onRemove: () => locationClick(loc) })
    })

    const containerRef = useRef<HTMLDivElement>(null)
    const [overflowing, setOverflowing] = useState(false)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        const el = containerRef.current
        if (el) {
            setOverflowing(el.scrollHeight > el.clientHeight + 1)
        } else {
            setOverflowing(false)
        }
    }, [chips.length, expanded])

    // Reset expand when collapsed away (no chips)
    useEffect(() => {
        if (chips.length === 0 && expanded) setExpanded(false)
    }, [chips.length, expanded])

    return (
        <Box
            sx={{
                paddingX: 2,
                paddingTop: 0.75,
                minHeight: ROW_HEIGHT + 4,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
            }}>
            {leading && <Box sx={{ flexShrink: 0 }}>{leading}</Box>}
            <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
                ref={containerRef}
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.5,
                    maxHeight: expanded ? 'none' : ROW_HEIGHT,
                    overflow: 'hidden',
                    transition: 'max-height 0.2s ease',
                }}>
                {chips.map((chip) => (
                    <Box
                        key={chip.key}
                        onClick={chip.onRemove}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 0.5,
                            'height': ROW_HEIGHT,
                            'paddingLeft': 1,
                            'paddingRight': 0.75,
                            'borderRadius': '4px',
                            'border': `1px solid ${colors.primaryBlack}`,
                            'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                            'backgroundColor': colors.primaryYellow,
                            'flexShrink': 0,
                            'cursor': 'pointer',
                            'whiteSpace': 'nowrap',
                            '&:active': { opacity: 0.6 },
                        }}>
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'baseline',
                                gap: 0.5,
                                fontSize: 12,
                                lineHeight: 1,
                            }}>
                            {chip.prefix && (
                                <Box
                                    component="span"
                                    sx={{
                                        fontWeight: 700,
                                        color: colors.primaryBrown,
                                    }}>
                                    {chip.prefix}:
                                </Box>
                            )}
                            <Box
                                component="span"
                                sx={{
                                    fontWeight: 600,
                                    color: colors.primaryBlack,
                                }}>
                                {chip.label}
                            </Box>
                        </Box>
                        <IconX size={12} />
                    </Box>
                ))}
            </Box>
            {(overflowing || expanded) && chips.length > 0 && (
                <Box
                    onClick={() => setExpanded((v) => !v)}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 16,
                        mt: 0.25,
                        cursor: 'pointer',
                        color: colors.primaryBrown,
                    }}>
                    {expanded ? <IconChevronUp size={14} stroke={2.5} /> : <IconChevronDown size={14} stroke={2.5} />}
                </Box>
            )}
            </Box>
        </Box>
    )
}
