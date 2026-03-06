'use client'

import { useEffect, useState } from 'react'
import { Snackbar } from '@mui/material'

export default function PWAUpdatePrompt() {
    const [updateReady, setUpdateReady] = useState(false)

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        const handleControllerChange = () => {
            setUpdateReady(true)
            setTimeout(() => window.location.reload(), 1500)
        }

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        }
    }, [])

    return (
        <Snackbar
            open={updateReady}
            message="Updating to new version…"
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
    )
}
