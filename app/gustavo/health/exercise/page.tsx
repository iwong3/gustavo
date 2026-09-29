'use client'

/**
 * Workouts: the log. Rotation tiles on top (days since each routine; tap to
 * log it today, with Undo), then Sunday-start weeks with one row per day,
 * labelled by routine, the date badged with days since the last workout.
 * ⚡ → Routines.
 * Home does the daily logging and the Hub the long view; this page is for
 * looking back and fixing things. Model: lib/health/workout-days.ts.
 */
import { colors, healthColors, pressShadowSx } from '@/lib/colors'
import { buildWorkoutDays, groupByWeek, routineRecency, type WorkoutDay } from '@/lib/health/workout-days'
import type { WorkoutPreset } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { Box, Typography } from '@mui/material'
import { IconBarbell, IconBolt } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HealthPageHeader, HealthPageLayout } from 'components/health/health-page-layout'
import { useApplyWorkoutRoutine } from 'components/health/workout-presets'
import { RotationTiles, WorkoutWeeks } from 'components/health/workout-log'
import { WorkoutsListSkeleton } from 'components/skeleton/health-skeletons'
import { useToday } from 'hooks/use-today'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { useRouter } from 'next/navigation'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect, useMemo } from 'react'
import { removeCachedWorkout } from 'utils/workout-cache'

const LIST_URL = '/gustavo/health/exercise'
const NEW_URL = `${LIST_URL}/new`
const ROUTINES_URL = `${LIST_URL}/routines`

type Day = WorkoutDay<WorkoutPreset>
// A day has one workout (00044); a stale cache might still hold two
const firstId = (day: Day) => day.workouts[0].id

function ExercisePage() {
    const queryClient = useQueryClient()
    const router = useRouter()
    const today = useToday()

    // Warm the form routes so the FAB / ⚡ taps open instantly
    useEffect(() => {
        router.prefetch(NEW_URL)
        router.prefetch(ROUTINES_URL)
    }, [router])

    const { workouts, presets, pending } = useWorkoutData()
    // Only what this page renders — not the exercise library / muscle groups
    const loading = pending.workouts || pending.presets

    const days = useMemo(() => buildWorkoutDays(workouts, presets), [workouts, presets])
    const weeks = useMemo(() => groupByWeek(days, today), [days, today])
    const recency = useMemo(() => routineRecency(days, presets, today), [days, presets, today])

    const { apply, applyingId } = useApplyWorkoutRoutine(today)

    const invalidateAll = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.exercises })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.presets.all })
    }, [queryClient])

    const deleteMutation = useMutation({
        mutationFn: async (day: Day) => {
            for (const w of day.workouts) {
                const res = await fetch(`/api/health/workouts/${w.id}`, { method: 'DELETE' })
                if (!res.ok) throw new Error('Delete failed')
            }
        },
        // Row disappears immediately; the refetch after (either way) brings
        // it back if the delete failed
        onMutate: (day: Day) => day.workouts.forEach((w) => removeCachedWorkout(queryClient, w.id)),
        onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all }),
        meta: { errorToast: "Couldn't delete that workout. Try again." },
    })

    // Detail / edit are pages (see code-guide.md § Page-style forms)
    const hrefFor = useCallback((day: Day) => `${LIST_URL}/${firstId(day)}`, [])
    const openDetail = useCallback((day: Day) => router.push(hrefFor(day)), [router, hrefFor])
    const openEdit = useCallback((day: Day) => router.push(`${LIST_URL}/${firstId(day)}/edit`), [router])
    const handleDelete = useCallback((day: Day) => deleteMutation.mutate(day), [deleteMutation])

    const openAdd = useCallback(() => router.push(NEW_URL), [router])
    useRegisterFab(openAdd)

    // ⚡ → Routines (manage, reorder). Always shown, so the page is reachable
    // before any routine exists.
    const routinesButton = (
        <Box
            component="button"
            type="button"
            onClick={() => router.push(ROUTINES_URL)}
            aria-label="Routines"
            sx={{
                width: 34,
                height: 34,
                padding: 0,
                borderRadius: '50%',
                backgroundColor: healthColors.workouts,
                border: `1.5px solid ${colors.primaryBlack}`,
                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                ...pressShadowSx,
            }}>
            <IconBolt size={16} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
        </Box>
    )

    return (
        <HealthPageLayout loading={loading} skeleton={<WorkoutsListSkeleton />} onRefresh={invalidateAll}>
            <HealthPageHeader
                icon={<IconBarbell size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />}
                title="Workouts"
                color={healthColors.workouts}
                right={routinesButton}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {presets.length > 0 && (
                    <RotationTiles presets={presets} recency={recency} applyingId={applyingId} onApply={apply} />
                )}
                {days.length === 0 ? (
                    <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                        No workouts logged yet.
                    </Typography>
                ) : (
                    <WorkoutWeeks
                        weeks={weeks}
                        today={today}
                        hrefFor={hrefFor}
                        onOpen={openDetail}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                    />
                )}
            </Box>
        </HealthPageLayout>
    )
}

export default function Page() {
    return <ExercisePage />
}
