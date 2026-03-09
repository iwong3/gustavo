'use client'

import { Box } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'

import ExpenseFormDialog from 'components/expense-form-dialog'
import { ToolsMenuItem } from 'components/menu/enums'
import { TripToolbar } from 'components/menu/trip-toolbar'
import { useToolsMenuStore } from 'components/menu/tools/tools-menu'
import { ReceiptsList } from 'components/receipts/receipts-list'
import { useRegisterFab } from 'providers/fab-provider'
import { useRefresh } from 'providers/refresh-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canAddExpense } from 'utils/permissions'

export default function ExpensesPage() {
    const { trip } = useTripData()
    const { onRefresh } = useRefresh()
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const showAddExpense = canAddExpense(trip.userRole)

    // Lock the tools menu store to Receipts so the toolbar shows the right state
    const setActiveItem = useToolsMenuStore((s) => s.setActiveItem)
    useEffect(() => {
        setActiveItem(ToolsMenuItem.Receipts)
    }, [setActiveItem])

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
