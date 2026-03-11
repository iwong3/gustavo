'use client'

import { Box, Collapse } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { cardSx, colors } from '@/lib/colors'
import { ExpenseRow } from 'components/receipts/expense-row'
import { DateGroupHeader } from 'components/receipts/date-group-header'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { ExpenseDetailDrawer } from 'components/receipts/drawer/expense-detail-drawer'
import ExpenseFormDialog from 'components/expense-form-dialog'
import DeleteExpenseDialog from 'components/delete-expense-dialog'
import { useRefresh } from 'providers/refresh-provider'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canEditExpense, canDeleteExpense } from 'utils/permissions'
import { deleteExpense } from 'utils/api'

import type { Expense } from '@/lib/types'

interface ReceiptsListProps {
    expenses?: Expense[]
}

type DateGroup = {
    date: string
    expenses: Expense[]
    dayTotal: number
}

export const ReceiptsList = ({ expenses }: ReceiptsListProps) => {
    const { filteredExpenses, getUsdValue } = useSpendData()
    const { trip } = useTripData()
    const { onRefresh } = useRefresh()

    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set())

    // Swipe action dialogs (separate from drawer's dialogs)
    const [swipeEditExpense, setSwipeEditExpense] = useState<Expense | null>(null)
    const [swipeDeleteExpense, setSwipeDeleteExpense] = useState<Expense | null>(null)

    const displayData = expenses || filteredExpenses

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

    const handleTap = useCallback((expense: Expense) => {
        setSelectedExpense(expense)
        setDrawerOpen(true)
    }, [])

    const handleCloseDrawer = useCallback(() => {
        setDrawerOpen(false)
    }, [])

    const handleSelectExpense = useCallback((expense: Expense) => {
        setSelectedExpense(expense)
    }, [])

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

    return (
        <>
            <Box id="receipts-list" sx={{ paddingTop: 1, scrollMarginTop: '54px', pb: 2 }}>
                {dateGroups.map((group) => {
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
                                        expenseCount={group.expenses.length}
                                        collapsed={isCollapsed}
                                        onToggle={() => toggleDateCollapse(group.date)}
                                    />

                                    {/* Expense rows */}
                                    <Collapse in={!isCollapsed} timeout={200}>
                                        {group.expenses.map((row, i) => {
                                            const isReporter = row.reportedBy?.id === trip.currentUserId
                                            const rowCanEdit = canEditExpense(trip.userRole, trip.isAdmin, isReporter)
                                            const rowCanDelete = canDeleteExpense(trip.userRole, trip.isAdmin, isReporter)

                                            return (
                                                <SwipeableRow
                                                    key={row.id}
                                                    canEdit={rowCanEdit}
                                                    canDelete={rowCanDelete}
                                                    onEdit={() => setSwipeEditExpense(row)}
                                                    onDelete={() => setSwipeDeleteExpense(row)}
                                                    backgroundColor={row.conversionError ? '#ffe8e5' : colors.primaryWhite}
                                                    showBottomBorder={i < group.expenses.length - 1}
                                                >
                                                    <ExpenseRow
                                                        expense={row}
                                                        onTap={handleTap}
                                                    />
                                                </SwipeableRow>
                                            )
                                        })}
                                    </Collapse>
                                </Box>
                            </Box>
                        </Box>
                    )
                })}
            </Box>

            {/* Detail drawer */}
            <ExpenseDetailDrawer
                expense={selectedExpense}
                open={drawerOpen}
                onClose={handleCloseDrawer}
                allExpenses={displayData}
                onRefresh={onRefresh}
                onSelectExpense={handleSelectExpense}
            />

            {/* Swipe edit dialog */}
            <ExpenseFormDialog
                open={swipeEditExpense !== null}
                onClose={() => setSwipeEditExpense(null)}
                onSuccess={() => {
                    setSwipeEditExpense(null)
                    onRefresh()
                }}
                mode="edit"
                expense={swipeEditExpense ?? undefined}
            />

            {/* Swipe delete dialog */}
            <DeleteExpenseDialog
                open={swipeDeleteExpense !== null}
                expense={swipeDeleteExpense}
                onClose={() => setSwipeDeleteExpense(null)}
                onConfirm={async () => {
                    if (swipeDeleteExpense) {
                        await deleteExpense(trip.id, swipeDeleteExpense.id)
                    }
                    setSwipeDeleteExpense(null)
                    onRefresh()
                }}
            />
        </>
    )
}
