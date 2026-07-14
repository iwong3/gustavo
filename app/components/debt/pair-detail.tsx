'use client'

import { Box, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { cardSx, colors } from '@/lib/colors'
import { expenseDebtContribution, simplifyDebts } from '@/lib/debt'
import type { Expense, UserSummary } from '@/lib/types'
import { ListControls, type ListSort } from 'components/list-controls'
import { SlidingToggle } from 'components/sliding-toggle'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
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

/**
 * One expense in the pair drill-down. In the flat "all" view (`showDirection`)
 * the payer's avatar and a signed/coloured amount encode which way the debt
 * moves; in the grouped "by direction" view the group header already says so,
 * so the row drops both and just lists the expense.
 */
function DebtExpenseRow({
    row,
    showDirection,
    onTap,
}: {
    row: DebtRow
    showDirection: boolean
    onTap: () => void
}) {
    return (
        <Box
            onClick={onTap}
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'gap': 1.25,
                'paddingX': 1.25,
                'paddingY': 1,
                'cursor': 'pointer',
                'borderBottom': `1px solid ${colors.primaryBlack}20`,
                '&:last-of-type': { borderBottom: 'none' },
                '&:active': { backgroundColor: `${colors.primaryBlack}0a` },
                'transition': 'background-color 0.1s',
            }}>
            {showDirection && (
                <InitialsIcon
                    name={row.payer.firstName}
                    initials={row.payer.initials}
                    iconColor={row.payer.iconColor}
                    sx={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}
                />
            )}
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
                    {row.expense.categoryName ?? 'Other'}
                    {showDirection &&
                        ` · ${row.payer.firstName} covered ${row.beneficiary.firstName}`}
                </Typography>
            </Box>
            <Typography
                sx={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: showDirection
                        ? row.reduces
                            ? OWED_GREEN
                            : OWE_RED
                        : colors.primaryBlack,
                }}>
                {showDirection ? (row.reduces ? '−' : '+') : ''}
                {formatUsd(row.amount)}
            </Typography>
        </Box>
    )
}

/**
 * The debt drill-down between two people: every shared expense that moves the
 * debt between them, searchable and sortable, flat or grouped by direction.
 * The hero shows the direct pairwise net (what one owes the other), not a
 * group-simplified figure. Rendered by the /debts/[pair] page and the gallery.
 */
export function PairDetail({
    debtorId,
    creditorId,
}: {
    /** Compared as strings — user ids are BIGINTs (strings at runtime). */
    debtorId: number | string
    creditorId: number | string
}) {
    const { expenses, participants, getUsdValue, debtMap } = useSpendData()
    const { trip } = useTripData()
    const router = useRouter()

    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<ListSort>('date-asc')
    const [view, setView] = useState<'all' | 'direction'>('all')

    // Resolve to participant objects, then use THEIR ids everywhere below so
    // comparisons stay consistent with the runtime id type
    const debtor = participants.find((p) => String(p.id) === String(debtorId))
    const creditor = participants.find(
        (p) => String(p.id) === String(creditorId)
    )

    // Every expense where one of the pair covered part of the other's cost
    const allRows = useMemo((): DebtRow[] => {
        if (!debtor || !creditor) return []
        const rows: DebtRow[] = []
        for (const expense of expenses) {
            const usd = getUsdValue(expense)
            const creditorCovered = expenseDebtContribution(
                expense, creditor.id, debtor.id, usd, participants.length)
            if (creditorCovered > 0.005) {
                rows.push({
                    expense, payer: creditor, beneficiary: debtor,
                    reduces: false, amount: creditorCovered,
                })
            }
            const debtorCovered = expenseDebtContribution(
                expense, debtor.id, creditor.id, usd, participants.length)
            if (debtorCovered > 0.005) {
                rows.push({
                    expense, payer: debtor, beneficiary: creditor,
                    reduces: true, amount: debtorCovered,
                })
            }
        }
        return rows
    }, [expenses, debtor, creditor, getUsdValue, participants.length])

    const pairNet = useMemo(
        () =>
            allRows.reduce(
                (t, r) => t + (r.reduces ? -r.amount : r.amount),
                0
            ),
        [allRows]
    )

    // What the group-simplified plan asks THIS debtor to pay THIS creditor
    // (may be absent or a different amount, since the simplifier reroutes
    // debts through third parties to cut the number of payments).
    const simplifiedAmount = useMemo(() => {
        return (
            simplifyDebts(debtMap, participants).find(
                (s) =>
                    String(s.debtorId) === String(debtorId) &&
                    String(s.creditorId) === String(creditorId)
            )?.amount ?? null
        )
    }, [debtMap, participants, debtorId, creditorId])

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

    // Lead with the simplified settle-up amount (the headline the debts page
    // shows); the true pairwise net is a secondary FYI. Fall back to the
    // direct net only when this pair isn't in the simplified plan at all.
    const directAmount = Math.abs(pairNet)
    const heroAmount = simplifiedAmount ?? directAmount
    // Distinct expenses (one expense can contribute in both directions)
    const expenseCount = new Set(allRows.map((r) => r.expense.id)).size

    // Inline FYI beside the expense count: the true pairwise net, shown only
    // when it differs from the simplified headline (the simplifier rerouted
    // part of this debt through a third person).
    const showTrueNet =
        simplifiedAmount !== null &&
        directAmount > 0.005 &&
        Math.abs(simplifiedAmount - directAmount) > 0.5

    // Open an expense's detail; ?from=debts&pair sends the back button here
    const openExpense = (expense: Expense) => {
        router.push(
            `/gustavo/trips/${trip.slug}/expenses/${expense.id}` +
                `?from=debts&pair=${debtor.id}-${creditor.id}`
        )
    }

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

    const rowCard = (rows: DebtRow[], showDirection: boolean) =>
        rows.length ? (
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                {rows.map((r, i) => (
                    <DebtExpenseRow
                        key={`${r.expense.id}-${r.payer.id}-${i}`}
                        row={r}
                        showDirection={showDirection}
                        onTap={() => openExpense(r.expense)}
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
            {/* Pair hero — sleek stat: who pays whom + amount + count */}
            <Box
                sx={{
                    ...cardSx,
                    border: `1.5px solid ${colors.primaryBlack}`,
                    boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                    backgroundColor: colors.primaryWhite,
                    padding: 1.75,
                }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                    }}>
                    {/* Direction: debtor → creditor */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.75,
                            minWidth: 0,
                        }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                            }}>
                            <InitialsIcon
                                name={debtor.firstName}
                                initials={debtor.initials}
                                iconColor={debtor.iconColor}
                                sx={{ width: 32, height: 32, fontSize: 11 }}
                            />
                            <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
                                →
                            </Typography>
                            <InitialsIcon
                                name={creditor.firstName}
                                initials={creditor.initials}
                                iconColor={creditor.iconColor}
                                sx={{ width: 32, height: 32, fontSize: 11 }}
                            />
                        </Box>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: colors.primaryBrown,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                            {debtor.firstName} pays {creditor.firstName}
                        </Typography>
                    </Box>

                    {/* The number */}
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 30,
                                fontWeight: 800,
                                lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                            {formatUsd(heroAmount)}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: colors.primaryBrown,
                                marginTop: 0.25,
                            }}>
                            {expenseCount} expense
                            {expenseCount === 1 ? '' : 's'}
                            {showTrueNet &&
                                ` · direct debt ${formatUsd(directAmount)}`}
                        </Typography>
                    </Box>
                </Box>
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
