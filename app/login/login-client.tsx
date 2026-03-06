'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'

const ERROR_MESSAGES: Record<string, string> = {
    OAuthSignin: 'There was a problem starting the sign-in process. Please try again.',
    OAuthCallback: 'There was a problem completing sign-in with Google. Please try again.',
    OAuthCreateAccount: 'There was a problem creating your account. Please try again.',
    AccessDenied: 'Your account is not authorized to access this app.',
    Default: 'Something went wrong. Please try again.',
}

function isStandaloneMode(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true
    )
}

export default function LoginClient({ error }: { error?: string }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isWaiting, setIsWaiting] = useState(false)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const errorMessage = error
        ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
        : null

    // Listen for postMessage from the OAuth tab (works on Android/desktop Chrome)
    useEffect(() => {
        if (!isWaiting) return
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data === 'auth-success') router.push('/gustavo')
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [isWaiting, router])

    // Poll the session endpoint as a fallback (necessary on iOS where window.opener is null)
    useEffect(() => {
        if (!isWaiting) return
        pollRef.current = setInterval(async () => {
            const res = await fetch('/api/auth/session')
            const session = await res.json()
            if (session?.user) {
                clearInterval(pollRef.current!)
                router.push('/gustavo')
            }
        }, 2000)
        return () => clearInterval(pollRef.current!)
    }, [isWaiting, router])

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
                    callbackUrl: '/auth/pwa-callback',
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
                minHeight: '100vh',
                gap: 3,
                padding: 4,
            }}>
            <Typography variant="h4" component="h1">
                Gustavo
            </Typography>
            <Typography color="text.secondary">Sign in to continue</Typography>

            {errorMessage && (
                <Alert severity="error" sx={{ maxWidth: 360 }}>
                    {errorMessage}
                </Alert>
            )}

            {isWaiting ? (
                <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CircularProgress size={20} />
                        <Typography color="text.secondary">
                            Waiting for sign-in… complete it in the browser tab that just opened.
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
                    startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}>
                    {isLoading ? 'Signing in…' : 'Sign in with Google'}
                </Button>
            )}
        </Box>
    )
}
