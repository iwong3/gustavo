'use client'

import { Box, Typography } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { cardSx, colors } from '@/lib/colors'
import { useRefresh } from 'providers/refresh-provider'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import {
    canEditExpense as canEditExpenseFn,
    canDeleteExpense as canDeleteExpenseFn,
} from 'utils/permissions'
import { deleteExpense } from 'utils/api'

import { DrawerHeader } from 'components/receipts/drawer/drawer-header'
import { DrawerCostSection } from 'components/receipts/drawer/drawer-cost-section'
import { DrawerPayerProfile } from 'components/receipts/drawer/drawer-payer-profile'
import { DrawerSplitSection } from 'components/receipts/drawer/drawer-split-section'
import { DrawerMapSection } from 'components/receipts/drawer/drawer-map-section'
import { DrawerPlaceMetadata } from 'components/receipts/drawer/drawer-place-metadata'
import { DrawerNotes } from 'components/receipts/drawer/drawer-notes'
import { DrawerMetadataFooter } from 'components/receipts/drawer/drawer-metadata-footer'

import ExpenseFormDialog from 'components/expense-form-dialog'
import DeleteExpenseDialog from 'components/delete-expense-dialog'

import type { Expense } from '@/lib/types'

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

    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const expenseId = Number(id)
    const expense = allTripExpenses.find((e) => e.id === expenseId) ?? null

    // Position within the current (filtered) list — used by the metadata
    // footer and place-metadata jump links, matching the list the user came from
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

    const goToExpense = (e: Expense) => {
        router.push(`/gustavo/trips/${trip.slug}/expenses/${e.id}`)
    }

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
                paddingX: 2,
                paddingY: 2,
            }}>
            {/* Detail card */}
            <Box
                sx={{
                    ...cardSx,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: colors.primaryWhite,
                    paddingTop: 1.5,
                    paddingBottom: 2,
                }}>
                {/* Header — name, date/location, edit/delete actions */}
                <DrawerHeader
                    expense={expense}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={() => setEditDialogOpen(true)}
                    onDelete={() => setDeleteDialogOpen(true)}
                />

                {/* Cost */}
                <DrawerCostSection expense={expense} costUsd={costUsd} />

                {/* Payer profile — uses unfiltered trip expenses for stats */}
                <DrawerPayerProfile
                    payer={expense.paidBy}
                    allExpenses={allTripExpenses}
                    getUsdValue={getUsdValue}
                    currentUserId={trip.currentUserId}
                />

                {/* Split */}
                <DrawerSplitSection
                    expense={expense}
                    costUsd={costUsd}
                    currentUserId={trip.currentUserId}
                    tripParticipantCount={trip.participants.length}
                />

                {/* --- Section divider (only if map follows) --- */}
                {expense.place && (
                    <Box
                        sx={{
                            mx: 2.5,
                            mb: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    />
                )}

                {/* Map + place metadata */}
                {expense.place && (
                    <DrawerMapSection place={expense.place}>
                        <DrawerPlaceMetadata
                            place={expense.place}
                            allExpenses={navList}
                            currentExpenseId={expense.id}
                            onJumpToExpense={goToExpense}
                        />
                    </DrawerMapSection>
                )}

                {/* --- Section divider (only if notes follow) --- */}
                {expense.notes?.trim() && (
                    <Box
                        sx={{
                            mx: 2.5,
                            mb: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    />
                )}

                {/* Notes */}
                <DrawerNotes
                    notes={expense.notes}
                    onEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
                />

                {/* Metadata footer */}
                <DrawerMetadataFooter
                    expense={expense}
                    expenseIndex={currentIndex}
                    totalExpenses={navList.length}
                    dayNumber={isWithinTrip ? dayNumber : null}
                    totalDays={isWithinTrip ? totalDays : null}
                />
            </Box>

            {/* Edit dialog */}
            <ExpenseFormDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSuccess={() => {
                    setEditDialogOpen(false)
                    onRefresh()
                }}
                mode="edit"
                expense={expense}
            />

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
