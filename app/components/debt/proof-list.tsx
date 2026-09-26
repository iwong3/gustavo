'use client'

import { Box, Collapse, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { memo, useMemo, useState } from 'react'

import { cardSx, colors, pressRowSx, toneColors } from '@/lib/colors'
import type { Expense } from '@/lib/types'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { usePressPrefetch } from 'hooks/use-press-prefetch'
import { formatUsd } from 'utils/currency'
import { CategoryIcon } from 'utils/icons'

const RULE = `1px solid ${colors.primaryBlack}1a`

/** One expense's effect on a balance, already rounded so the list adds up. */
export type ProofRow = {
    expense: Expense
    /** + they owe the person on show, − the person on show owes them. */
    cents: number
    /** "Marco paid $540.00 · split 3 ways" */
    subline: string
}

const signed = (cents: number) => `${cents < 0 ? '−' : '+'}${formatUsd(Math.abs(cents) / 100, 2)}`
const toneOf = (cents: number) => (cents < 0 ? toneColors.negative : toneColors.positive)

/**
 * The expenses behind a waterfall row, in the Expenses page's format: a card
 * per day under its collapsible date header, the expense name leading each
 * row and its effect on the balance on the right. The days' totals add up
 * to the row's amount, to the cent.
 */
export const ProofList = memo(function ProofList({
    title,
    rows,
    totalCents,
    onTap,
    hrefOf,
    tripStartDate,
    tripDays,
}: {
    /** e.g. "With Marco" / "Every expense" */
    title: string
    rows: ProofRow[]
    totalCents: number
    onTap: (expense: Expense) => void
    hrefOf: (expense: Expense) => string
    tripStartDate?: string
    tripDays?: number
}) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
    const onPointerDown = usePressPrefetch(rows[0] && hrefOf(rows[0].expense))
    const tripStart = tripStartDate ? dayjs(tripStartDate + 'T00:00:00') : null

    const days = useMemo(() => {
        const groups: { date: string; rows: ProofRow[]; cents: number }[] = []
        const sorted = [...rows].sort((a, b) => (a.expense.date < b.expense.date ? -1 : a.expense.date > b.expense.date ? 1 : 0))
        for (const r of sorted) {
            const last = groups[groups.length - 1]
            if (last && last.date === r.expense.date) {
                last.rows.push(r)
                last.cents += r.cents
            } else {
                groups.push({ date: r.expense.date, rows: [r], cents: r.cents })
            }
        }
        return groups
    }, [rows])

    const toggle = (date: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev)
            if (next.has(date)) next.delete(date)
            else next.add(date)
            return next
        })

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.primaryBrown }}>
                    {title} · {rows.length} {rows.length === 1 ? 'expense' : 'expenses'}
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: toneOf(totalCents) }}>
                    {signed(totalCents)}
                </Typography>
            </Box>
            {rows.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: colors.primaryBrown, textAlign: 'center', paddingY: 2 }}>
                    No expenses.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} onPointerDown={onPointerDown}>
                    {days.map((g) => {
                        const dayNumber = tripStart ? dayjs(g.date + 'T00:00:00').diff(tripStart, 'day') + 1 : null
                        const inTrip = dayNumber !== null && tripDays !== undefined && dayNumber >= 1 && dayNumber <= tripDays
                        const isCollapsed = collapsed.has(g.date)
                        return (
                            <Box key={g.date} sx={{ ...cardSx, overflow: 'hidden' }}>
                                <DateGroupHeader
                                    date={g.date}
                                    dayTotal={g.cents / 100}
                                    totalLabel={<span style={{ color: toneOf(g.cents), fontVariantNumeric: 'tabular-nums' }}>{signed(g.cents)}</span>}
                                    dayNumber={inTrip ? dayNumber : null}
                                    totalDays={inTrip ? (tripDays ?? null) : null}
                                    expenseCount={g.rows.length}
                                    collapsed={isCollapsed}
                                    onToggle={() => toggle(g.date)}
                                />
                                <Collapse in={!isCollapsed} timeout={150}>
                                    {g.rows.map((r, i) => (
                                        <Box
                                            key={r.expense.id}
                                            data-href={hrefOf(r.expense)}
                                            onClick={() => onTap(r.expense)}
                                            sx={{
                                                ...pressRowSx,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.25,
                                                paddingX: 1.5,
                                                paddingY: 1,
                                                cursor: 'pointer',
                                                borderBottom: i < g.rows.length - 1 ? RULE : 'none',
                                            }}>
                                            <CategoryIcon expense={r.expense} size={28} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                                                    {r.expense.name}
                                                </Typography>
                                                <Typography noWrap sx={{ fontSize: 11.5, color: colors.primaryBrown, lineHeight: 1.3, marginTop: 0.2 }}>
                                                    {r.subline}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0, color: toneOf(r.cents) }}>
                                                {signed(r.cents)}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Collapse>
                            </Box>
                        )
                    })}
                </Box>
            )}
        </Box>
    )
})
