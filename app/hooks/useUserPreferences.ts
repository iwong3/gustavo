'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import type { UserPreferences } from '@/lib/types'
import { fetchUserPreferences, updateUserPreferences } from 'utils/api'

const KEY = queryKeys.users.preferences

/**
 * The signed-in user's preferences — cached and persisted like the rest of
 * the app's data, so Settings shows the last-known values instantly (even
 * on a cold open) and revalidates in the background.
 *
 * `update` applies the change to the cache immediately and saves it; if the
 * save fails the previous values come back and a toast says so.
 */
export function useUserPreferences() {
    const queryClient = useQueryClient()

    const query = useQuery({ queryKey: KEY, queryFn: fetchUserPreferences })

    const mutation = useMutation({
        mutationFn: updateUserPreferences,
        onMutate: async (update: Partial<UserPreferences>) => {
            // Don't let an in-flight fetch overwrite the optimistic value
            await queryClient.cancelQueries({ queryKey: KEY })
            const previous = queryClient.getQueryData<UserPreferences>(KEY)
            queryClient.setQueryData<UserPreferences>(KEY, (old) =>
                old ? { ...old, ...update } : old
            )
            return { previous }
        },
        onError: (_err, _update, context) => {
            if (context?.previous) queryClient.setQueryData(KEY, context.previous)
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
        meta: { errorToast: "Couldn't save that setting. Try again." },
    })

    return {
        prefs: query.data ?? null,
        update: mutation.mutate,
        updateAsync: mutation.mutateAsync,
    }
}

/** Read preferences outside a component (cache first, fetch if missing). */
export const fetchCachedUserPreferences = (queryClient: ReturnType<typeof useQueryClient>) =>
    queryClient.fetchQuery({ queryKey: KEY, queryFn: fetchUserPreferences, staleTime: 60_000 })
