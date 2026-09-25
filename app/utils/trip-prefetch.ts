import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import { fetchExpenses, fetchSettlements } from 'utils/api'

/**
 * Warm a trip's data before it's opened (its boarding pass scrolled into
 * view), so the trip layout's loading gate is usually already satisfied on
 * tap. The trip row itself comes from the trips list (useTripBySlug seeds
 * from it). No-op for data that's still fresh.
 */
export function prefetchTripData(queryClient: QueryClient, tripId: number) {
    queryClient.prefetchQuery({
        queryKey: queryKeys.trips.expenses(tripId),
        queryFn: () => fetchExpenses(tripId),
    })
    queryClient.prefetchQuery({
        queryKey: queryKeys.trips.settlements(tripId),
        queryFn: () => fetchSettlements(tripId),
    })
}
