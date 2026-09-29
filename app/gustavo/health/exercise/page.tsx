'use client'

/**
 * Workouts. A List / Calendar switch in the title row; ⚡ (→ Routines) leads
 * the routines row in both modes.
 *  - List: rotation tiles (days since each routine; tap to log it today, with
 *    Undo), then Sunday-start weeks with one row per day, labelled by routine,
 *    the date badged with days since the last workout.
 *  - Calendar: routine filter chips + a calendar month of square days you
 *    page through (‹ ›), or the Hub's rolling 90D / 1Y heatmap, with the
 *    chosen routine's days filled and its stats
 *    (components/health/workout-calendar.tsx).
 * Home does the daily logging and the Hub the long view; this page is for
 * looking back and fixing things. Model: lib/health/workout-days.ts.
 */
import { colors, healthColors } from '@/lib/colors'
import {
    buildWorkoutDays,
    groupByWeek,
    routineRecency,
    type WorkoutDay,
} from '@/lib/health/workout-days'
import type { WorkoutPreset } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { Box, Typography } from '@mui/material'
import { IconBarbell, IconCalendar, IconList } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    HealthPageHeader,
    HealthPageLayout,
} from 'components/health/health-page-layout'
import {
    RoutineFilterChips,
    WorkoutCalendarCard,
} from 'components/health/workout-calendar'
import {
    RotationTiles,
    RoutinesButton,
    WorkoutWeeks,
} from 'components/health/workout-log'
import { useApplyWorkoutRoutine } from 'components/health/workout-presets'
import {
    useWorkoutsViewStore,
    type WorkoutsView,
} from 'components/health/workouts-view-store'
import { WorkoutsListSkeleton } from 'components/skeleton/health-skeletons'
import { SlidingToggle } from 'components/sliding-toggle'
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
    const {
        view,
        setView,
        window,
        setWindow,
        month,
        setMonth,
        filter,
        setFilter,
    } = useWorkoutsViewStore()

    // Warm the form routes so the FAB / ⚡ taps open instantly
    useEffect(() => {
        router.prefetch(NEW_URL)
        router.prefetch(ROUTINES_URL)
    }, [router])

    const { workouts, presets, pending } = useWorkoutData()
    // Only what this page renders — not the exercise library / muscle groups
    const loading = pending.workouts || pending.presets

    const days = useMemo(
        () => buildWorkoutDays(workouts, presets),
        [workouts, presets]
    )
    const weeks = useMemo(() => groupByWeek(days, today), [days, today])
    const recency = useMemo(
        () => routineRecency(days, presets, today),
        [days, presets, today]
    )
    // A deleted routine can't stay the filter
    const activeFilter =
        filter === 'all' || presets.some((p) => String(p.id) === filter)
            ? filter
            : 'all'

    const { apply, applyingId } = useApplyWorkoutRoutine(today)

    const invalidateAll = useCallback(() => {
        queryClient.invalidateQueries({
            queryKey: queryKeys.health.workouts.all,
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.exercises })
        queryClient.invalidateQueries({
            queryKey: queryKeys.health.presets.all,
        })
    }, [queryClient])

    const deleteMutation = useMutation({
        mutationFn: async (day: Day) => {
            for (const w of day.workouts) {
                const res = await fetch(`/api/health/workouts/${w.id}`, {
                    method: 'DELETE',
                })
                if (!res.ok) throw new Error('Delete failed')
            }
        },
        // Row disappears immediately; the refetch after (either way) brings
        // it back if the delete failed
        onMutate: (day: Day) =>
            day.workouts.forEach((w) => removeCachedWorkout(queryClient, w.id)),
        onSettled: () =>
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.workouts.all,
            }),
        meta: { errorToast: "Couldn't delete that workout. Try again." },
    })

    // Detail / edit are pages (see code-guide.md § Page-style forms)
    const hrefFor = useCallback((day: Day) => `${LIST_URL}/${firstId(day)}`, [])
    const openDetail = useCallback(
        (day: Day) => router.push(hrefFor(day)),
        [router, hrefFor]
    )
    const openEdit = useCallback(
        (day: Day) => router.push(`${LIST_URL}/${firstId(day)}/edit`),
        [router]
    )
    const handleDelete = useCallback(
        (day: Day) => deleteMutation.mutate(day),
        [deleteMutation]
    )
    const openRoutines = useCallback(() => router.push(ROUTINES_URL), [router])

    const openAdd = useCallback(() => router.push(NEW_URL), [router])
    useRegisterFab(openAdd)

    const viewToggle = (
        <SlidingToggle
            value={view}
            options={[
                { value: 'list', label: 'List', icon: <IconList size={18} stroke={2} /> },
                { value: 'calendar', label: 'Calendar', icon: <IconCalendar size={18} stroke={2} /> },
            ]}
            onChange={(v) => setView(v as WorkoutsView)}
            borderWidth={1}
            fontSize={12}
            paddingY={0.875}
        />
    )

    return (
        <HealthPageLayout
            loading={loading}
            skeleton={<WorkoutsListSkeleton />}
            onRefresh={invalidateAll}>
            <HealthPageHeader
                icon={
                    <IconBarbell
                        size={20}
                        stroke={2}
                        color={colors.primaryBlack}
                        fill={colors.primaryWhite}
                    />
                }
                title="Workouts"
                color={healthColors.workouts}
                right={viewToggle}
            />
            {view === 'list' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {presets.length > 0 ? (
                        <RotationTiles
                            leading={<RoutinesButton onClick={openRoutines} />}
                            presets={presets}
                            recency={recency}
                            applyingId={applyingId}
                            onApply={apply}
                        />
                    ) : (
                        // No routines yet: ⚡ alone, so Routines stays reachable
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}>
                            <RoutinesButton onClick={openRoutines} />
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.primaryBrown,
                                }}>
                                Add a routine to log it in one tap
                            </Typography>
                        </Box>
                    )}
                    {days.length === 0 ? (
                        <Typography
                            sx={{
                                fontSize: 14,
                                color: colors.primaryBrown,
                                textAlign: 'center',
                                py: 4,
                            }}>
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
            ) : (
                <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            minWidth: 0,
                        }}>
                        <RoutinesButton onClick={openRoutines} size={30} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <RoutineFilterChips
                                presets={presets}
                                filter={activeFilter}
                                onFilter={setFilter}
                            />
                        </Box>
                    </Box>
                    <WorkoutCalendarCard
                        days={days}
                        presets={presets}
                        today={today}
                        filter={activeFilter}
                        window={window}
                        onWindowChange={setWindow}
                        // null = this month, so it rolls over at midnight on the 1st
                        month={month ?? today.slice(0, 7)}
                        onMonthChange={(m) =>
                            setMonth(m === today.slice(0, 7) ? null : m)
                        }
                        onOpen={openDetail}
                    />
                </Box>
            )}
        </HealthPageLayout>
    )
}

export default function Page() {
    return <ExercisePage />
}
