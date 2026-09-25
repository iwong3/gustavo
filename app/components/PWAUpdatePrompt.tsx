'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Snackbar } from '@mui/material'

// A form (page or drawer) is on screen — reloading now would lose its input
const isFormOpen = () => !!document.querySelector('[data-form-open]')

/**
 * When a new service worker takes control, reload onto the new version —
 * but never while a form is open. The reload waits until you leave the form
 * (checked on every route change) or the app goes to the background.
 */
export default function PWAUpdatePrompt() {
    const pathname = usePathname()
    const [reloadOwed, setReloadOwed] = useState(false)
    const [updating, setUpdating] = useState(false)
    const reloadScheduledRef = useRef(false)

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        const handleControllerChange = () => setReloadOwed(true)

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        }
    }, [])

    // Re-runs on each route change while a reload is owed
    useEffect(() => {
        if (!reloadOwed || reloadScheduledRef.current) return

        if (!isFormOpen()) {
            reloadScheduledRef.current = true
            setTimeout(() => setUpdating(true), 0)
            setTimeout(() => window.location.reload(), 1500)
            return
        }

        // Backgrounded with no form open: reload unseen
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && !isFormOpen()) {
                window.location.reload()
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () =>
            document.removeEventListener('visibilitychange', onVisibilityChange)
    }, [reloadOwed, pathname])

    return (
        <Snackbar
            open={updating}
            message="Updating to new version…"
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
    )
}
