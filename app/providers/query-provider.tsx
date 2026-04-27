'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        gcTime: 5 * 60_000,
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

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
