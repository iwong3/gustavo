'use client'

import { useQuery } from '@tanstack/react-query'

import type { WeightLog } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'

/**
 * The weight log list. Shared by the Weight page and its add/edit pages so
 * navigating between them hits the cache instead of refetching.
 */
export function useWeightLogs() {
    const { data: logs = [], isLoading: loading } = useQuery({
        queryKey: queryKeys.health.weightLogs,
        queryFn: async () => {
            const r = await fetch('/api/health/weight-logs')
            if (!r.ok) throw new Error('Failed to load weight logs')
            return r.json() as Promise<WeightLog[]>
        },
    })
    return { logs, loading }
}
