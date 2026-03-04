import { Avatar, Box, Typography } from '@mui/material'

export default function OfflinePage() {
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
                textAlign: 'center',
            }}>
            <Avatar
                src="/gus-fring.png"
                alt="Gus Fring"
                sx={{
                    width: 160,
                    height: 160,
                    border: '4px solid',
                    borderColor: 'primary.main',
                }}
            />
            <Typography variant="h5" component="h1">
                You're offline
            </Typography>
            <Typography color="text.secondary">
                Check your connection and try again.
            </Typography>
        </Box>
    )
}
