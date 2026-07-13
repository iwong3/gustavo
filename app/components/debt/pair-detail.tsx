'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'

import { cardSx, colors } from '@/lib/colors'
import { expenseDebtContribution, simplifyDebts } from '@/lib/debt'
import type { Expense, UserSummary } from '@/lib/types'
import { ListControls, type ListSort } from 'components/list-controls'
import { SlidingToggle } from 'components/sliding-toggle'
import { useSpendData } from 'providers/spend-data-provider'
import { InitialsIcon } from 'utils/icons'

const OWE_RED = '#c0392b'
const OWED_GREEN = '#2e7d32'

const formatUsd = (n: number | null | undefined) =>
    Number.isFinite(n)
        ? n!.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
          })
        : '—'

type DebtRow = {
    expense: Expense
    /** Who paid this one (and thereby covered part of the other's cost). */
    payer: UserSummary
    beneficiary: UserSummary
    /** True when the debtor paid — this row reduces what they owe. */
    reduces: boolean
    amount: number
}

const viewOptions = [
    { value: 'all', label: 'All' },
    { value: 'direction', label: 'By direction' },
]

function miniAvatar(p: UserSummary) {
    return (
        <InitialsIcon
            name={p.firstName}
            initials={p.initials}
            iconColor={p.iconColor}
            sx={{ width: 16, height: 16, fontSize: 7, boxShadow: 'none' }}
        />
    )
}

function DebtExpenseRow({ row, signed }: { row: DebtRow; signed: boolean }) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                paddingX: 1.25,
                paddingY: 1,
                borderBottom: `1px solid ${colors.primaryBlack}20`,
                '&:last-of-type': { borderBottom: 'none' },
            }}>
            {/* Direction pill: payer → beneficiary */}
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                    flexShrink: 0,
                    border: `1px solid ${colors.primaryBlack}`,
                    borderRadius: '12px',
                    padding: '2px 6px 2px 3px',
                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                    fontSize: 9,
                    fontWeight: 800,
                }}>
                {miniAvatar(row.payer)}→{miniAvatar(row.beneficiary)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                    {row.expense.name}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 11,
                        color: 'text.secondary',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                    {dayjs(row.expense.date + 'T00:00:00').format('M/D')} ·{' '}
                    {row.expense.categoryName ?? 'Other'} ·{' '}
                    {row.payer.firstName} covered {row.beneficiary.firstName}
                </Typography>
            </Box>
            <Typography
                sx={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: signed && row.reduces ? OWED_GREEN : colors.primaryBlack,
                }}>
                {signed && row.reduces ? '−' : ''}
                {formatUsd(row.amount)}
            </Typography>
        </Box>
    )
}

/**
 * The debt drill-down between two people: every shared expense with a
 * direction pill, searchable and sortable, flat or grouped by direction.
 * Rendered by the /debts/[pair] page and the dev gallery.
 */
