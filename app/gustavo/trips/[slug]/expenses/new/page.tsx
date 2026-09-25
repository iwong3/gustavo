'use client'

import { Box, Typography } from '@mui/material'

import ExpenseForm from 'components/expense-form'
import { useRefresh } from 'providers/refresh-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canAddExpense } from 'utils/permissions'
import { useExitTo } from 'hooks/use-exit-to'

export default function AddExpensePage() {
    const exitTo = useExitTo()
    const { trip } = useTripData()
    const { onRefresh } = useRefresh()

    const listUrl = `/gustavo/trips/${trip.slug}/expenses`

    if (!canAddExpense(trip.userRole)) {
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
                    You don&apos;t have permission to add expenses on this
                    trip.
                </Typography>
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <ExpenseForm
                mode="add"
                onCancel={() => exitTo(listUrl)}
                onSuccess={() => {
                    exitTo(listUrl)
                    onRefresh()
                }}
            />
        </Box>
    )
}
