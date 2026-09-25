'use client'

import { Box, Typography } from '@mui/material'
import { useParams } from 'next/navigation'

import ExerciseForm from 'components/health/exercise-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useExerciseLibrary } from 'hooks/useExerciseLibrary'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/exercises'

/** Edit Exercise — /gustavo/health/exercises/[id]/edit */
export default function EditExercisePage() {
    const { id } = useParams<{ id: string }>()
    const exitTo = useExitTo()
    const { exercises, muscleGroups, loading } = useExerciseLibrary()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    // Compare as strings: ids are BIGINTs and arrive as strings at runtime
    const exercise = exercises.find((e) => String(e.id) === id)
    if (!exercise) {
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
                    This exercise no longer exists.
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
            <ExerciseForm
                key={String(exercise.id)}
                mode="edit"
                exercise={exercise}
                muscleGroups={muscleGroups}
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
