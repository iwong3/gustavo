'use client'

import { colors, hardShadow } from '@/lib/colors'
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
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, marginX: 2, marginTop: 2, marginBottom: 1, paddingX: 1.5, paddingY: 0.75, backgroundColor: '#dae6a3', ...hardShadow, borderRadius: '4px', alignSelf: 'flex-start' }}>
                {getTablerIcon({ name: 'IconReceipt', size: 20, stroke: 2, color: colors.primaryBlack, fill: colors.primaryWhite })}
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
