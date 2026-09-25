'use client'

import { useQueries } from '@tanstack/react-query'

import type {
    Supplement,
    SupplementLog,
    SupplementPreset,
} from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'

const fetchJson = async <T>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)
    return res.json()
}

/** Every supplement, active or not (the plain key is the active-only list). */
export const allSupplementsKey = [
    ...queryKeys.health.supplements,
    'all',
] as const

/**
 * Everything the Supplements section reads: the supplement catalogue (incl.
 * inactive), the log history, and the supplement groups (presets). Shared by
 * the list page and its form/manage pages so navigating between them hits
 * the cache instead of refetching.
 */
export function useSupplementData() {
    const [supplements, logs, presets] = useQueries({
        queries: [
            {
                queryKey: allSupplementsKey,
                queryFn: () =>
                    fetchJson<Supplement[]>('/api/health/supplements?all=true'),
            },
            {
                queryKey: queryKeys.health.supplementLogs.all,
                queryFn: () =>
                    fetchJson<SupplementLog[]>('/api/health/supplement-logs'),
            },
            {
                queryKey: queryKeys.health.presets.byType('supplement'),
                queryFn: () =>
                    fetchJson<SupplementPreset[]>(
                        '/api/health/presets?type=supplement'
                    ),
            },
        ],
    })

    return {
        supplements: supplements.data ?? [],
        logs: logs.data ?? [],
        presets: presets.data ?? [],
        loading: [supplements, logs, presets].some((q) => q.isPending),
    }
}
