'use client'

import { createContext, useContext } from 'react'

type RefreshContextValue = {
    onRefresh: () => void
}

const RefreshContext = createContext<RefreshContextValue | null>(null)

export function RefreshProvider({
    onRefresh,
    children,
}: {
    onRefresh: () => void
    children: React.ReactNode
}) {
    return (
        <RefreshContext.Provider value={{ onRefresh }}>
            {children}
        </RefreshContext.Provider>
    )
}

export function useRefresh(): RefreshContextValue {
    const ctx = useContext(RefreshContext)
    if (!ctx) {
        throw new Error('useRefresh must be used within RefreshProvider')
    }
    return ctx
}
