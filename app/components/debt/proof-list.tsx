'use client'

import { Box, Collapse, Typography } from '@mui/material'
import { IconGift, IconUsers } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { memo, useMemo, useState } from 'react'

import { cardSx, colors, toneColors } from '@/lib/colors'
import type { Expense } from '@/lib/types'
import { ListControls, type SortOption } from 'components/list-controls'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { ExpenseRow } from 'components/receipts/expense-row'
import { usePressPrefetch } from 'hooks/use-press-prefetch'

import { ledgerUsd, signedUsd } from './ledger-money'

const RULE = `1px solid ${colors.primaryBlack}1f`

/** One expense's effect on a balance, already rounded so the list adds up. */
export type ProofRow = {
    expense: Expense
    /** + they owe the person on show, − the person on show owes them. */
    cents: number
    /** The expense in USD (for the total sort). */
    usd: number
    /** How many people it's split between. */
    splitCount: number
    /** Someone in the split was treated (covered by the payer). */
    treated: boolean
}

type ProofSort =
    | 'date-asc'
    | 'date-desc'
    | 'total-desc'
    | 'total-asc'
    | 'debt-desc'
    | 'debt-asc'

const SORT_OPTIONS: SortOption<ProofSort>[] = [
    { id: 'date-asc', label: 'Date ↑', menuLabel: 'Date · trip order' },
    { id: 'date-desc', label: 'Date ↓', menuLabel: 'Date · latest first' },
    {
        id: 'total-desc',
        label: '$ high',
        menuLabel: 'Expense total · highest first',
    },
    {
        id: 'total-asc',
        label: '$ low',
        menuLabel: 'Expense total · lowest first',
    },
    { id: 'debt-desc', label: 'Debt high', menuLabel: 'Debt · highest first' },
    { id: 'debt-asc', label: 'Debt low', menuLabel: 'Debt · lowest first' },
]

/** Rendered width of an amount in the debt column (14px/800, tabular). */
let measureCtx: CanvasRenderingContext2D | null = null
function amountWidth(text: string): number {
    if (typeof document === 'undefined') return text.length * 8
    measureCtx ??= document.createElement('canvas').getContext('2d')
    if (!measureCtx) return text.length * 8
    measureCtx.font = `800 14px ${getComputedStyle(document.body).fontFamily}`
    return measureCtx.measureText(text).width
}

const toneOf = (cents: number) =>
    cents < 0 ? toneColors.negative : toneColors.positive

/**
 * The expenses behind a waterfall row, in the Expenses page's own row
 * format, each with one extra column: its effect on the balance and how
 * many it was split between (a gift when someone was treated). Date sorts
 * group into day cards as on the Expenses page; total and debt sorts are
 * one flat card with the date on each row. Unfiltered, the column adds up
 * to the chart row's amount, to the cent.
 */
