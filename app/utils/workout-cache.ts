import type { QueryClient } from '@tanstack/react-query'

import type { Workout } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'

// Direct edits to every cached workout list — the full list and the Health
// hub's date-ranged one share the list() key prefix — so saves and deletes
// show the moment they happen instead of when a refetch lands. Ids compared
// as strings (BIGINTs arrive as strings at runtime).

const LISTS = { queryKey: queryKeys.health.workouts.list() }

/** Replace the workout in place, or add it (newest first) if it's new. */
export function upsertCachedWorkout(queryClient: QueryClient, saved: Workout) {
    queryClient.setQueriesData<Workout[]>(LISTS, (old) => {
        if (!old) return old
        const i = old.findIndex((w) => String(w.id) === String(saved.id))
        if (i === -1) {
            return [saved, ...old].sort((a, b) => b.date.localeCompare(a.date))
        }
        const next = [...old]
        next[i] = saved
        return next.sort((a, b) => b.date.localeCompare(a.date))
    })
}

/** Remove a workout from every cached list. */
export function removeCachedWorkout(queryClient: QueryClient, workoutId: number | string) {
    queryClient.setQueriesData<Workout[]>(LISTS, (old) =>
        old?.filter((w) => String(w.id) !== String(workoutId))
    )
}
