'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import type { TripSummary } from '@/lib/types'
import { fetchTripBySlug } from 'utils/api'

/**
 * Trip-by-slug query, shared by the trip layout and the header controls so
 * both read one cache entry (one fetch for both).
 *
 * Seeds `placeholderData` from the already-loaded trips list: the list carries
 * the full trip object (a superset of the by-slug shape), so entering a trip
 * paints its chrome (header name, tool pill, trip context) instantly instead of
 * waiting on a fresh fetch. The canonical row still loads in the background and
 * replaces the placeholder. When the list isn't cached (cold deep-link), there
 * is no placeholder and it fetches normally.
 */
export function useTripBySlug(
    slug: string | null | undefined,
    options?: { enabled?: boolean }
) {
    const queryClient = useQueryClient()
    const enabled = (options?.enabled ?? true) && Boolean(slug)

    return useQuery({
        queryKey: queryKeys.trips.bySlug(slug ?? ''),
        queryFn: () => fetchTripBySlug(slug!),
        enabled,
        placeholderData: () => {
            const list = queryClient.getQueryData<TripSummary[]>(
                queryKeys.trips.list()
            )
            return list?.find((t) => t.slug === slug)
        },
    })
}
