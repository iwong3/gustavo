'use client'

import { useQueries } from '@tanstack/react-query'

import type { Exercise, MuscleGroupWithParents } from '@/lib/health-types'
import { queryKeys, staleTimes } from '@/lib/query-keys'

const fetchJson = async <T>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)
    return res.json()
}

/**
 * What the Exercise library reads: the exercise catalogue + muscle groups.
 * Shared by the list page and the add/edit pages so navigating between them
 * hits the cache (same keys as useWorkoutData, so the Workouts section shares
 * it too).
 */
export function useExerciseLibrary() {
    const [exercises, mg] = useQueries({
        queries: [
            {
                queryKey: queryKeys.health.exercises,
                queryFn: () => fetchJson<Exercise[]>('/api/health/exercises'),
            },
            {
                queryKey: queryKeys.health.muscleGroups,
                queryFn: () =>
                    fetchJson<MuscleGroupWithParents[]>(
                        '/api/health/muscle-groups'
                    ),
                staleTime: staleTimes.forever,
            },
        ],
    })

    return {
        exercises: exercises.data ?? [],
        muscleGroups: mg.data ?? [],
        loading: [exercises, mg].some((q) => q.isPending),
    }
}
