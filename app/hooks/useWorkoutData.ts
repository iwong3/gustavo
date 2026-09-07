'use client'

import { useQueries } from '@tanstack/react-query'

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
 */
export function useWorkoutData() {
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
        loading: [mg, workouts, exercises, presets].some((q) => q.isLoading),
    }
}
