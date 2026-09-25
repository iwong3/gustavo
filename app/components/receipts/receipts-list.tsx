'use client'

import { Box, Collapse, Typography } from '@mui/material'
import { memo, useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

import { cardSx, colors } from '@/lib/colors'
import { sortSpec, useSortStore } from 'components/menu/sort/sort-store'
import { ExpenseRow } from 'components/receipts/expense-row'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { showToast } from 'components/toast-store'
import { usePressPrefetch } from 'hooks/use-press-prefetch'
import { useProgressiveCount } from 'hooks/use-progressive-count'
import { useRefresh } from 'providers/refresh-provider'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canEditExpense, canDeleteExpense } from 'utils/permissions'
import { ConflictError, deleteExpense } from 'utils/api'
import { deleteErrorMessage } from 'utils/delete-error'
import { removeCachedExpense } from 'utils/expense-cache'
import { useQueryClient } from '@tanstack/react-query'

import type { Expense } from '@/lib/types'

interface ReceiptsListProps {
    expenses?: Expense[]
}

type DateGroup = {
    date: string
    expenses: Expense[]
    dayTotal: number
}

/**
 * One swipeable expense row. Memoized (the list passes stable callbacks) so
 * collapsing a day or a background refetch only re-renders rows that
 * changed. `data-href` feeds the list's press prefetch.
 */
const ListRow = memo(function ListRow({
    expense,
    href,
    canEdit,
    canDelete,
    showBottomBorder,
    hideDate,
    onTap,
    onEdit,
    onDelete,
}: {
    expense: Expense
    href: string
    canEdit: boolean
    canDelete: boolean
    showBottomBorder: boolean
    hideDate?: boolean
    onTap: (expense: Expense) => void
    onEdit: (expense: Expense) => void
    onDelete: (expense: Expense) => void
}) {
    return (
        <div data-href={href}>
            <SwipeableRow
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={() => onEdit(expense)}
                onDelete={() => onDelete(expense)}
                backgroundColor={expense.conversionError ? '#ffe8e5' : colors.primaryWhite}
                showBottomBorder={showBottomBorder}>
                <ExpenseRow expense={expense} onTap={onTap} hideDate={hideDate} />
            </SwipeableRow>
        </div>
    )
})

