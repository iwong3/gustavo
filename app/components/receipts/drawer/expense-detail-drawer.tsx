'use client'

import { Box, Drawer } from '@mui/material'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'

import { colors } from '@/lib/colors'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canEditExpense as canEditExpenseFn, canDeleteExpense as canDeleteExpenseFn } from 'utils/permissions'
import { deleteExpense } from 'utils/api'

import { DrawerHeader } from './drawer-header'
import { DrawerCostSection } from './drawer-cost-section'
import { DrawerPayerProfile } from './drawer-payer-profile'
import { DrawerSplitSection } from './drawer-split-section'
import { DrawerMapSection } from './drawer-map-section'
import { DrawerPlaceMetadata } from './drawer-place-metadata'
import { DrawerNotes } from './drawer-notes'
import { DrawerMetadataFooter } from './drawer-metadata-footer'

import ExpenseFormDialog from 'components/expense-form-dialog'
import DeleteExpenseDialog from 'components/delete-expense-dialog'

import type { Expense } from '@/lib/types'

interface ExpenseDetailDrawerProps {
    expense: Expense | null
    open: boolean
    onClose: () => void
    allExpenses: Expense[] // full (filtered) list for navigation
    onRefresh: () => void
    onSelectExpense: (expense: Expense) => void
}

export const ExpenseDetailDrawer = ({
    expense,
    open,
    onClose,
    allExpenses,
    onRefresh,
    onSelectExpense,
}: ExpenseDetailDrawerProps) => {
    const { trip } = useTripData()
    const { expenses: allTripExpenses, getUsdValue } = useSpendData()

    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Darken the phone status bar when drawer is open
    useEffect(() => {
        const meta = document.querySelector('meta[name="theme-color"]')
        if (!meta) return
        const original = meta.getAttribute('content') || '#fefae0'
        if (open) {
            meta.setAttribute('content', '#c8c5b3') // dimmed version of secondaryYellow
        }
        return () => {
            meta.setAttribute('content', original)
        }
    }, [open])

    // Navigation
    const currentIndex = useMemo(
        () => (expense ? allExpenses.findIndex((e) => e.id === expense.id) : -1),
        [expense, allExpenses]
    )

    // Swipe-to-close on drag handle only
    const touchStartY = useRef(0)
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
    }, [])
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const deltaY = e.changedTouches[0].clientY - touchStartY.current
        if (deltaY > 50) onClose()
    }, [onClose])

    if (!expense) return null

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
        <>
            <Drawer
                anchor="bottom"
                open={open}
                onClose={onClose}
                ModalProps={{
                    keepMounted: false,
                    disableEnforceFocus: editDialogOpen || deleteDialogOpen,
                    slotProps: {
                        backdrop: {
                            sx: {
                                backgroundColor: 'rgba(0,0,0,0.25)',
                            },
                        },
                    },
                }}
                PaperProps={{
                    sx: {
                        maxHeight: '92vh',
                        borderTopLeftRadius: '12px',
                        borderTopRightRadius: '12px',
                        backgroundColor: colors.primaryWhite,
                        overflow: 'hidden',
                        borderTop: `2px solid ${colors.primaryBlack}`,
                        boxShadow: `0px -3px 0px ${colors.primaryBlack}`,
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}>
                {/* Drag handle — swipe down here to close */}
                <Box
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        pt: 1.5,
                        pb: 0.5,
                        flexShrink: 0,
                        cursor: 'grab',
                    }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: colors.primaryBlack,
                            opacity: 0.3,
                        }}
                    />
                </Box>

                {/* Scrollable content */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        pb: 'calc(24px + env(safe-area-inset-bottom, 0px))',
                    }}>
                    {/* Header */}
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
                        <Box sx={{ mx: 2.5, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }} />
                    )}

                    {/* Map + place metadata */}
                    {expense.place && (
                        <DrawerMapSection place={expense.place}>
                            <DrawerPlaceMetadata
                                place={expense.place}
                                allExpenses={allExpenses}
                                currentExpenseId={expense.id}
                                onJumpToExpense={onSelectExpense}
                            />
                        </DrawerMapSection>
                    )}

                    {/* --- Section divider (only if notes follow) --- */}
                    {expense.notes?.trim() && (
                        <Box sx={{ mx: 2.5, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }} />
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
                        totalExpenses={allExpenses.length}
                        dayNumber={isWithinTrip ? dayNumber : null}
                        totalDays={isWithinTrip ? totalDays : null}
                    />
                </Box>
            </Drawer>

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
                    await deleteExpense(trip.id, expense.id)
                    setDeleteDialogOpen(false)
                    onClose()
                    onRefresh()
                }}
            />
        </>
    )
}
