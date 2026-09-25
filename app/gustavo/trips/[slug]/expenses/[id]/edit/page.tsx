'use client'

import { Box, Typography } from '@mui/material'
import { useParams } from 'next/navigation'

import ExpenseForm from 'components/expense-form'
import { GoneState } from 'components/gone-state'
import { useRefresh } from 'providers/refresh-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canEditExpense } from 'utils/permissions'
import { useExitTo } from 'hooks/use-exit-to'

const Message = ({ text }: { text: string }) => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            maxWidth: 450,
            padding: 4,
        }}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {text}
        </Typography>
    </Box>
)

export default function EditExpensePage() {
    const { id } = useParams<{ slug: string; id: string }>()
    const exitTo = useExitTo()
    const { trip, expenses } = useTripData()
    const { onRefresh } = useRefresh()

    // Compare as strings: expense ids are BIGINTs that the pg driver returns
    // as strings at runtime (lib/types.ts says number, but that's not what
    // JSON actually carries), so `e.id === Number(id)` never matches
    const expense = expenses.find((e) => String(e.id) === id) ?? null

    if (!expense) {
        return (
            <GoneState
                title="This expense isn't here anymore"
                detail="It may have been deleted."
                action={{
                    label: 'Back to expenses',
                    onClick: () => exitTo(`/gustavo/trips/${trip.slug}/expenses`),
                }}
            />
        )
    }

    const isReporter = expense.reportedBy?.id === trip.currentUserId
    if (!canEditExpense(trip.userRole, trip.isAdmin, isReporter)) {
        return (
            <Message text="You don't have permission to edit this expense." />
        )
    }

    const detailUrl = `/gustavo/trips/${trip.slug}/expenses/${expense.id}`

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <ExpenseForm
                mode="edit"
                expense={expense}
                onCancel={() => exitTo(detailUrl)}
                onSuccess={() => {
                    exitTo(detailUrl)
                    onRefresh()
                }}
            />
        </Box>
    )
}
