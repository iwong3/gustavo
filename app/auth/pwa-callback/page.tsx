'use client'

import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

// Landing page after OAuth completes in the popup/new-tab flow.
// On iOS, this runs inside a SFSafariViewController opened by window.open() —
// window.close() will dismiss it and return to the standalone PWA.
// On Android/desktop, window.opener.postMessage signals the PWA and closes the popup.
export default function PwaCallbackPage() {
    const [showFallback, setShowFallback] = useState(false)

    useEffect(() => {
        // Signal opener if accessible (Android/desktop popup)
        try {
            if (window.opener && window.opener !== window) {
                window.opener.postMessage('auth-success', window.location.origin)
            }
        } catch { /* ignore cross-origin errors */ }

        // Always attempt to close — this is the primary mechanism for iOS
        // (SFSafariViewController opened via window.open responds to window.close())
        const closeTimer = setTimeout(() => {
            window.close()
            // If still open after 600ms, window.close() didn't work — show fallback
            setTimeout(() => setShowFallback(true), 600)
        }, 400)

        return () => clearTimeout(closeTimer)
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
            {showFallback ? (
                <>
                    <Typography color="text.secondary" sx={{ maxWidth: 320 }}>
                        Press the <strong>Home button</strong>, then tap the{' '}
                        <strong>Gustavo icon</strong> on your home screen to return to the app.
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={() => window.close()}>
                        Close this window
                    </Button>
                </>
            ) : (
                <Typography color="text.secondary">Returning to the app…</Typography>
            )}
        </Box>
    )
}