export function PairDetail({
    debtorId,
    creditorId,
}: {
    debtorId: number
    creditorId: number
}) {
    const { expenses, participants, getUsdValue, debtMap } = useSpendData()

    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<ListSort>('date-asc')
    const [view, setView] = useState<'all' | 'direction'>('all')

    const debtor = participants.find((p) => p.id === debtorId)
    const creditor = participants.find((p) => p.id === creditorId)

    // Every expense where one of the pair covered part of the other's cost
    const allRows = useMemo((): DebtRow[] => {
        if (!debtor || !creditor) return []
        const rows: DebtRow[] = []
        for (const expense of expenses) {
            const usd = getUsdValue(expense)
            const creditorCovered = expenseDebtContribution(
                expense, creditorId, debtorId, usd, participants.length)
            if (creditorCovered > 0.005) {
                rows.push({
                    expense, payer: creditor, beneficiary: debtor,
                    reduces: false, amount: creditorCovered,
                })
            }
            const debtorCovered = expenseDebtContribution(
                expense, debtorId, creditorId, usd, participants.length)
            if (debtorCovered > 0.005) {
                rows.push({
                    expense, payer: debtor, beneficiary: creditor,
                    reduces: true, amount: debtorCovered,
                })
            }
        }
        return rows
    }, [expenses, debtor, creditor, debtorId, creditorId, getUsdValue, participants.length])

    // The group-optimal payment for this pair (may differ from the direct
    // pairwise net when the simplifier chains debts through a third person)
    const settlementAmount = useMemo(() => {
        const settlements = simplifyDebts(debtMap, participants)
        return settlements.find(
            (s) => s.debtorId === debtorId && s.creditorId === creditorId
        )?.amount ?? null
    }, [debtMap, participants, debtorId, creditorId])

    const pairNet = useMemo(
        () =>
            allRows.reduce(
                (t, r) => t + (r.reduces ? -r.amount : r.amount),
                0
            ),
        [allRows]
    )

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        const matches = q
            ? allRows.filter((r) =>
                  (
                      r.expense.name +
                      ' ' +
                      (r.expense.categoryName ?? 'Other') +
                      ' ' +
                      (r.expense.locationName ?? '')
                  )
                      .toLowerCase()
                      .includes(q)
              )
            : allRows
        return [...matches].sort((a, b) => {
            switch (sort) {
                case 'amount-desc': return b.amount - a.amount
                case 'amount-asc': return a.amount - b.amount
                case 'date-desc': return a.expense.date > b.expense.date ? -1 : 1
                case 'date-asc':
                default: return a.expense.date < b.expense.date ? -1 : 1
            }
        })
    }, [allRows, search, sort])

    if (!debtor || !creditor) {
        return (
            <Typography sx={{ fontSize: 14, color: 'text.secondary', padding: 4, textAlign: 'center' }}>
                This debt no longer exists.
            </Typography>
        )
    }

    const heroAmount = settlementAmount ?? Math.abs(pairNet)
    const showMismatch =
        settlementAmount !== null &&
        Math.abs(settlementAmount - pairNet) > 0.5

    const creditorRows = filtered.filter((r) => !r.reduces)
    const debtorRows = filtered.filter((r) => r.reduces)
    const sum = (rows: DebtRow[]) => rows.reduce((t, r) => t + r.amount, 0)

    const netLine = (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderTop: `1.5px dashed ${colors.primaryBlack}`,
                marginTop: 1.25,
                paddingTop: 1,
                fontSize: 13.5,
                fontWeight: 800,
            }}>
            <span>
                Net: {debtor.firstName} pays {creditor.firstName}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatUsd(Math.abs(pairNet))}
            </span>
        </Box>
    )

    const groupHead = (label: string, amount: string) => (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: colors.primaryBrown,
                margin: '12px 2px 7px',
            }}>
            <span>{label}</span>
            <span>{amount}</span>
        </Box>
    )

    const rowCard = (rows: DebtRow[], signed: boolean) =>
        rows.length ? (
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                {rows.map((r, i) => (
                    <DebtExpenseRow
                        key={`${r.expense.id}-${r.payer.id}-${i}`}
                        row={r}
                        signed={signed}
                    />
                ))}
            </Box>
        ) : (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', paddingY: 1, textAlign: 'center' }}>
                Nothing matches.
            </Typography>
        )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Pair hero */}
            <Box
                sx={{
                    ...cardSx,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                    backgroundColor: colors.secondaryYellow,
                    padding: 1.75,
                    textAlign: 'center',
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.25,
                        marginBottom: 0.75,
                    }}>
                    <InitialsIcon
                        name={debtor.firstName}
                        initials={debtor.initials}
                        iconColor={debtor.iconColor}
                        sx={{ width: 34, height: 34, fontSize: 12 }}
                    />
                    <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
                        {debtor.firstName}
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 800 }}>
                        →
                    </Typography>
                    <InitialsIcon
                        name={creditor.firstName}
                        initials={creditor.initials}
                        iconColor={creditor.iconColor}
                        sx={{ width: 34, height: 34, fontSize: 12 }}
                    />
                    <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
                        {creditor.firstName}
                    </Typography>
                </Box>
                <Typography
                    sx={{
                        fontSize: 30,
                        fontWeight: 800,
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                    {formatUsd(heroAmount)}
                </Typography>
                <Typography
                    sx={{ fontSize: 11.5, color: colors.primaryBrown, marginTop: 0.5 }}>
                    net of {allRows.length} shared expense
                    {allRows.length === 1 ? '' : 's'}
                    {showMismatch &&
                        ` — group-optimal payment; their direct expenses net to ${formatUsd(Math.abs(pairNet))}`}
                </Typography>
            </Box>

            <ListControls
                search={search}
                onSearchChange={setSearch}
                sort={sort}
                onSortChange={setSort}
                placeholder="Search these expenses…"
            />

            <SlidingToggle
                value={view}
                options={viewOptions}
                onChange={(val) => setView(val as 'all' | 'direction')}
                fontSize={13}
                borderWidth={1}
            />

            {view === 'all' ? (
                <Box>
                    {rowCard(filtered, true)}
                    {netLine}
                </Box>
            ) : (
                <Box>
                    {groupHead(
                        `${creditor.firstName} covered ${debtor.firstName}`,
                        formatUsd(sum(creditorRows))
                    )}
                    {rowCard(creditorRows, false)}
                    {groupHead(
                        `${debtor.firstName} covered ${creditor.firstName}`,
                        `−${formatUsd(sum(debtorRows))}`
                    )}
                    {rowCard(debtorRows, false)}
                    {netLine}
                </Box>
            )}
        </Box>
    )
}
