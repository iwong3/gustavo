import { Box } from '@mui/material'
import { useCallback, useState } from 'react'

import { useRegisterFab } from 'providers/fab-provider'
import ExpenseFormDialog from 'components/expense-form-dialog'
import { TripToolbar } from 'components/menu/trip-toolbar'
import { ToolsMenuItem } from 'components/menu/enums'
import { useToolsMenuStore, ToolsMenuItemMap } from 'components/menu/tools/tools-menu'
import { RefreshProvider } from 'providers/refresh-provider'
import { SpendDataProvider } from 'providers/spend-data-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canAddExpense } from 'utils/permissions'

type GustavoProps = {
    onRefresh?: () => void
}

export const Gustavo = ({ onRefresh }: GustavoProps) => {
    const { trip } = useTripData()
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const showAddExpense = canAddExpense(trip.userRole)

    const activeItem = useToolsMenuStore((s) => s.activeItem)
    const isReceiptsView = activeItem === ToolsMenuItem.Receipts

    const fabCallback = useCallback(() => setAddDialogOpen(true), [])
    useRegisterFab(showAddExpense && isReceiptsView ? fabCallback : null)
    const ActiveComponent = ToolsMenuItemMap.get(activeItem)?.Component ?? null

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <SpendDataProvider>
                <TripToolbar />
                <RefreshProvider onRefresh={() => onRefresh?.()}>
                    <Box sx={{ maxWidth: 450, width: '100%' }}>
                        {ActiveComponent && <ActiveComponent />}
                    </Box>
                </RefreshProvider>
            </SpendDataProvider>

            {showAddExpense && (
                <ExpenseFormDialog
                    open={addDialogOpen}
                    onClose={() => setAddDialogOpen(false)}
                    onSuccess={() => onRefresh?.()}
                    mode="add"
                />
            )}
        </Box>
    )
}
