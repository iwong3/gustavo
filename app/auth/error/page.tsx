import { Alert, Box, Button, Typography } from '@mui/material'
import Link from 'next/link'

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
    AccessDenied: {
        title: 'Access denied',
        body: 'Your account is not authorized to access this app. Contact the app owner to request access.',
    },
    Configuration: {
        title: 'Configuration error',
        body: 'There is a problem with the server configuration. Please contact the app owner.',
    },
    Default: {
        title: 'Sign-in error',
        body: 'Something went wrong during sign-in. Please try again.',
    },
}

export default async function AuthErrorPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const { error } = await searchParams
    const { title, body } =
        ERROR_MESSAGES[error ?? ''] ?? ERROR_MESSAGES.Default

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
            <Alert severity="error" sx={{ maxWidth: 400 }}>
                <Typography variant="subtitle2" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2">{body}</Typography>
            </Alert>
            <Button component={Link} href="/login" variant="outlined">
                Back to sign in
            </Button>
        </Box>
    )
}
