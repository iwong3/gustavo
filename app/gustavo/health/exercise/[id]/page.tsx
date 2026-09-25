'use client'

import { Box } from '@mui/material'
import { IconCopy, IconEdit, IconTrash } from '@tabler/icons-react'
import { useParams, useRouter } from 'next/navigation'
import { useExitTo } from 'hooks/use-exit-to'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { colors } from '@/lib/colors'
import { queryKeys } from '@/lib/query-keys'
import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'
import { GoneState } from 'components/gone-state'
import { WorkoutDetailSkeleton } from 'components/skeleton/health-skeletons'
import { removeCachedWorkout } from 'utils/workout-cache'
import type { Workout } from '@/lib/health-types'
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
    const exitTo = useExitTo()
    const queryClient = useQueryClient()
    const { workouts, pending, workoutsPartial } = useWorkoutData()
    const [deleteOpen, setDeleteOpen] = useState(false)
    // Just deleted and on our way out: keep rendering the last copy so the
    // page doesn't flash "not here anymore" before the navigation lands
    const [leavingWorkout, setLeavingWorkout] = useState<Workout | null>(null)

    // Compare as strings: ids are BIGINTs and arrive as strings at runtime
    const workout =
        workouts.find((w) => String(w.id) === id) ?? leavingWorkout ?? undefined

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
            setDeleteOpen(false)
            // Gone from the list before we land on it
            setLeavingWorkout(workout ?? null)
            removeCachedWorkout(queryClient, id)
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.workouts.all,
            })
            exitTo(LIST_URL)
        },
    })

    // Still loading — or showing the hub's recent-only placeholder list,
    // which may not include an older workout yet
    if (pending.workouts || (!workout && workoutsPartial)) {
        return <WorkoutDetailSkeleton />
    }

    if (!workout) {
        return (
            <GoneState
                title="This workout isn't here anymore"
                detail="It may have been deleted."
                action={{ label: 'Back to workouts', onClick: () => exitTo(LIST_URL) }}
            />
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
