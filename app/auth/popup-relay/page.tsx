'use client'

import { useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Box, CircularProgress } from '@mui/material'

// Opened in a new tab by the PWA login page to keep the PWA in standalone mode.
// Immediately triggers the Google OAuth flow with a callback to /auth/pwa-callback.
export default function PopupRelayPage() {
    useEffect(() => {
        signIn('google', { callbackUrl: '/auth/pwa-callback' })
    }, [])

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
            }}>
            <CircularProgress />
        </Box>
    )
}
