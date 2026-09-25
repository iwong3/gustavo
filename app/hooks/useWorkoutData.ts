'use client'

import { useQueries, useQueryClient } from '@tanstack/react-query'

import type {
    Exercise,
    MuscleGroupWithParents,
    Workout,
    WorkoutPreset,
} from '@/lib/health-types'
import { queryKeys, staleTimes } from '@/lib/query-keys'

const fetchJson = async <T>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)
    return res.json()
}

/**
 * Everything the Workouts section reads: muscle groups, the workout list,
 * the exercise catalogue, and workout routines (presets). Shared by the list
 * page and the add/edit pages so navigating between them hits the cache
 * instead of refetching.
 *
 * Pages gate on only what they render (`pending`), not all four queries.
 * Until the full workout history has loaded once, `workouts` is the Health
 * hub's cached last-30-days list (`workoutsPartial` is true meanwhile) — so
 * the Workouts page usually opens with content instead of a skeleton.
 */
export function useWorkoutData() {
    const queryClient = useQueryClient()
    const [mg, workouts, exercises, presets] = useQueries({
        queries: [
            {
                queryKey: queryKeys.health.muscleGroups,
                queryFn: () =>
                    fetchJson<MuscleGroupWithParents[]>(
                        '/api/health/muscle-groups'
                    ),
                staleTime: staleTimes.forever,
            },
            {
                queryKey: queryKeys.health.workouts.list(),
                queryFn: () => fetchJson<Workout[]>('/api/health/workouts'),
                // The hub's date-ranged list shares this key prefix
                placeholderData: () =>
                    queryClient
                        .getQueriesData<Workout[]>({
                            queryKey: queryKeys.health.workouts.list(),
                        })
                        .find(
                            ([key, data]) =>
                                key.length >
                                    queryKeys.health.workouts.list().length &&
                                data
                        )?.[1],
            },
            {
                queryKey: queryKeys.health.exercises,
                queryFn: () => fetchJson<Exercise[]>('/api/health/exercises'),
            },
            {
                queryKey: queryKeys.health.presets.byType('workout'),
                queryFn: () =>
                    fetchJson<WorkoutPreset[]>(
                        '/api/health/presets?type=workout'
                    ),
            },
        ],
    })

    return {
        muscleGroups: mg.data ?? [],
        workouts: workouts.data ?? [],
        exercises: exercises.data ?? [],
        presets: presets.data ?? [],
        /** Per query — gate a page on only the data it renders. */
        pending: {
            muscleGroups: mg.isPending,
            workouts: workouts.isPending,
            exercises: exercises.isPending,
            presets: presets.isPending,
        },
        /** `workouts` is still the hub's recent-only placeholder. */
        workoutsPartial: workouts.isPlaceholderData,
        /** Everything — for the forms, which use all four. */
        loading: [mg, workouts, exercises, presets].some((q) => q.isPending),
    }
}
