'use client'

import { Box, Chip, Typography } from '@mui/material'
import { IconBolt } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { cardSx, colors } from '@/lib/colors'
import { isTarget } from '@/lib/health/muscle-groups'
import { queryKeys } from '@/lib/query-keys'
import {
    HealthPageHeader,
    HealthPageLayout,
} from 'components/health/health-page-layout'
import { selectedBg, selectedBorder } from 'components/health/muscle-group-grid'
import {
    SortableDragHandle,
    SortablePresetRow,
    VerticalSortableList,
} from 'components/health/sortable-preset'
import { useReorderWorkoutPresets } from 'components/health/workout-presets'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { useRegisterFab } from 'providers/fab-provider'

const NEW_URL = '/gustavo/health/exercise/routines/new'

/**
 * Manage workout routines: drag to reorder, tap to edit, swipe to
 * edit/delete. The FAB creates a new one.
 */
export default function RoutinesPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { presets, loading } = useWorkoutData()
    const reorder = useReorderWorkoutPresets()

    useEffect(() => {
        router.prefetch(NEW_URL)
    }, [router])

    const openNew = useCallback(() => router.push(NEW_URL), [router])
    useRegisterFab(openNew)

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/health/presets/${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Delete failed')
        },
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.presets.all,
            }),
    })

    const editUrl = (id: number) =>
        `/gustavo/health/exercise/routines/${id}/edit`

    return (
        <HealthPageLayout loading={loading}>
            <HealthPageHeader
                icon={
                    <IconBolt
                        size={20}
                        stroke={2.5}
                        fill={colors.primaryWhite}
                        color={colors.primaryBlack}
                    />
                }
                title="Routines"
                color="#ffe0b2"
            />

            {presets.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: colors.primaryBrown,
                        textAlign: 'center',
                        py: 4,
                    }}>
                    No routines yet. Tap + to create one.
                </Typography>
            ) : (
                <VerticalSortableList items={presets} onReorder={reorder}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                        }}>
                        {presets.map((p) => (
                            <SortablePresetRow key={p.id} id={p.id}>
                                <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                    <SwipeableRow
                                        canEdit
                                        canDelete
                                        onEdit={() =>
                                            router.push(editUrl(p.id))
                                        }
                                        onDelete={() =>
                                            deleteMutation.mutate(p.id)
                                        }
                                        backgroundColor={colors.primaryWhite}
                                        borderColor={colors.primaryBlack}>
                                        <Box
                                            onClick={() =>
                                                router.push(editUrl(p.id))
                                            }
                                            sx={{
                                                'p': 1.5,
                                                'display': 'flex',
                                                'gap': 1.5,
                                                'cursor': 'pointer',
                                                'backgroundColor':
                                                    colors.primaryWhite,
                                                '&:active': {
                                                    backgroundColor:
                                                        colors.secondaryYellow,
                                                },
                                            }}>
                                            <SortableDragHandle id={p.id} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        mb: 0.5,
                                                    }}>
                                                    {p.name}
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: 0.5,
                                                    }}>
                                                    {p.muscleGroups
                                                        .filter(
                                                            (mg) =>
                                                                !isTarget(
                                                                    mg.name
                                                                )
                                                        )
                                                        .map((mg) => (
                                                            <Chip
                                                                key={mg.id}
                                                                label={mg.name}
                                                                size="small"
                                                                sx={{
                                                                    'height': 20,
                                                                    'fontSize': 10,
                                                                    'fontWeight': 600,
                                                                    'backgroundColor':
                                                                        selectedBg,
                                                                    'border': `1px solid ${selectedBorder}`,
                                                                    'borderRadius':
                                                                        '3px',
                                                                    '& .MuiChip-label':
                                                                        {
                                                                            px: 0.75,
                                                                        },
                                                                }}
                                                            />
                                                        ))}
                                                </Box>
                                                {p.exercises.length > 0 && (
                                                    <Typography
                                                        sx={{
                                                            fontSize: 11,
                                                            color: colors.primaryBrown,
                                                            mt: 0.5,
                                                        }}>
                                                        {p.exercises
                                                            .map((e) => e.name)
                                                            .join(', ')}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </SwipeableRow>
                                </Box>
                            </SortablePresetRow>
                        ))}
                    </Box>
                </VerticalSortableList>
            )}
        </HealthPageLayout>
    )
}
