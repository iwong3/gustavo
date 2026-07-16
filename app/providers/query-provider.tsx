'use client'

import { useState } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

// Bump when cached data shapes change (API responses / types) so old persisted
// caches are discarded on the next load instead of rehydrating a wrong shape.
const PERSIST_BUSTER = 'gustavo-cache-v1'

// How long a persisted cache may be restored on a cold open. Older than this and
// the whole blob is discarded, so a stale launch never shows day-old data —
// fresh data revalidates in the background regardless.
const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 // 24h

// IndexedDB-backed persister (via idb-keyval). Async so writes stay off the main
// thread, and far more headroom than localStorage's ~5MB cap — the trips list
// caches lean expense data for every trip, so the blob can get chunky.
function createIDBPersister() {
    return createAsyncStoragePersister({
        key: 'gustavo-rq-cache',
        throttleTime: 1000,
        storage: {
            getItem: (key) => get<string>(key).then((v) => v ?? null),
            setItem: (key, value) => set(key, value),
            removeItem: (key) => del(key),
        },
    })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Fresh for 1 min: while fresh, cached data is served
                        // instantly with no refetch. After that a revisit still
                        // renders instantly from cache and revalidates in the
                        // background (refetchOnWindowFocus catches shared edits).
                        staleTime: 60_000,
                        // Retain unused data in memory for the full persistence
                        // window so the dehydrated blob stays complete (a shorter
                        // gcTime would prune queries out of the persisted cache).
                        gcTime: PERSIST_MAX_AGE,
                        refetchOnWindowFocus: true,
                        refetchOnReconnect: true,
                        retry: 1,
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            })
    )
    const [persister] = useState(() => createIDBPersister())

    return (
        <PersistQueryClientProvider
            client={client}
            persistOptions={{
                persister,
                maxAge: PERSIST_MAX_AGE,
                buster: PERSIST_BUSTER,
                dehydrateOptions: {
                    shouldDehydrateQuery: (query) => {
                        // Only persist settled, successful queries...
                        if (query.state.status !== 'success') return false
                        // ...and skip volatile, session-scoped lookups that
                        // shouldn't survive a restart (Google Places results).
                        return query.queryKey[0] !== 'places'
                    },
                },
            }}>
            {children}
        </PersistQueryClientProvider>
    )
}
