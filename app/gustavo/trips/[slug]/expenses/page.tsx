'use client'

import { Box } from '@mui/material'
import { useCallback, useState } from 'react'

import ExpenseFormDialog from 'components/expense-form-dialog'
import { TripToolbar } from 'components/menu/trip-toolbar'
import { PullToRefresh } from 'components/pull-to-refresh'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { useRegisterFab } from 'providers/fab-provider'
import { useRefresh } from 'providers/refresh-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canAddExpense } from 'utils/permissions'
import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'

export default function ExpensesPage() {
    const { trip } = useTripData()
    const { onRefresh } = useRefresh()
    const queryClient = useQueryClient()
    const handlePullRefresh = () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.trips.expenses(trip.id),
        })
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const showAddExpense = canAddExpense(trip.userRole)

    const fabCallback = useCallback(() => setAddDialogOpen(true), [])
    useRegisterFab(showAddExpense ? fabCallback : null)

    return (
        <PullToRefresh onRefresh={handlePullRefresh}>
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <TripToolbar />
            <Box sx={{ maxWidth: 450, width: '100%' }}>
                <ReceiptsList />
            </Box>

            {showAddExpense && (
                <ExpenseFormDialog
                    open={addDialogOpen}
                    onClose={() => setAddDialogOpen(false)}
                    onSuccess={onRefresh}
                    mode="add"
                />
            )}
        </Box>
        </PullToRefresh>
    )
}
