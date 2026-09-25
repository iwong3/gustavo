'use client'

import { Box, Typography } from '@mui/material'
import { useParams } from 'next/navigation'

import WorkoutForm from 'components/health/workout-form'
import { WorkoutFormSkeleton } from 'components/skeleton/health-skeletons'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/exercise'

export default function EditWorkoutPage() {
    const { id } = useParams<{ id: string }>()
    const exitTo = useExitTo()
    const { muscleGroups, workouts, exercises, presets, loading, workoutsPartial } =
        useWorkoutData()

    // The form needs the complete history (duplicating an older workout,
    // exercise history), not the hub's recent-only placeholder list
    if (loading || workoutsPartial) return <WorkoutFormSkeleton isNew={false} />

    // Compare as strings: ids are BIGINTs and arrive as strings at runtime
    const workout = workouts.find((w) => String(w.id) === id)
    if (!workout) {
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
                    This workout no longer exists.
                </Typography>
            </Box>
        )
    }

    // Back to the detail page, like expense edit
    const detailUrl = `${LIST_URL}/${workout.id}`

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <WorkoutForm
                key={String(workout.id)}
                mode="edit"
                workout={workout}
                muscleGroups={muscleGroups}
                exercises={exercises}
                presets={presets}
                onCancel={() => exitTo(detailUrl)}
                onSuccess={() => exitTo(detailUrl)}
            />
        </Box>
    )
}
