'use client'

import { Box, Typography } from '@mui/material'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import { useRefresh } from 'providers/refresh-provider'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import {
    canEditExpense as canEditExpenseFn,
    canDeleteExpense as canDeleteExpenseFn,
} from 'utils/permissions'
import { deleteExpense } from 'utils/api'

import { DrawerHeader } from 'components/receipts/drawer/drawer-header'
import { DrawerReceipt } from 'components/receipts/drawer/drawer-receipt'
import { DrawerMapSection } from 'components/receipts/drawer/drawer-map-section'
import { DrawerStatTiles } from 'components/receipts/drawer/drawer-stat-tiles'
import { DrawerNotes } from 'components/receipts/drawer/drawer-notes'
import { DrawerMetadataFooter } from 'components/receipts/drawer/drawer-metadata-footer'

import DeleteExpenseDialog from 'components/delete-expense-dialog'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'

export default function ExpenseDetailPage() {
    const { id } = useParams<{ slug: string; id: string }>()
    const router = useRouter()

    const { trip } = useTripData()
    const {
        expenses: allTripExpenses,
        filteredExpenses,
        getUsdValue,
    } = useSpendData()
    const { onRefresh } = useRefresh()

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Compare as strings: expense ids are BIGINTs that the pg driver returns
    // as strings at runtime (lib/types.ts says number, but that's not what
    // JSON actually carries), so `e.id === Number(id)` never matches
    const expense = allTripExpenses.find((e) => String(e.id) === id) ?? null

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
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: 450,
                    padding: 4,
                }}>
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    This expense no longer exists.
                </Typography>
            </Box>
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
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={async () => {
                    await deleteExpense(trip.id, expense.id, expense.updatedAt)
                    setDeleteDialogOpen(false)
                    router.replace(`/gustavo/trips/${trip.slug}/expenses`)
                    onRefresh()
                }}
            />
        </Box>
    )
}
