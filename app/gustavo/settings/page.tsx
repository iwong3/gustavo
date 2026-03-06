'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { Avatar, Box, Button, Typography } from '@mui/material'
import { IconCategory, IconMapPin } from '@tabler/icons-react'

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
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    width: '100%',
                    maxWidth: 300,
                    marginTop: 1,
                }}>
                <Link href="/gustavo/settings/categories" style={{ textDecoration: 'none' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            padding: 1.5,
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                        }}>
                        <IconCategory size={20} />
                        <Typography sx={{ fontSize: 16, color: 'text.primary' }}>
                            Manage Categories
                        </Typography>
                    </Box>
                </Link>
                <Link href="/gustavo/settings/locations" style={{ textDecoration: 'none' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            padding: 1.5,
                            borderRadius: 1,
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                        }}>
                        <IconMapPin size={20} />
                        <Typography sx={{ fontSize: 16, color: 'text.primary' }}>
                            Manage Locations
                        </Typography>
                    </Box>
                </Link>
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
