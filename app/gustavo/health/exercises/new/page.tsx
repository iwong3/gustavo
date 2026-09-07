'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

import ExerciseForm from 'components/health/exercise-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useExerciseLibrary } from 'hooks/useExerciseLibrary'

const LIST_URL = '/gustavo/health/exercises'

/** New Exercise — /gustavo/health/exercises/new */
export default function AddExercisePage() {
    const router = useRouter()
    const { muscleGroups, loading } = useExerciseLibrary()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <ExerciseForm
                mode="add"
                muscleGroups={muscleGroups}
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
