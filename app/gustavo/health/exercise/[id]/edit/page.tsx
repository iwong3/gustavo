'use client'

import { Box, Typography } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'

import WorkoutForm from 'components/health/workout-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useWorkoutData } from 'hooks/useWorkoutData'

const LIST_URL = '/gustavo/health/exercise'

export default function EditWorkoutPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { muscleGroups, workouts, exercises, presets, loading } =
        useWorkoutData()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

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
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
