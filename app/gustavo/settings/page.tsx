'use client'

import { signOut, useSession } from 'next-auth/react'
import { Avatar, Box, Button, Typography } from '@mui/material'

export default function SettingsPage() {
    const { data: session } = useSession()

    if (!session?.user) return null

    const { name, email, image } = session.user

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                paddingX: 3,
                paddingTop: 4,
                gap: 3,
            }}>
            <Avatar
                src={image ?? undefined}
                sx={{ width: 80, height: 80 }}
            />
            <Box sx={{ textAlign: 'center' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
                    {name}
                </Typography>
                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                    {email}
                </Typography>
            </Box>
            <Button
                variant="outlined"
                color="error"
                size="large"
                onClick={() => signOut({ callbackUrl: '/login' })}
                sx={{ marginTop: 2 }}>
                Sign out
            </Button>
        </Box>
    )
}
