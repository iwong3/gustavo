'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'

const ERROR_MESSAGES: Record<string, string> = {
    OAuthSignin: 'There was a problem starting the sign-in process. Please try again.',
    OAuthCallback: 'There was a problem completing sign-in with Google. Please try again.',
    OAuthCreateAccount: 'There was a problem creating your account. Please try again.',
    AccessDenied: 'Your account is not authorized to access this app.',
    Default: 'Something went wrong. Please try again.',
}

export default function LoginClient({ error }: { error?: string }) {
    const [isLoading, setIsLoading] = useState(false)

    const errorMessage = error
        ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default)
        : null

    const handleSignIn = async () => {
        setIsLoading(true)
        await signIn('google', { callbackUrl: '/gustavo' })
        // Only reached if redirect fails
        setIsLoading(false)
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

            <Button
                variant="contained"
                size="large"
                onClick={handleSignIn}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}>
                {isLoading ? 'Signing in…' : 'Sign in with Google'}
            </Button>
        </Box>
    )
}
