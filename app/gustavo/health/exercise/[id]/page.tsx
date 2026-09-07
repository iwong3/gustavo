'use client'

import { Box, Typography } from '@mui/material'
import { IconCopy, IconEdit, IconTrash } from '@tabler/icons-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { colors } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { WorkoutDetail } from 'components/health/workout-detail'
import { PageActionBar, PageActionButton } from 'components/page-action-bar'
import { useWorkoutData } from 'hooks/useWorkoutData'

const LIST_URL = '/gustavo/health/exercise'

function formatDate(iso: string) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })
}

/** Workout detail — /gustavo/health/exercise/[id]. Edit / Duplicate /
 *  Delete live in the action bar, the way expense detail does it. */
export default function WorkoutDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { workouts, loading } = useWorkoutData()
    const [deleteOpen, setDeleteOpen] = useState(false)

    const editUrl = `${LIST_URL}/${id}/edit`
    const duplicateUrl = `${LIST_URL}/new?from=${id}`

    // Warm the routes the action bar leads to
    useEffect(() => {
        router.prefetch(editUrl)
        router.prefetch(duplicateUrl)
    }, [router, editUrl, duplicateUrl])

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/health/workouts/${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Delete failed')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.workouts.all,
            })
            setDeleteOpen(false)
            router.replace(LIST_URL)
        },
    })

    if (loading) return <HealthPageLayout loading>{null}</HealthPageLayout>

    // Compare as strings: ids are BIGINTs and arrive as strings at runtime
    const workout = workouts.find((w) => String(w.id) === id)
    if (!workout) {
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
                    This workout no longer exists.
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
                paddingTop: 1.5,
                paddingBottom: 1,
            }}>
            <WorkoutDetail workout={workout} allWorkouts={workouts} />

            <PageActionBar>
                <PageActionButton
                    onClick={() => setDeleteOpen(true)}
                    icon={<IconTrash size={22} />}
                    label="Delete"
                    color={colors.primaryRed}
                />
                <PageActionButton
                    onClick={() => router.push(duplicateUrl)}
                    icon={<IconCopy size={22} />}
                    label="Duplicate"
                />
                <PageActionButton
                    onClick={() => router.push(editUrl)}
                    icon={<IconEdit size={22} />}
                    label="Edit"
                />
            </PageActionBar>

            <ConfirmDeleteDialog
                open={deleteOpen}
                title="Delete workout?"
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => deleteMutation.mutate()}
                busy={deleteMutation.isPending}>
                Are you sure you want to delete the workout from{' '}
                <strong>{formatDate(workout.date)}</strong>?
            </ConfirmDeleteDialog>
        </Box>
    )
}
