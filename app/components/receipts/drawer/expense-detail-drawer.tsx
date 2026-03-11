'use client'

import { Box, IconButton, SwipeableDrawer } from '@mui/material'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { useCallback, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { colors, hardShadow } from '@/lib/colors'
import { useSpendData } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canEditExpense as canEditExpenseFn, canDeleteExpense as canDeleteExpenseFn } from 'utils/permissions'
import { deleteExpense } from 'utils/api'

import { DrawerHeader } from './drawer-header'
import { DrawerCostSection } from './drawer-cost-section'
import { DrawerSplitSection } from './drawer-split-section'
import { DrawerMapSection } from './drawer-map-section'
import { DrawerPlaceMetadata } from './drawer-place-metadata'
import { DrawerNotes } from './drawer-notes'
import { DrawerPayerProfile } from './drawer-payer-profile'
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
    const { getUsdValue } = useSpendData()

    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Navigation
    const currentIndex = useMemo(
        () => (expense ? allExpenses.findIndex((e) => e.id === expense.id) : -1),
        [expense, allExpenses]
    )

    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < allExpenses.length - 1

    const goToPrev = useCallback(() => {
        if (hasPrev) onSelectExpense(allExpenses[currentIndex - 1])
    }, [hasPrev, currentIndex, allExpenses, onSelectExpense])

    const goToNext = useCallback(() => {
        if (hasNext) onSelectExpense(allExpenses[currentIndex + 1])
    }, [hasNext, currentIndex, allExpenses, onSelectExpense])

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
            <SwipeableDrawer
                anchor="bottom"
                open={open}
                onClose={onClose}
                onOpen={() => {}}
                disableSwipeToOpen
                swipeAreaWidth={0}
                ModalProps={{
                    keepMounted: false,
                    slotProps: {
                        backdrop: {
                            sx: {
                                backgroundColor: 'transparent',
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
                {/* Drag handle */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        pt: 1.5,
                        pb: 0.5,
                        flexShrink: 0,
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
                        pb: 3,
                    }}>
                    {/* Header */}
                    <DrawerHeader
                        expense={expense}
                        expenseIndex={currentIndex}
                        totalExpenses={allExpenses.length}
                        dayNumber={isWithinTrip ? dayNumber : null}
                        totalDays={isWithinTrip ? totalDays : null}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => setEditDialogOpen(true)}
                        onDelete={() => setDeleteDialogOpen(true)}
                    />

                    {/* Cost */}
                    <DrawerCostSection expense={expense} costUsd={costUsd} />

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

                    {/* --- Section divider (only if notes or payer follow) --- */}
                    {(expense.notes?.trim() || expense.paidBy) && (
                        <Box sx={{ mx: 2.5, mb: 2, borderBottom: '1px solid', borderColor: 'divider' }} />
                    )}

                    {/* Notes */}
                    <DrawerNotes notes={expense.notes} />

                    {/* Payer profile */}
                    <DrawerPayerProfile
                        payer={expense.paidBy}
                        allExpenses={allExpenses}
                        currentUserId={trip.currentUserId}
                    />

                    {/* Metadata footer */}
                    <DrawerMetadataFooter expense={expense} />
                </Box>

                {/* Bottom navigation bar — neo-brutalist */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 2,
                        py: 1,
                        flexShrink: 0,
                        borderTop: `2px solid ${colors.primaryBlack}`,
                        backgroundColor: colors.primaryYellow,
                    }}>
                    <IconButton
                        onClick={goToPrev}
                        disabled={!hasPrev}
                        size="small"
                        sx={{
                            ...hardShadow,
                            borderRadius: '4px',
                            opacity: hasPrev ? 1 : 0.3,
                            backgroundColor: colors.primaryWhite,
                            '&:hover': { backgroundColor: colors.secondaryYellow },
                        }}>
                        <IconChevronLeft size={20} />
                    </IconButton>

                    <Box
                        onClick={onClose}
                        sx={{
                            ...hardShadow,
                            fontSize: 13,
                            fontWeight: 700,
                            color: colors.primaryBlack,
                            cursor: 'pointer',
                            px: 2.5,
                            py: 0.5,
                            borderRadius: '4px',
                            backgroundColor: colors.primaryWhite,
                            '&:hover': { backgroundColor: colors.secondaryYellow },
                            '&:active': { backgroundColor: colors.primaryYellow },
                            transition: 'background-color 150ms ease',
                        }}>
                        Close
                    </Box>

                    <IconButton
                        onClick={goToNext}
                        disabled={!hasNext}
                        size="small"
                        sx={{
                            ...hardShadow,
                            borderRadius: '4px',
                            opacity: hasNext ? 1 : 0.3,
                            backgroundColor: colors.primaryWhite,
                            '&:hover': { backgroundColor: colors.secondaryYellow },
                        }}>
                        <IconChevronRight size={20} />
                    </IconButton>
                </Box>
            </SwipeableDrawer>

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
