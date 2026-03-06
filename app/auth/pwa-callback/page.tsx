'use client'

import { useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

// Landing page after OAuth completes in the popup/new-tab flow.
// Signals the PWA window (if accessible) then asks the user to close the tab.
export default function PwaCallbackPage() {
    useEffect(() => {
        try {
            if (window.opener && window.opener !== window) {
                window.opener.postMessage('auth-success', window.location.origin)
                setTimeout(() => window.close(), 300)
            }
        } catch {
            // window.opener may be inaccessible in some browsers — that's fine;
            // the PWA login page will detect the session via polling.
        }
    }, [])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                gap: 2,
                padding: 4,
            }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
            <Typography variant="h5">You&apos;re signed in!</Typography>
            <Typography color="text.secondary" textAlign="center">
                You can close this tab and return to the app.
            </Typography>
        </Box>
    )
}
