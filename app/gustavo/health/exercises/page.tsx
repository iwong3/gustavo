'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Exercise } from '@/lib/health-types'
import { isTarget } from '@/lib/health/muscle-groups'
import { Box, Chip, Typography } from '@mui/material'
import { IconStretching } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import { HealthPageLayout, HealthPageHeader } from 'components/health/health-page-layout'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { useExerciseLibrary } from 'hooks/useExerciseLibrary'

const chipShadow = `1px 1px 0px`

const LIST_URL = '/gustavo/health/exercises'
const NEW_URL = `${LIST_URL}/new`

export default function ExercisesPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { exercises, loading } = useExerciseLibrary()

    const invalidateExercises = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.health.exercises })
    }, [queryClient])

    // Warm the form route so the FAB opens it instantly
    useEffect(() => {
        router.prefetch(NEW_URL)
    }, [router])

    const openAdd = useCallback(() => router.push(NEW_URL), [router])
    const openEdit = useCallback(
        (exercise: Exercise) => router.push(`${LIST_URL}/${exercise.id}/edit`),
        [router]
    )

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/health/exercises/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
        },
        onSuccess: invalidateExercises,
        meta: { errorToast: "Couldn't delete that exercise. Try again." },
    })
    const handleDelete = useCallback(
        (id: number) => deleteMutation.mutate(id),
        [deleteMutation],
    )

    useRegisterFab(openAdd)

    return (
        <HealthPageLayout loading={loading} onRefresh={invalidateExercises}>
            <HealthPageHeader
                icon={<IconStretching size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />}
                title="Exercises"
                color="#fff9c4"
            />

            {exercises.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                    No exercises yet. Tap + to add one.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {exercises.map((exercise) => (
                        <Box key={exercise.id} sx={{ ...cardSx, overflow: 'hidden' }}>
                            <SwipeableRow
                                canEdit
                                canDelete
                                onEdit={() => openEdit(exercise)}
                                onDelete={() => handleDelete(exercise.id)}
                                backgroundColor={colors.primaryWhite}
                                borderColor={colors.primaryBlack}
                            >
                                <Box
                                    onClick={() => openEdit(exercise)}
                                    sx={{
                                        'padding': '12px 14px',
                                        'cursor': 'pointer',
                                        '&:active': { backgroundColor: `${colors.primaryYellow}15` },
                                    }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                            {exercise.name}
                                        </Typography>
                                        {exercise.isBodyweight && (
                                            <Chip
                                                label="BW"
                                                size="small"
                                                sx={{
                                                    'height': 20,
                                                    'fontSize': 10,
                                                    'fontWeight': 700,
                                                    'backgroundColor': '#e0ebe0',
                                                    'border': `1px solid ${colors.primaryBrown}`,
                                                    'boxShadow': `${chipShadow} ${colors.primaryBrown}`,
                                                    'borderRadius': '3px',
                                                    '& .MuiChip-label': { px: 0.75 },
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {exercise.muscleGroups.map((mg) => {
                                            const isTargetMuscle = isTarget(mg.name)
                                            return (
                                                <Chip
                                                    key={mg.id}
                                                    label={mg.name}
                                                    size="small"
                                                    sx={{
                                                        'height': 22,
                                                        'fontSize': 11,
                                                        'fontWeight': isTargetMuscle ? 500 : 600,
                                                        'backgroundColor': isTargetMuscle ? '#f5f0eb' : '#fff8e1',
                                                        'border': `1px solid ${isTargetMuscle ? '#a0612a' : '#b57b00'}`,
                                                        'boxShadow': `${chipShadow} ${isTargetMuscle ? '#a0612a' : '#b57b00'}`,
                                                        'borderRadius': '3px',
                                                        '& .MuiChip-label': { px: 0.75 },
                                                    }}
                                                />
                                            )
                                        })}
                                    </Box>
                                </Box>
                            </SwipeableRow>
                        </Box>
                    ))}
                </Box>
            )}
        </HealthPageLayout>
    )
}
