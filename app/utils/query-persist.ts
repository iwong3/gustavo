import { del } from 'idb-keyval'

/** IndexedDB key holding the persisted react-query cache (providers/query-provider). */
export const PERSIST_KEY = 'gustavo-rq-cache'

/**
 * Delete the persisted query cache. It holds the signed-in user's data and
 * isn't keyed by user, so it must go on sign-out — otherwise the next person
 * to sign in on this device sees the previous user's trips/health data until
 * each query refetches.
 */
export async function clearPersistedCache(): Promise<void> {
    try {
        await del(PERSIST_KEY)
    } catch {
        // IndexedDB unavailable (private mode) — nothing was persisted
    }
}
