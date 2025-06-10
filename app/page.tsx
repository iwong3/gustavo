'use client'

import { Box, Button, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import PWAInstallButton from './components/PWAInstallButton'

export default function HomePage() {
    const router = useRouter()

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: 4,
                gap: 3,
            }}>
            <Typography variant="h3" component="h1" gutterBottom>
                Welcome to the App Suite
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
                Choose a feature to get started:
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    minWidth: 200,
                }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push('/gustavo')}>
                    Gustavo - Spending Tracker
                </Button>
                {/* Add future feature buttons here */}
                {/* 
                <Button 
                    variant="contained" 
                    size="large"
                    onClick={() => router.push('/feature2')}
                >
                    Feature 2
                </Button>
                */}
            </Box>

            {/* PWA Install Button */}
            <Box sx={{ mt: 2 }}>
                <PWAInstallButton variant="outlined" size="large" fullWidth />
            </Box>
        </Box>
    )
}
