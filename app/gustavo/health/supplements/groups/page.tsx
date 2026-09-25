'use client'

import { Box, Typography } from '@mui/material'
import { IconBolt } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { cardSx, colors, healthColors } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import {
    HealthPageHeader,
    HealthPageLayout,
} from 'components/health/health-page-layout'
import {
    SortableDragHandle,
    SortablePresetRow,
    VerticalSortableList,
} from 'components/health/sortable-preset'
import { useReorderSupplementPresets } from 'components/health/supplement-presets'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { useSupplementData } from 'hooks/useSupplementData'
import { useRegisterFab } from 'providers/fab-provider'

const LIST_URL = '/gustavo/health/supplements/groups'
const NEW_URL = `${LIST_URL}/new`

/**
 * Manage supplement groups (presets): drag to reorder, tap to edit, swipe to
 * edit/delete. The FAB creates a new one. Mirrors the workout routines page.
 */
export default function SupplementGroupsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { presets, loading } = useSupplementData()
    const reorder = useReorderSupplementPresets()

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
        meta: { errorToast: "Couldn't delete that group. Try again." },
    })

    const editUrl = (id: number) => `${LIST_URL}/${id}/edit`

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
                title="Supplement Groups"
                color={healthColors.supplements}
            />

            {presets.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: colors.primaryBrown,
                        textAlign: 'center',
                        py: 4,
                    }}>
                    No groups yet. Tap + to create one.
                </Typography>
            ) : (
                <VerticalSortableList items={presets} onReorder={reorder}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {presets.map((p) => (
                            <SortablePresetRow key={p.id} id={p.id}>
                                <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                    <SwipeableRow
                                        canEdit
                                        canDelete
                                        onEdit={() => router.push(editUrl(p.id))}
                                        onDelete={() => deleteMutation.mutate(p.id)}
                                        backgroundColor={colors.primaryWhite}
                                        borderColor={colors.primaryBlack}>
                                        <Box
                                            onClick={() => router.push(editUrl(p.id))}
                                            sx={{
                                                'p': 1.5,
                                                'display': 'flex',
                                                'alignItems': 'center',
                                                'gap': 1.5,
                                                'cursor': 'pointer',
                                                'backgroundColor': colors.primaryWhite,
                                                '&:active': {
                                                    backgroundColor: colors.secondaryYellow,
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
                                                <Typography
                                                    sx={{
                                                        fontSize: 12,
                                                        color: colors.primaryBrown,
                                                    }}>
                                                    {p.supplements
                                                        .map((s) => s.name)
                                                        .join(', ')}
                                                </Typography>
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
