'use client'

import { Box, Collapse, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { memo, useMemo, useState } from 'react'

import { cardSx, colors, pressRowSx } from '@/lib/colors'
import type { Expense } from '@/lib/types'
import { ListControls } from 'components/list-controls'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { usePressPrefetch } from 'hooks/use-press-prefetch'
import { useProgressiveCount } from 'hooks/use-progressive-count'
import type { MySpendRow, MySpendSort } from 'hooks/useMySpendData'
import { formatUsd } from 'utils/currency'
import { CategoryIcon } from 'utils/icons'

/**
 * The expenses behind the Insights chart.
 *
 *   groups — the Expenses page's format: a card per day with its collapsible
 *            date header (Day N of M, count, total) (the default)
 *   bands  — one continuous card with slim date bands
 *   agenda — one card, the date as a quiet left margin, a bar for your share
 *            of each bill
 *
 * The expense name leads every row; one amount (the share) sits on the right.
 */
export type SpendListVariant = 'groups' | 'bands' | 'agenda'

const RULE = `1px solid ${colors.primaryBlack}1a`
const DAY_RULE = `1px solid ${colors.primaryBlack}`

/** Just this person on the bill (share ≈ total)? */
const isSolo = (r: MySpendRow) => r.usdTotal > 0 && r.share >= r.usdTotal - 0.005

const shareText = (r: MySpendRow, soloLabel: string) =>
    isSolo(r) ? soloLabel : `share of ${formatUsd(r.usdTotal)}`

/** Name (+ subline or share bar) left, the share right. Memoized: a filter
 *  or sort change re-renders the list, but rows that stay are untouched. */
const Row = memo(function Row({
    row,
    variant,
    subline,
    divider,
    onTap,
    href,
}: {
    row: MySpendRow
    variant: SpendListVariant
    subline?: string
    divider: string | 'none'
    onTap: (expense: Expense) => void
    href?: string
}) {
    const fraction = row.usdTotal > 0 ? Math.min(1, row.share / row.usdTotal) : 1
    return (
        <Box
            data-href={href}
            onClick={() => onTap(row.expense)}
            sx={{
                ...pressRowSx,
                display: 'flex',
                alignItems: 'center',
                gap: variant === 'agenda' ? 1.1 : 1.25,
                paddingX: variant === 'agenda' ? 1.4 : 1.5,
                paddingY: 1,
                cursor: 'pointer',
                borderBottom: divider,
            }}>
            <CategoryIcon expense={row.expense} size={variant === 'agenda' ? 24 : 28} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                    {row.expense.name}
                </Typography>
                {variant === 'agenda' ? (
                    // Share of the bill as a thin bar (full = just you)
                    <Box sx={{ height: 3, borderRadius: 2, backgroundColor: `${colors.primaryBlack}1a`, marginTop: 0.6 }}>
                        <Box sx={{ width: `${fraction * 100}%`, height: 3, borderRadius: 2, backgroundColor: '#e0a44a' }} />
                    </Box>
                ) : (
                    <Typography noWrap sx={{ fontSize: 11.5, color: colors.primaryBrown, lineHeight: 1.3, marginTop: 0.2 }}>
                        {subline}
                    </Typography>
                )}
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {formatUsd(row.share, 2)}
            </Typography>
        </Box>
    )
})

interface MySpendListProps {
    /** Already sorted by the active sort. */
    rows: MySpendRow[]
    sort: MySpendSort
    onSortChange: (sort: MySpendSort) => void
    search: string
    onSearchChange: (search: string) => void
    onRowTap: (expense: Expense) => void
    /** Where a row navigates — prefetched on press (see usePressPrefetch). */
    rowHref?: (expense: Expense) => string
    variant?: SpendListVariant
    /** Subline when the person is the only one on the bill: "just you". */
    soloLabel?: string
    /** Groups style: the trip's range, for each day's "Day N of M". */
    tripStartDate?: string
    tripDays?: number
}

/** Memoized: the Insights page re-renders on every toggle/filter tap, and
 *  the list only needs to when its rows or controls change. */
export const MySpendList = memo(function MySpendList({
    rows,
    sort,
    onSortChange,
    search,
    onSearchChange,
    onRowTap,
    rowHref,
    variant = 'groups',
    soloLabel = 'just you',
    tripStartDate,
    tripDays,
}: MySpendListProps) {
    // Groups style: collapsed days, like the Expenses page
    const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())
    const toggleDate = (date: string) =>
        setCollapsedDates((prev) => {
            const next = new Set(prev)
            if (next.has(date)) next.delete(date)
            else next.add(date)
            return next
        })
    const tripStart = tripStartDate ? dayjs(tripStartDate + 'T00:00:00') : null
    const isDateSort = sort === 'date-asc' || sort === 'date-desc'

    // Mount the first screenful now, the rest just after first paint. The
    // list starts ~350px down the page, below the chart.
    const limit = useProgressiveCount(rows.length, 350)
    const onPointerDown = usePressPrefetch(rows[0] && rowHref?.(rows[0].expense))

    // Date sorts group by day (biggest share first within a day);
    // amount sorts render one flat ranked list
    const dayGroups = useMemo(() => {
        if (!isDateSort) return []
        const groups: { date: string; rows: MySpendRow[]; total: number }[] = []
        for (const row of rows) {
            const last = groups[groups.length - 1]
            if (last && last.date === row.expense.date) {
                last.rows.push(row)
                last.total += row.share
            } else {
                groups.push({ date: row.expense.date, rows: [row], total: row.share })
            }
        }
        for (const g of groups) g.rows.sort((a, b) => b.share - a.share)
        return groups
    }, [rows, isDateSort])

    const place = (r: MySpendRow) => r.expense.locationName
    const sublineInDay = (r: MySpendRow) => [place(r), shareText(r, soloLabel)].filter(Boolean).join(' · ')
    const sublineFlat = (r: MySpendRow) =>
        [dayjs(r.expense.date + 'T00:00:00').format('MMM D'), place(r), shareText(r, soloLabel)].filter(Boolean).join(' · ')

    const renderRow = (r: MySpendRow, subline: string, divider: string | 'none') => (
        <Row
            key={r.expense.id}
            row={r}
            variant={variant}
            subline={subline}
            divider={divider}
            onTap={onRowTap}
            href={rowHref?.(r.expense)}
        />
    )

    // Day groups within the render budget (totals still count every row)
    let budget = limit
    const shownGroups: ((typeof dayGroups)[number] & { count: number })[] = []
    for (const g of dayGroups) {
        if (budget <= 0) break
        shownGroups.push({ ...g, count: g.rows.length, rows: g.rows.slice(0, budget) })
        budget -= g.rows.length
    }
    const shownRows = rows.length > limit ? rows.slice(0, limit) : rows

    /** Agenda: day number + weekday as a left margin column. */
    const dateMargin = (date: string) => {
        const d = dayjs(date + 'T00:00:00')
        return (
            <Box
                sx={{
                    width: 44,
                    flexShrink: 0,
                    textAlign: 'center',
                    paddingTop: 1.25,
                    borderRight: RULE,
                }}>
                <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{d.date()}</Typography>
                <Typography
                    sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colors.primaryBrown, marginTop: 0.25 }}>
                    {d.format('ddd')}
                </Typography>
            </Box>
        )
    }

    let body: React.ReactNode
    if (rows.length === 0) {
        body = (
            <Typography sx={{ fontSize: 13, color: colors.primaryBrown, textAlign: 'center', paddingY: 2 }}>
                Nothing matches.
            </Typography>
        )
    } else if (variant === 'groups' && isDateSort) {
        body = (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {shownGroups.map((g) => {
                    const dayNumber = tripStart
                        ? dayjs(g.date + 'T00:00:00').diff(tripStart, 'day') + 1
                        : null
                    const inTrip = dayNumber !== null && tripDays !== undefined && dayNumber >= 1 && dayNumber <= tripDays
                    const collapsed = collapsedDates.has(g.date)
                    return (
                        <Box key={g.date} sx={{ ...cardSx, overflow: 'hidden' }}>
                            <DateGroupHeader
                                date={g.date}
                                dayTotal={g.total}
                                dayNumber={inTrip ? dayNumber : null}
                                totalDays={inTrip ? (tripDays ?? null) : null}
                                expenseCount={g.count}
                                collapsed={collapsed}
                                onToggle={() => toggleDate(g.date)}
                            />
                            <Collapse in={!collapsed} timeout={150}>
                                {g.rows.map((r, i) => renderRow(r, sublineInDay(r), i < g.rows.length - 1 ? RULE : 'none'))}
                            </Collapse>
                        </Box>
                    )
                })}
            </Box>
        )
    } else if (variant === 'agenda') {
        const blocks = isDateSort
            ? shownGroups.map((g) => ({ key: g.date, date: g.date, rows: g.rows }))
            : shownRows.map((r) => ({ key: String(r.expense.id), date: r.expense.date, rows: [r] }))
        body = (
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                {blocks.map((b, bi) => (
                    <Box key={b.key} sx={{ display: 'flex', borderBottom: bi < blocks.length - 1 ? RULE : 'none' }}>
                        {dateMargin(b.date)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {b.rows.map((r, i) => renderRow(r, '', i < b.rows.length - 1 ? RULE : 'none'))}
                        </Box>
                    </Box>
                ))}
            </Box>
        )
    } else if (isDateSort) {
        body = (
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                {shownGroups.map((g, gi) => (
                    <Box key={g.date}>
                        {/* Slim date band — lighter than the rows it labels */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingX: 1.5,
                                // Uppercase has no descenders, so a normal line
                                // box leaves it riding high — tight line height
                                // + even padding centres it
                                paddingY: '7px',
                                backgroundColor: '#d4ddb6',
                                borderBottom: DAY_RULE,
                                borderTop: gi > 0 ? DAY_RULE : 'none',
                            }}>
                            <Typography sx={{ fontSize: 11, lineHeight: 1, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                {dayjs(g.date + 'T00:00:00').format('ddd, MMM D')}
                            </Typography>
                            <Typography sx={{ fontSize: 11, lineHeight: 1, fontWeight: 700, color: colors.primaryBrown, fontVariantNumeric: 'tabular-nums' }}>
                                {formatUsd(g.total)}
                            </Typography>
                        </Box>
                        {g.rows.map((r, i) => renderRow(r, sublineInDay(r), i < g.rows.length - 1 ? RULE : 'none'))}
                    </Box>
                ))}
            </Box>
        )
    } else {
        body = (
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                {shownRows.map((r, i) => renderRow(r, sublineFlat(r), i < rows.length - 1 ? RULE : 'none'))}
            </Box>
        )
    }

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
                sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.primaryBrown }}>
                Expenses · {rows.length}
            </Typography>
            <ListControls search={search} onSearchChange={onSearchChange} sort={sort} onSortChange={onSortChange} />
            {/* 12px below the controls, like the page's toggle → chart gap */}
            <Box sx={{ marginTop: 0.5 }} onPointerDown={onPointerDown}>
                {body}
            </Box>
        </Box>
    )
})
