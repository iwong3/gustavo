'use client'

import { useEffect, useState } from 'react'
import { Snackbar, Button, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function PWAUpdatePrompt() {
    const [updateReady, setUpdateReady] = useState(false)

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        const handleControllerChange = () => {
            setUpdateReady(true)
        }

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        }
    }, [])

    return (
        <Snackbar
            open={updateReady}
            message="New version available"
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            action={
                <>
                    <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                        Reload
                    </Button>
                    <IconButton size="small" color="inherit" onClick={() => setUpdateReady(false)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </>
            }
        />
    )
}
