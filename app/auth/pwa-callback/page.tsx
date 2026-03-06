'use client'

import { useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

// Shown inside the SFSafariViewController after OAuth completes.
// window.close() won't work here — the VC navigated through cross-origin pages
// (Google → our callback), which breaks the opener relationship.
// The user must tap Done manually; the standalone PWA detects the return via visibilitychange.
// On Android/desktop the popup does have an opener so we can signal + close it.
export default function PwaCallbackPage() {
    useEffect(() => {
        try {
            if (window.opener && window.opener !== window) {
                window.opener.postMessage('auth-success', window.location.origin)
                setTimeout(() => window.close(), 300)
            }
        } catch { /* ignore */ }
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
                textAlign: 'center',
            }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
            <Typography variant="h5">You&apos;re signed in!</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 300 }}>
                Tap <strong>Done</strong> in the top-left corner to return to the app.
            </Typography>
        </Box>
    )
}
