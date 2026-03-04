'use client'

import { Box, Button, Typography } from '@mui/material'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                gap: 3,
            }}>
            <Typography variant="h4" component="h1">
                Gustavo
            </Typography>
            <Typography color="text.secondary">
                Sign in to continue
            </Typography>
            <Button
                variant="contained"
                size="large"
                onClick={() => signIn('google', { callbackUrl: '/' })}>
                Sign in with Google
            </Button>
        </Box>
    )
}
