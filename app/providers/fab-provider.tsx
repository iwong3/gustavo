'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type FabContextType = {
    onClick: (() => void) | null
    setFab: (onClick: (() => void) | null) => void
}

const FabContext = createContext<FabContextType>({ onClick: null, setFab: () => {} })

export function FabProvider({ children }: { children: React.ReactNode }) {
    const [onClick, setOnClick] = useState<(() => void) | null>(null)
    const setFab = useCallback((fn: (() => void) | null) => setOnClick(() => fn), [])
    return <FabContext.Provider value={{ onClick, setFab }}>{children}</FabContext.Provider>
}

export function useFab() {
    return useContext(FabContext)
}

export function useRegisterFab(onClick: (() => void) | null) {
    const { setFab } = useFab()
    useEffect(() => {
        setFab(onClick)
        return () => setFab(null)
    }, [onClick, setFab])
}
