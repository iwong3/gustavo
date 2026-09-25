'use client'

import { Box } from '@mui/material'

import RoutineForm from 'components/health/routine-form'
import { FormSkeleton } from 'components/skeleton/form-skeleton'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/exercise/routines'

export default function NewRoutinePage() {
    const exitTo = useExitTo()
    const { muscleGroups, exercises, pending } = useWorkoutData()
    // Routines don't need the workout history
    const loading = pending.muscleGroups || pending.exercises

    if (loading) return <FormSkeleton fields={['field', { block: 450 }, { block: 300 }]} />

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <RoutineForm
                mode="add"
                muscleGroups={muscleGroups}
                exercises={exercises}
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
