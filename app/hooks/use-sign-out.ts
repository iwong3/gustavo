'use client'

import { useQueryClient } from '@tanstack/react-query'
import { signOut } from 'next-auth/react'
import { useCallback } from 'react'

import { clearPersistedCache } from 'utils/query-persist'

/**
 * Sign out and wipe this device's cached data (in memory + IndexedDB), so
 * the next person to sign in never sees it. Use this, never a bare
 * `signOut()`. The login page also wipes on mount, covering expired or
 * revoked sessions that never pass through here.
 */
export function useSignOut() {
    const queryClient = useQueryClient()
    return useCallback(async () => {
        queryClient.clear()
        await clearPersistedCache()
        await signOut({ callbackUrl: '/login' })
    }, [queryClient])
}
