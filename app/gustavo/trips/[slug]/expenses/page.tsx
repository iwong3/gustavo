'use client'

import { colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { useCallback, useState } from 'react'

import ExpenseFormDialog from 'components/expense-form-dialog'
import { TripToolbar } from 'components/menu/trip-toolbar'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { useRegisterFab } from 'providers/fab-provider'
import { useRefresh } from 'providers/refresh-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canAddExpense } from 'utils/permissions'
import { getTablerIcon } from 'utils/icons'

export default function ExpensesPage() {
    const { trip } = useTripData()
    const { onRefresh } = useRefresh()
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const showAddExpense = canAddExpense(trip.userRole)

    const fabCallback = useCallback(() => setAddDialogOpen(true), [])
    useRegisterFab(showAddExpense ? fabCallback : null)

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingX: 2, paddingTop: 2, paddingBottom: 1 }}>
                {getTablerIcon({ name: 'IconReceipt', size: 20, stroke: 2, color: colors.primaryBlack })}
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.primaryBlack, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Expenses
                </Typography>
            </Box>
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
    )
}
