'use client'

import { colors } from '@/lib/colors'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
    OAuthSignin:
        'There was a problem starting the sign-in process. Please try again.',
    OAuthCallback:
        'There was a problem completing sign-in with Google. Please try again.',
    OAuthCreateAccount:
        'There was a problem creating your account. Please try again.',
    AccessDenied: 'Access denied.',
    Default: 'Something went wrong. Please try again.',
}

function isStandaloneMode(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true
    )
}

export default function LoginClient({ error }: { error?: string }) {
    const [isLoading, setIsLoading] = useState(false)
    const [isWaiting, setIsWaiting] = useState(false)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const errorMessage = error
        ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
        : null

    // Listen for postMessage — works on Android/desktop where popup has an opener
    useEffect(() => {
        if (!isWaiting) return
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data === 'auth-success') window.location.reload()
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [isWaiting])

    // On iOS the SFSafariViewController can't auto-close (cross-origin redirect chain breaks
    // the opener relationship), so the user taps Done manually. When they do, the standalone
    // PWA comes back to the foreground and visibilitychange fires — check session immediately.
    // Poll every 3s as a fallback for cases where visibilitychange doesn't fire.
    useEffect(() => {
        if (!isWaiting) return

        const checkSession = async () => {
            const res = await fetch('/api/auth/session')
            const session = await res.json()
            if (session?.user) window.location.reload()
        }

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') checkSession()
        }

        document.addEventListener('visibilitychange', handleVisibility)
        pollRef.current = setInterval(checkSession, 1500)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility)
            clearInterval(pollRef.current!)
        }
    }, [isWaiting])

    const handleSignIn = async () => {
        if (!isStandaloneMode()) {
            setIsLoading(true)
            await signIn('google', { callbackUrl: '/gustavo' })
            // Only reached if redirect fails
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            // Fetch CSRF token, then ask Auth.js for the Google OAuth URL without redirecting.
            // We need the raw URL so we can open it with window.open — only an *external* URL
            // (accounts.google.com) triggers iOS's SFSafariViewController, which overlays the
            // standalone PWA without navigating it.  A same-origin relay page would navigate
            // the WebView itself, which breaks standalone mode once it hits Google's domain.
            const csrfRes = await fetch('/api/auth/csrf')
            const { csrfToken } = await csrfRes.json()

            const signinRes = await fetch('/api/auth/signin/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Auth-Return-Redirect': '1',
                },
                body: new URLSearchParams({
                    csrfToken,
                    // Must be absolute — relative paths get overridden by Auth.js's stored
                    // callbackUrl cookie (set when middleware redirected to /login).
                    callbackUrl: `${window.location.origin}/auth/pwa-callback`,
                }),
            })
            const { url: googleAuthUrl } = await signinRes.json()

            // Open the external Google URL — iOS opens this in SFSafariViewController,
            // leaving the standalone PWA untouched in the background.
            window.open(googleAuthUrl, '_blank')
            setIsWaiting(true)
        } catch {
            // Fallback: normal redirect (breaks standalone, but at least signs in)
            await signIn('google', { callbackUrl: '/gustavo' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        clearInterval(pollRef.current!)
        setIsWaiting(false)
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100dvh',
                gap: 3,
                padding: 4,
            }}>
            <Image
                src="/gus-fring-square.png"
                alt="Gustavo"
                width={120}
                height={120}
                style={{
                    borderRadius: '50%',
                    border: `4px solid ${colors.primaryWhite}`,
                    outline: `3px solid ${colors.primaryBlack}`,
                    boxShadow: `3px 4px 0px ${colors.primaryBlack}`,
                }}
                priority
            />
            <Typography variant="h5" component="h1">
                Welcome.
            </Typography>

            {errorMessage && (
                <Alert severity="error" sx={{ maxWidth: 360 }}>
                    {errorMessage}
                </Alert>
            )}

            {isWaiting ? (
                <>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                        }}>
                        <CircularProgress size={20} />
                        <Typography color="text.secondary">
                            Complete sign-in in the browser, then tap{' '}
                            <strong>Done</strong> to return.
                        </Typography>
                    </Box>
                    <Button variant="text" size="small" onClick={handleCancel}>
                        Cancel
                    </Button>
                </>
            ) : (
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleSignIn}
                    disabled={isLoading}
                    sx={{ width: 220, position: 'relative' }}>
                    <Box
                        component="span"
                        sx={{ visibility: isLoading ? 'hidden' : 'visible' }}>
                        Sign in with Google
                    </Box>
                    {isLoading && (
                        <CircularProgress
                            size={22}
                            color="inherit"
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    )}
                </Button>
            )}
        </Box>
    )
}
