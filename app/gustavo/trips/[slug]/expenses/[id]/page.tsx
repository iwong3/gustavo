'use client'

import { Box } from '@mui/material'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useExitTo } from 'hooks/use-exit-to'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { Expense } from '@/lib/types'

import { colors } from '@/lib/colors'
import { useRefresh } from 'providers/refresh-provider'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import {
    canEditExpense as canEditExpenseFn,
    canDeleteExpense as canDeleteExpenseFn,
} from 'utils/permissions'
import { ConflictError, deleteExpense } from 'utils/api'
import { getBackHref } from 'utils/back-href'
import { deleteErrorMessage } from 'utils/delete-error'
import { removeCachedExpense } from 'utils/expense-cache'
import { useQueryClient } from '@tanstack/react-query'

import { DrawerHeader } from 'components/receipts/drawer/drawer-header'
import { DrawerReceipt } from 'components/receipts/drawer/drawer-receipt'
import { DrawerMapSection } from 'components/receipts/drawer/drawer-map-section'
import { DrawerStatTiles } from 'components/receipts/drawer/drawer-stat-tiles'
import { DrawerNotes } from 'components/receipts/drawer/drawer-notes'
import { DrawerMetadataFooter } from 'components/receipts/drawer/drawer-metadata-footer'

import DeleteExpenseDialog from 'components/delete-expense-dialog'
import { GoneState } from 'components/gone-state'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'

export default function ExpenseDetailPage() {
    const { id } = useParams<{ slug: string; id: string }>()
    const router = useRouter()
    const exitTo = useExitTo()
    const queryClient = useQueryClient()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const { trip } = useTripData()
    const {
        expenses: allTripExpenses,
        filteredExpenses,
        getUsdValue,
    } = useSpendData()
    const { onRefresh } = useRefresh()

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // Same place the header ← goes — honours ?from=graphs / ?from=debts
    const backHref =
        getBackHref(pathname, searchParams) ??
        `/gustavo/trips/${trip.slug}/expenses`

    // Compare as strings: expense ids are BIGINTs that the pg driver returns
    // as strings at runtime (lib/types.ts says number, but that's not what
    // JSON actually carries), so `e.id === Number(id)` never matches
    // Just deleted and on our way out: keep rendering the last copy so the
    // page doesn't flash "not here anymore" before the navigation lands
    const [leavingExpense, setLeavingExpense] = useState<Expense | null>(null)
    const expense =
        allTripExpenses.find((e) => String(e.id) === id) ?? leavingExpense

    // Warm the edit form so tapping Edit opens it instantly
    const expenseId = expense?.id
    useEffect(() => {
        if (expenseId != null) {
            router.prefetch(`/gustavo/trips/${trip.slug}/expenses/${expenseId}/edit`)
        }
    }, [router, trip.slug, expenseId])

    // Position within the current (filtered) list — the receipt's "EXP 17/32"
    // counts the list the user actually came from, not the whole trip
    const navList = useMemo(
        () =>
            expense && !filteredExpenses.some((e) => e.id === expense.id)
                ? [...filteredExpenses, expense]
                : filteredExpenses,
        [filteredExpenses, expense]
    )
    const currentIndex = expense
        ? navList.findIndex((e) => e.id === expense.id)
        : -1

    if (!expense) {
        return (
            <GoneState
                title="This expense isn't here anymore"
                detail="It may have been deleted."
                action={{
                    label: 'Back to expenses',
                    onClick: () => exitTo(backHref),
                }}
            />
        )
    }

    const costUsd = getUsdValue(expense)
    const isReporter = expense.reportedBy?.id === trip.currentUserId
    const canEdit = canEditExpenseFn(trip.userRole, trip.isAdmin, isReporter)
    const canDelete = canDeleteExpenseFn(trip.userRole, trip.isAdmin, isReporter)

    const goToEdit = () =>
        router.push(`/gustavo/trips/${trip.slug}/expenses/${expense.id}/edit`)

    // Day number calculation
    const tripStart = dayjs(trip.startDate + 'T00:00:00')
    const tripEnd = dayjs(trip.endDate + 'T00:00:00')
    const expenseDate = dayjs(expense.date + 'T00:00:00')
    const totalDays = tripEnd.diff(tripStart, 'day') + 1
    const dayNumber = expenseDate.diff(tripStart, 'day') + 1
    const isWithinTrip = dayNumber >= 1 && dayNumber <= totalDays

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                // Fill the scroll area so the metadata footer (marginTop:
                // auto) sits at the bottom even when content is short
                minHeight: '100%',
                paddingTop: 1.5,
                paddingBottom: 1,
            }}>
            {/* Header — name, weekday/day/area */}
            <DrawerHeader
                expense={expense}
                dayNumber={isWithinTrip ? dayNumber : null}
                totalDays={isWithinTrip ? totalDays : null}
            />

            {/* The money: cost, conversion, split, barcode. Ends without a
                settle CTA on purpose — debts are handled on the debts page,
                never per-expense. */}
            <DrawerReceipt
                expense={expense}
                costUsd={costUsd}
                currentUserId={trip.currentUserId}
                tripParticipantCount={trip.participants.length}
                expenseIndex={currentIndex}
                totalExpenses={navList.length}
                dayNumber={isWithinTrip ? dayNumber : null}
                totalDays={isWithinTrip ? totalDays : null}
            />

            {/* The place: map + Google chips + Maps/Site links */}
            {expense.place && <DrawerMapSection place={expense.place} />}

            {/* Trip context — computed from unfiltered trip expenses so the
                ranking is against the whole trip, not the current filter */}
            <DrawerStatTiles
                expense={expense}
                costUsd={costUsd}
                allExpenses={allTripExpenses}
                getUsdValue={getUsdValue}
            />

            {/* Notes */}
            <DrawerNotes
                notes={expense.notes}
                onEdit={canEdit ? goToEdit : undefined}
            />

            {/* Attribution — pushed to the bottom of the content area */}
            <Box sx={{ marginTop: 'auto' }}>
                <DrawerMetadataFooter expense={expense} />
            </Box>

            {/* Action bar — edit/delete, permission-gated */}
            {(canEdit || canDelete) && (
                <PageActionBar>
                    {canDelete && (
                        <PageActionButton
                            onClick={() => setDeleteDialogOpen(true)}
                            icon={<IconTrash size={22} />}
                            label="Delete"
                            color={colors.primaryRed}
                        />
                    )}
                    {canEdit && (
                        <PageActionButton
                            onClick={goToEdit}
                            icon={<IconEdit size={22} />}
                            label="Edit"
                        />
                    )}
                </PageActionBar>
            )}

            {/* Delete dialog */}
            <DeleteExpenseDialog
                open={deleteDialogOpen}
                expense={expense}
                busy={deleting}
                error={deleteError}
                onClose={() => {
                    setDeleteDialogOpen(false)
                    setDeleteError(null)
                }}
                onConfirm={async () => {
                    setDeleting(true)
                    setDeleteError(null)
                    try {
                        await deleteExpense(trip.id, expense.id, expense.updatedAt)
                    } catch (err) {
                        setDeleting(false)
                        setDeleteError(deleteErrorMessage(err, 'expense'))
                        // Stale copy — pull the latest so a retry has a fresh version
                        if (err instanceof ConflictError) onRefresh()
                        return
                    }
                    setDeleting(false)
                    setDeleteDialogOpen(false)
                    // Gone from the list before we land on it
                    setLeavingExpense(expense)
                    removeCachedExpense(queryClient, trip.id, expense.id)
                    exitTo(backHref)
                    onRefresh()
                }}
            />
        </Box>
    )
}
