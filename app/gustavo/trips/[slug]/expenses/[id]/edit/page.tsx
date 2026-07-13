'use client'

import { Box, Typography } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'

import ExpenseForm from 'components/expense-form'
import { useRefresh } from 'providers/refresh-provider'
import { useTripData } from 'providers/trip-data-provider'
import { canEditExpense } from 'utils/permissions'

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
    const router = useRouter()
    const { trip, expenses } = useTripData()
    const { onRefresh } = useRefresh()

    // Compare as strings: expense ids are BIGINTs that the pg driver returns
    // as strings at runtime (lib/types.ts says number, but that's not what
    // JSON actually carries), so `e.id === Number(id)` never matches
    const expense = expenses.find((e) => String(e.id) === id) ?? null

    if (!expense) {
        return <Message text="This expense no longer exists." />
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
                onCancel={() => router.replace(detailUrl)}
                onSuccess={() => {
                    router.replace(detailUrl)
                    onRefresh()
                }}
            />
        </Box>
    )
}
