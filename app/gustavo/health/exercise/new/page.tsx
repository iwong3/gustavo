'use client'

import { Box } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import WorkoutForm from 'components/health/workout-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useWorkoutData } from 'hooks/useWorkoutData'

const LIST_URL = '/gustavo/health/exercise'

/**
 * Log Workout. `?from=<workoutId>` opens it as a duplicate of that workout
 * (same groups/exercises, dated today).
 */
function AddWorkoutPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { muscleGroups, workouts, exercises, presets, loading } =
        useWorkoutData()

    const fromId = searchParams.get('from')
    const source = fromId
        ? (workouts.find((w) => String(w.id) === fromId) ?? undefined)
        : undefined

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <WorkoutForm
                key={fromId ?? 'new'}
                mode={source ? 'duplicate' : 'add'}
                workout={source}
                muscleGroups={muscleGroups}
                exercises={exercises}
                presets={presets}
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}

export default function Page() {
    // useSearchParams needs a Suspense boundary
    return (
        <Suspense
            fallback={<HealthPageLayout loading>{null}</HealthPageLayout>}>
            <AddWorkoutPage />
        </Suspense>
    )
}
