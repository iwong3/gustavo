import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import type { Expense } from '@/lib/types'

// Direct edits to a trip's cached expense list, so saves and deletes show
// up the moment they happen instead of when the background refetch lands.
// Ids compared as strings (BIGINTs arrive as strings at runtime).

/**
 * Remove an expense from the cached list. Returns an undo that puts the
 * previous list back (for when the delete request then fails).
 */
export function removeCachedExpense(
    queryClient: QueryClient,
    tripId: number,
    expenseId: number
): () => void {
    const key = queryKeys.trips.expenses(tripId)
    const previous = queryClient.getQueryData<Expense[]>(key)
    queryClient.setQueryData<Expense[]>(key, (old) =>
        old?.filter((e) => String(e.id) !== String(expenseId))
    )
    return () => queryClient.setQueryData(key, previous)
}
