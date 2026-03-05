'use client'

import { useEffect, useState } from 'react'

// Renders nothing on the server, children on the client.
// Place this at a layout boundary to prevent hydration mismatches
// from client-only state (Zustand stores, browser APIs, etc.).
export function ClientOnly({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return null
    return <>{children}</>
}