export const ProofList = memo(function ProofList({
    title,
    rows,
    onTap,
    hrefOf,
    tripStartDate,
    tripDays,
}: {
    /** e.g. "With Marco" / "Every expense" */
    title: string
    rows: ProofRow[]
    onTap: (expense: Expense) => void
    hrefOf: (expense: Expense) => string
    tripStartDate?: string
    tripDays?: number
}) {
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<ProofSort>('date-asc')
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
    const tripStart = tripStartDate ? dayjs(tripStartDate + 'T00:00:00') : null
    const isDateSort = sort === 'date-asc' || sort === 'date-desc'

    const shown = useMemo(() => {
        const q = search.toLowerCase().trim()
        const matches = q
            ? rows.filter((r) =>
                  [
                      r.expense.name,
                      r.expense.categoryName ?? '',
                      r.expense.locationName ?? '',
                      r.expense.paidBy.firstName,
                  ]
                      .join(' ')
                      .toLowerCase()
                      .includes(q)
              )
            : rows
        const byDate = (a: ProofRow, b: ProofRow) =>
            a.expense.date < b.expense.date
                ? -1
                : a.expense.date > b.expense.date
                  ? 1
                  : 0
        return [...matches].sort((a, b) => {
            switch (sort) {
                case 'date-desc':
                    return byDate(b, a)
                case 'total-desc':
                    return b.usd - a.usd
                case 'total-asc':
                    return a.usd - b.usd
                case 'debt-desc':
                    return Math.abs(b.cents) - Math.abs(a.cents)
                case 'debt-asc':
                    return Math.abs(a.cents) - Math.abs(b.cents)
                case 'date-asc':
                default:
                    return byDate(a, b)
            }
        })
    }, [rows, search, sort])
    const shownCents = shown.reduce((t, r) => t + r.cents, 0)
    // One width for the whole list: its widest amount, measured, so every
    // row's price stack lines up with the next and no space is wasted
    const debtW = useMemo(
        () =>
            Math.ceil(
                Math.max(
                    0,
                    ...rows.map((r) => amountWidth(ledgerUsd(r.cents)))
                )
            ),
        [rows]
    )

    const days = useMemo(() => {
        if (!isDateSort) return []
        const groups: { date: string; rows: ProofRow[]; cents: number }[] = []
        for (const r of shown) {
            const last = groups[groups.length - 1]
            if (last && last.date === r.expense.date) {
                last.rows.push(r)
                last.cents += r.cents
            } else {
                groups.push({ date: r.expense.date, rows: [r], cents: r.cents })
            }
        }
        return groups
    }, [shown, isDateSort])

    const onPointerDown = usePressPrefetch(shown[0] && hrefOf(shown[0].expense))

    const toggle = (date: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev)
            if (next.has(date)) next.delete(date)
            else next.add(date)
            return next
        })

    const renderRow = (r: ProofRow, divider: boolean, withDate: boolean) => (
        <Box
            key={r.expense.id}
            data-href={hrefOf(r.expense)}
            sx={{ borderBottom: divider ? RULE : 'none' }}>
            <ExpenseRow
                expense={r.expense}
                onTap={onTap}
                hideDate={!withDate}
                trailing={<DebtColumn row={r} width={debtW} />}
            />
        </Box>
    )

    const count =
        shown.length === rows.length
            ? `${rows.length} ${rows.length === 1 ? 'expense' : 'expenses'}`
            : `${shown.length} of ${rows.length}`

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 1,
                }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: colors.primaryBrown,
                    }}>
                    {title} · {count}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: toneOf(shownCents),
                    }}>
                    {signedUsd(shownCents)}
                </Typography>
            </Box>
            <ListControls
                search={search}
                onSearchChange={setSearch}
                sort={sort}
                onSortChange={setSort}
                options={SORT_OPTIONS}
            />
            {/* 12px below the controls, as on Insights */}
            <Box sx={{ marginTop: 0.5 }} onPointerDown={onPointerDown}>
                {shown.length === 0 ? (
                    <Typography
                        sx={{
                            fontSize: 13,
                            color: colors.primaryBrown,
                            textAlign: 'center',
                            paddingY: 2,
                        }}>
                        Nothing matches.
                    </Typography>
                ) : isDateSort ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                        }}>
                        {days.map((g) => {
                            const dayNumber = tripStart
                                ? dayjs(g.date + 'T00:00:00').diff(
                                      tripStart,
                                      'day'
                                  ) + 1
                                : null
                            const inTrip =
                                dayNumber !== null &&
                                tripDays !== undefined &&
                                dayNumber >= 1 &&
                                dayNumber <= tripDays
                            const isCollapsed = collapsed.has(g.date)
                            return (
                                <Box
                                    key={g.date}
                                    sx={{ ...cardSx, overflow: 'hidden' }}>
                                    <DateGroupHeader
                                        date={g.date}
                                        dayTotal={g.cents / 100}
                                        paddingRight={1.5}
                                        totalLabel={
                                            <span
                                                style={{
                                                    color: toneOf(g.cents),
                                                    fontVariantNumeric:
                                                        'tabular-nums',
                                                }}>
                                                {signedUsd(g.cents)}
                                            </span>
                                        }
                                        dayNumber={inTrip ? dayNumber : null}
                                        totalDays={
                                            inTrip ? (tripDays ?? null) : null
                                        }
                                        expenseCount={g.rows.length}
                                        collapsed={isCollapsed}
                                        onToggle={() => toggle(g.date)}
                                    />
                                    <Collapse in={!isCollapsed} timeout={150}>
                                        {g.rows.map((r, i) =>
                                            renderRow(
                                                r,
                                                i < g.rows.length - 1,
                                                false
                                            )
                                        )}
                                    </Collapse>
                                </Box>
                            )
                        })}
                    </Box>
                ) : (
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                        {shown.map((r, i) =>
                            renderRow(r, i < shown.length - 1, true)
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    )
})

/**
 * The debt column: the expense's effect on the balance over how many it
 * was split between. Built like the row's own price + payer stack beside
 * it (same line heights, same 4px gap) so the two read as one line each,
 * and right-aligned so the amounts line up down the card.
 */
function DebtColumn({ row, width }: { row: ProofRow; width: number }) {
    return (
        <Box
            sx={{
                width,
                flexShrink: 0,
                // A dashed divider down the row's full height marks it as its
                // own stat; the content stays centred, so its two lines still
                // sit level with the price and the payer avatar
                alignSelf: 'stretch',
                marginY: -1.5,
                // 12px either side of the divider (the row's own gap), same
                // as the row's padding: both boxes are evenly inset
                paddingLeft: '11px', // + the 1px divider = 12px
                borderLeft: `1px dashed ${colors.primaryBlack}40`,
                boxSizing: 'content-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 0.5,
            }}>
            {/* Matches the price: 14px, 1.2 line height */}
            <Typography
                sx={{
                    fontSize: 14,
                    fontWeight: 800,
                    lineHeight: 1.2,
                    fontVariantNumeric: 'tabular-nums',
                    color: toneOf(row.cents),
                }}
                aria-label={`${row.cents < 0 ? 'you owe' : 'owed'} ${ledgerUsd(row.cents)}`}>
                {/* No sign: red/green carries the direction here; the day and
                    list totals keep theirs */}
                {ledgerUsd(row.cents)}
            </Typography>
            {/* Matches the payer avatar: 20px tall */}
            <Box
                aria-label={`Split ${row.splitCount} ways${row.treated ? ', someone treated' : ''}`}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.4,
                    height: 20,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: colors.primaryBrown,
                }}>
                {row.treated && <IconGift size={13} stroke={2} />}
                <IconUsers size={13} stroke={2} />
                {row.splitCount}
            </Box>
        </Box>
    )
}
