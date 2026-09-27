'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type SetFab = (onClick: (() => void) | null) => void

// Two contexts: the handler (read only by the shell's FAB) and the stable
// setter (read by pages). One context would re-render every registering page
// whenever the FAB changes — i.e. a second full page render right after the
// page's own mount, or after it hides the FAB (the Expenses refine toggle).
const FabClickContext = createContext<(() => void) | null>(null)
const SetFabContext = createContext<SetFab>(() => {})

export function FabProvider({ children }: { children: React.ReactNode }) {
    const [onClick, setOnClick] = useState<(() => void) | null>(null)
    const setFab = useCallback<SetFab>((fn) => setOnClick(() => fn), [])
    return (
        <SetFabContext.Provider value={setFab}>
            <FabClickContext.Provider value={onClick}>{children}</FabClickContext.Provider>
        </SetFabContext.Provider>
    )
}

/** The current FAB handler — for the shell's FAB itself. */
export function useFabClick() {
    return useContext(FabClickContext)
}

export function useRegisterFab(onClick: (() => void) | null) {
    const setFab = useContext(SetFabContext)
    useEffect(() => {
        setFab(onClick)
        return () => setFab(null)
    }, [onClick, setFab])
}
