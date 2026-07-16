'use client'

import { Box, Typography } from '@mui/material'
import { useMemo } from 'react'

import { cardSx, colors } from '@/lib/colors'

import type { Expense } from '@/lib/types'

// "Was this a big one?" — the question the raw number can't answer. Everything
// here is computed from the trip's expenses already in context: no new queries,
// no new columns, no API calls.

interface DrawerStatTilesProps {
    expense: Expense
    costUsd: number
    /** All UNFILTERED trip expenses — the ranking must be against the whole
     *  trip, not whatever the list happens to be filtered to. */
    allExpenses: Expense[]
    getUsdValue: (exp: Expense) => number
}

const Tile = ({ value, label }: { value: string; label: string }) => (
    <Box sx={{ ...cardSx, flex: 1, paddingX: 1.25, paddingY: 1 }}>
        <Typography
            sx={{
                fontSize: 19,
                fontWeight: 800,
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
                color: colors.primaryBlack,
            }}>
            {value}
        </Typography>
        <Typography
            sx={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                lineHeight: 1.35,
                color: colors.primaryBrown,
                marginTop: 0.25,
            }}>
            {label}
        </Typography>
    </Box>
)

export const DrawerStatTiles = ({
    expense,
    costUsd,
    allExpenses,
    getUsdValue,
}: DrawerStatTilesProps) => {
    const tiles = useMemo(() => {
        // A $0 or unconvertible expense has no meaningful rank or share
        if (!Number.isFinite(costUsd) || costUsd <= 0) return []

        const result: { value: string; label: string }[] = []

        // 1. Price rank across the trip. Ties share a rank (two $50s are both #1).
        const pricier = allExpenses.filter((e) => getUsdValue(e) > costUsd).length
        if (allExpenses.length > 1) {
            result.push({
                value: `#${pricier + 1}`,
                label: `priciest of ${allExpenses.length}`,
            })
        }

        // 2. Share of its own day's group spend
        const dayTotal = allExpenses
            .filter((e) => e.date === expense.date)
            .reduce((sum, e) => sum + getUsdValue(e), 0)
        if (dayTotal > 0) {
            const pct = Math.round((costUsd / dayTotal) * 100)
            result.push({ value: `${pct}%`, label: "of that day's spend" })
        }

        // 3. Multiple of the trip's average for this category. Needs peers to
        //    average against, else "1.0× your food avg" states the obvious.
        if (expense.categoryId != null) {
            const peers = allExpenses.filter(
                (e) =>
                    e.categoryId === expense.categoryId &&
                    String(e.id) !== String(expense.id) &&
                    getUsdValue(e) > 0
            )
            if (peers.length > 0) {
                const avg = peers.reduce((sum, e) => sum + getUsdValue(e), 0) / peers.length
                if (avg > 0) {
                    const multiple = costUsd / avg
                    result.push({
                        value: `${multiple.toFixed(1)}×`,
                        label: `avg ${expense.categoryName ?? 'category'}`,
                    })
                }
            }
        }

        return result
    }, [expense, costUsd, allExpenses, getUsdValue])

    if (tiles.length === 0) return null

    return (
        <Box sx={{ display: 'flex', gap: 1, marginX: 2.5, marginBottom: 2 }}>
            {tiles.map((t) => (
                <Tile key={t.label} value={t.value} label={t.label} />
            ))}
        </Box>
    )
}
