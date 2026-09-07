'use client'

import { Box, Typography } from '@mui/material'
import { IconPill } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { cardSx, colors } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import {
    HealthPageHeader,
    HealthPageLayout,
} from 'components/health/health-page-layout'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { useSupplementData } from 'hooks/useSupplementData'
import { useRegisterFab } from 'providers/fab-provider'

const LIST_URL = '/gustavo/health/supplements/manage'
const NEW_URL = `${LIST_URL}/new`

/**
 * Manage the supplement catalogue (active and inactive): tap to edit, swipe
 * to edit/delete. The FAB adds a new one.
 */
export default function ManageSupplementsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { supplements, loading } = useSupplementData()

    useEffect(() => {
        router.prefetch(NEW_URL)
    }, [router])

    const openNew = useCallback(() => router.push(NEW_URL), [router])
    useRegisterFab(openNew)

    const invalidate = useCallback(
        () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.supplements,
            }),
        [queryClient]
    )

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/health/supplements/${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Delete failed')
        },
        onSuccess: invalidate,
    })

    const editUrl = (id: number) => `${LIST_URL}/${id}/edit`

    return (
        <HealthPageLayout loading={loading} onRefresh={invalidate}>
            <HealthPageHeader
                icon={
                    <IconPill
                        size={20}
                        stroke={2}
                        color={colors.primaryBlack}
                        fill={colors.primaryWhite}
                    />
                }
                title="Manage Supplements"
                color="#cdbfdb"
            />

            {supplements.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: colors.primaryBrown,
                        textAlign: 'center',
                        py: 4,
                    }}>
                    No supplements yet. Tap + to add one.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {supplements.map((supp) => (
                        <Box key={supp.id} sx={{ ...cardSx, overflow: 'hidden' }}>
                            <SwipeableRow
                                canEdit
                                canDelete
                                onEdit={() => router.push(editUrl(supp.id))}
                                onDelete={() => deleteMutation.mutate(supp.id)}
                                backgroundColor={colors.primaryWhite}
                                borderColor={colors.primaryBlack}>
                                <Box
                                    onClick={() => router.push(editUrl(supp.id))}
                                    sx={{
                                        'padding': '10px 14px',
                                        'cursor': 'pointer',
                                        'backgroundColor': colors.primaryWhite,
                                        'opacity': supp.isActive ? 1 : 0.5,
                                        '&:active': {
                                            backgroundColor: colors.secondaryYellow,
                                        },
                                    }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                        {supp.name}
                                    </Typography>
                                    {supp.dosage && (
                                        <Typography
                                            sx={{ fontSize: 12, color: colors.primaryBrown }}>
                                            {supp.dosage}
                                        </Typography>
                                    )}
                                    {!supp.isActive && (
                                        <Typography
                                            sx={{
                                                fontSize: 11,
                                                color: colors.primaryBrown,
                                                fontStyle: 'italic',
                                            }}>
                                            Inactive
                                        </Typography>
                                    )}
                                </Box>
                            </SwipeableRow>
                        </Box>
                    ))}
                </Box>
            )}
        </HealthPageLayout>
    )
}