export const ReceiptsList = ({ expenses }: ReceiptsListProps) => {
    const { filteredExpenses, getUsdValue, isSearching } = useSpendData()
    const { trip } = useTripData()
    const { onRefresh } = useRefresh()
    const queryClient = useQueryClient()
    const router = useRouter()

    const sortField = useSortStore((s) => s.field)
    const spec = sortSpec(sortField)

    const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())

    // Swipe delete confirmation dialog
    // Swipe → tap Delete is the confirmation, so delete straight away
    // The row disappears immediately and comes back if the delete fails.
    const handleSwipeDelete = useCallback(
        async (expense: Expense) => {
            const restore = removeCachedExpense(queryClient, trip.id, expense.id)
            try {
                await deleteExpense(trip.id, expense.id, expense.updatedAt)
                onRefresh()
            } catch (err) {
                restore()
                showToast(deleteErrorMessage(err, 'expense'))
                // Stale copy — pull the latest so a retry has a fresh version
                if (err instanceof ConflictError) onRefresh()
            }
        },
        [queryClient, trip.id, onRefresh]
    )

    const displayData = expenses || filteredExpenses
    // Two ways the date grouping steps aside, and they look different:
    //
    // - Sorted by anything but date: re-grouping would discard the order the
    //   user asked for (which is exactly why sorting by cost used to do nothing
    //   visible here). Renders as the grouped card minus the header.
    // - Searching: Fuse orders by relevance, and each hit gets its own dated
    //   card — the established search look, left alone.
    //
    // Search wins when both are active, because relevance overrides the sort.
    const showSearchView = isSearching && !expenses
    const showSortedView = !isSearching && !spec.groupsByDate && !expenses

    // Group expenses by date, most recent date first
    const dateGroups = useMemo<DateGroup[]>(() => {
        const groupMap = new Map<string, Expense[]>()

        for (const exp of displayData) {
            const existing = groupMap.get(exp.date) ?? []
            existing.push(exp)
            groupMap.set(exp.date, existing)
        }

        // Sort groups by date descending
        const groups: DateGroup[] = []
        groupMap.forEach((exps, date) => {
            // Within a group, order by id DESC (most recently entered first)
            exps.sort((a, b) => b.id - a.id)
            const dayTotal = exps.reduce((sum, e) => sum + getUsdValue(e), 0)
            groups.push({ date, expenses: exps, dayTotal })
        })
        groups.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))

        return groups
    }, [displayData, getUsdValue])

    // Trip day calculation
    // Append T00:00:00 to parse as local time (bare YYYY-MM-DD is parsed as UTC)
    const tripStart = dayjs(trip.startDate + 'T00:00:00')
    const tripEnd = dayjs(trip.endDate + 'T00:00:00')
    const totalDays = tripEnd.diff(tripStart, 'day') + 1

    const detailHref = useCallback(
        (expense: Expense) => `/gustavo/trips/${trip.slug}/expenses/${expense.id}`,
        [trip.slug]
    )

    const handleTap = useCallback(
        (expense: Expense) => router.push(detailHref(expense)),
        [router, detailHref]
    )

    const handleEdit = useCallback(
        (expense: Expense) => {
            router.push(
                `/gustavo/trips/${trip.slug}/expenses/${expense.id}/edit`
            )
        },
        [router, trip.slug]
    )

    const toggleDateCollapse = useCallback((date: string) => {
        setCollapsedDates((prev) => {
            const next = new Set(prev)
            if (next.has(date)) {
                next.delete(date)
            } else {
                next.add(date)
            }
            return next
        })
    }, [])

    const renderRow = (row: Expense, showBottomBorder: boolean, hideDate?: boolean) => {
        const isReporter = row.reportedBy?.id === trip.currentUserId
        return (
            <ListRow
                key={row.id}
                expense={row}
                href={detailHref(row)}
                canEdit={canEditExpense(trip.userRole, trip.isAdmin, isReporter)}
                canDelete={canDeleteExpense(trip.userRole, trip.isAdmin, isReporter)}
                showBottomBorder={showBottomBorder}
                hideDate={hideDate}
                onTap={handleTap}
                onEdit={handleEdit}
                onDelete={handleSwipeDelete}
            />
        )
    }

    // Mount the first screenful now and the rest just after first paint (a
    // back navigation gets enough rows to reach its restored scroll spot)
    const limit = useProgressiveCount(displayData.length)
    const shownData = displayData.length > limit ? displayData.slice(0, limit) : displayData
    let budget = limit
    const shownGroups: (DateGroup & { count: number })[] = []
    for (const g of dateGroups) {
        if (budget <= 0) break
        shownGroups.push({ ...g, count: g.expenses.length, expenses: g.expenses.slice(0, budget) })
        budget -= g.expenses.length
    }

    const onPointerDown = usePressPrefetch(displayData[0] && detailHref(displayData[0]))

    return (
        <>
            <Box id="receipts-list" sx={{ scrollMarginTop: '54px', pb: 2 }} onPointerDown={onPointerDown}>
                {showSortedView ? (
                    /* Sorted, not grouped — but otherwise the date-grouped card,
                       unchanged: one card, rows touching, each row carrying its
                       own date. Only the DateGroupHeader is missing, because
                       there's no date to head. */
                    <Box sx={{ mx: 2 }}>
                        {/* No caption naming the order: a non-date sort is always
                            an active refinement, so ActiveFilterLine is showing
                            it in the sticky toolbar right above — and unlike a
                            caption here, that survives scrolling. */}
                        <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                            {/* Date stays in each row: it's the only thing
                                saying when now that the group header is gone. */}
                            {shownData.map((row, i) => renderRow(row, i < displayData.length - 1))}
                        </Box>
                    </Box>
                ) : showSearchView ? (
                    <Box sx={{ mx: 2 }}>
                        {shownData.map((row) => {
                            const rowDate = dayjs(row.date + 'T00:00:00')

                            return (
                                <Box key={row.id} sx={{ mb: 1.25 }}>
                                    {/* Date label above the card — matches health page pattern */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                        <Box
                                            sx={{
                                                px: 0.75,
                                                py: 0.25,
                                                backgroundColor: colors.primaryYellow,
                                                border: `1px solid ${colors.primaryBlack}`,
                                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                                borderRadius: '3px',
                                            }}>
                                            <Typography
                                                sx={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.3px',
                                                    lineHeight: 1.2,
                                                }}>
                                                {rowDate.format('ddd')}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: colors.primaryBrown,
                                            }}>
                                            {rowDate.format('MMM D')}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                        {renderRow(row, false, true)}
                                    </Box>
                                </Box>
                            )
                        })}
                    </Box>
                ) : shownGroups.map((group) => {
                    const expenseDate = dayjs(group.date + 'T00:00:00')
                    const dayNumber = expenseDate.diff(tripStart, 'day') + 1
                    const isWithinTrip = dayNumber >= 1 && dayNumber <= totalDays
                    const isCollapsed = collapsedDates.has(group.date)

                    return (
                        <Box key={group.date} sx={{ mb: 1.5 }}>
                            <Box sx={{ mx: 2 }}>
                                <Box
                                    sx={{
                                        ...cardSx,
                                        overflow: 'hidden',
                                    }}>
                                    {/* Date group header */}
                                    <DateGroupHeader
                                        date={group.date}
                                        dayTotal={group.dayTotal}
                                        dayNumber={isWithinTrip ? dayNumber : null}
                                        totalDays={isWithinTrip ? totalDays : null}
                                        expenseCount={group.count}
                                        collapsed={isCollapsed}
                                        onToggle={() => toggleDateCollapse(group.date)}
                                    />

                                    {/* Expense rows */}
                                    <Collapse in={!isCollapsed} timeout={150}>
                                        {group.expenses.map((row, i) =>
                                            renderRow(row, i < group.expenses.length - 1)
                                        )}
                                    </Collapse>
                                </Box>
                            </Box>
                        </Box>
                    )
                })}
            </Box>
        </>
    )
}
