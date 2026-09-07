'use client'

import { Box, Typography } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'

import RoutineForm from 'components/health/routine-form'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { useWorkoutData } from 'hooks/useWorkoutData'

const LIST_URL = '/gustavo/health/exercise/routines'

export default function EditRoutinePage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { muscleGroups, exercises, presets, loading } = useWorkoutData()

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    const preset = presets.find((p) => String(p.id) === id)
    if (!preset) {
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
                    This routine no longer exists.
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
            <RoutineForm
                key={String(preset.id)}
                mode="edit"
                preset={preset}
                muscleGroups={muscleGroups}
                exercises={exercises}
                onCancel={() => router.replace(LIST_URL)}
                onSuccess={() => router.replace(LIST_URL)}
            />
        </Box>
    )
}
