'use client'

import { Box, Typography } from '@mui/material'
import { useParams } from 'next/navigation'

import RoutineForm from 'components/health/routine-form'
import { FormSkeleton } from 'components/skeleton/form-skeleton'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { useExitTo } from 'hooks/use-exit-to'

const LIST_URL = '/gustavo/health/exercise/routines'

export default function EditRoutinePage() {
    const { id } = useParams<{ id: string }>()
    const exitTo = useExitTo()
    const { muscleGroups, exercises, presets, pending } = useWorkoutData()
    // Routines don't need the workout history
    const loading = pending.muscleGroups || pending.exercises || pending.presets

    if (loading) return <FormSkeleton fields={['field', { block: 450 }, { block: 300 }]} />

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
                onCancel={() => exitTo(LIST_URL)}
                onSuccess={() => exitTo(LIST_URL)}
            />
        </Box>
    )
}
