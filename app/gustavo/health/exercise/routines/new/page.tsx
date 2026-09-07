'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

import RoutineForm from 'components/health/routine-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useWorkoutData } from 'hooks/useWorkoutData'

const LIST_URL = '/gustavo/health/exercise/routines'

export default function NewRoutinePage() {
    const router = useRouter()
    const { muscleGroups, exercises, loading } = useWorkoutData()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

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
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
