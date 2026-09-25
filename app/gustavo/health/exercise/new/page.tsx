'use client'

import { Box } from '@mui/material'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import WorkoutForm from 'components/health/workout-form'
import { WorkoutFormSkeleton } from 'components/skeleton/health-skeletons'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/exercise'

/**
 * Log Workout. `?from=<workoutId>` opens it as a duplicate of that workout
 * (same groups/exercises, dated today).
 */
function AddWorkoutPage() {
    const exitTo = useExitTo()
    const searchParams = useSearchParams()
    const { muscleGroups, workouts, exercises, presets, loading, workoutsPartial } =
        useWorkoutData()

    const fromId = searchParams.get('from')
    const source = fromId
        ? (workouts.find((w) => String(w.id) === fromId) ?? undefined)
        : undefined

    // The form needs the complete history (duplicating an older workout,
    // exercise history), not the hub's recent-only placeholder list
    if (loading || workoutsPartial) return <WorkoutFormSkeleton />

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
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}

export default function Page() {
    // useSearchParams needs a Suspense boundary
    return (
        <Suspense
            fallback={<WorkoutFormSkeleton />}>
            <AddWorkoutPage />
        </Suspense>
    )
}
