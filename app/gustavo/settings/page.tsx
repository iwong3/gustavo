'use client'

import {
    Avatar,
    Box,
    Button,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { IconChevronRight } from '@tabler/icons-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { colors } from '@/lib/colors'
import type { UserPreferences } from '@/lib/types'
import { fetchUserPreferences, updateUserPreferences } from 'utils/api'

export default function SettingsPage() {
    const { data: session } = useSession()
    const [prefs, setPrefs] = useState<UserPreferences | null>(null)

    useEffect(() => {
        fetchUserPreferences()
            .then(setPrefs)
            .catch(() => {})
    }, [])

    const handlePrefChange = useCallback(
        async (field: keyof UserPreferences, value: string) => {
            const update = { [field]: value } as Partial<UserPreferences>
            setPrefs((prev) => (prev ? { ...prev, ...update } : prev))
            try {
                await updateUserPreferences(update)
            } catch (err) {
                console.error('Failed to update preference:', err)
            }
        },
        []
    )

    if (!session?.user) return null

    const { name, email, image } = session.user

    const toggleGroupSx = {
        '& .MuiToggleButton-root': {
            'textTransform': 'none',
            'fontSize': 14,
            'border': `1px solid ${colors.primaryBlack}`,
            'color': colors.primaryBlack,
            '&.Mui-selected': {
                'backgroundColor': colors.primaryYellow,
                'fontWeight': 600,
                '&:hover': { backgroundColor: colors.primaryYellow },
            },
        },
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                minHeight: '100%',
                paddingX: 3,
                paddingTop: 4,
                gap: 3,
            }}>
            <Avatar src={image ?? undefined} sx={{ width: 80, height: 80 }} />
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
                    gap: 2,
                    width: '100%',
                    maxWidth: 300,
                    marginTop: 1,
                }}>
                <Typography
                    sx={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: colors.primaryBlack,
                    }}>
                    Trip
                </Typography>

                <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography
                        variant="body2"
                        sx={{ color: colors.primaryBlack }}>
                        Default trip visibility
                    </Typography>
                    <ToggleButtonGroup
                        value={prefs?.defaultTripVisibility ?? ''}
                        exclusive
                        onChange={(_, val) => {
                            if (val)
                                handlePrefChange('defaultTripVisibility', val)
                        }}
                        size="small"
                        fullWidth
                        sx={toggleGroupSx}>
                        <ToggleButton value="participants">
                            Participants only
                        </ToggleButton>
                        <ToggleButton value="all_users">All users</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography
                        variant="body2"
                        sx={{ color: colors.primaryBlack }}>
                        Default participant role
                    </Typography>
                    <ToggleButtonGroup
                        value={prefs?.defaultParticipantRole ?? ''}
                        exclusive
                        onChange={(_, val) => {
                            if (val)
                                handlePrefChange('defaultParticipantRole', val)
                        }}
                        size="small"
                        fullWidth
                        sx={toggleGroupSx}>
                        <ToggleButton value="viewer">Viewer</ToggleButton>
                        <ToggleButton value="editor">Editor</ToggleButton>
                        <ToggleButton value="admin">Admin</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Link
                    href="/gustavo/settings/categories"
                    style={{ textDecoration: 'none' }}>
                    <Box
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'justifyContent': 'space-between',
                            'paddingY': 1,
                            'borderRadius': 1,
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                        }}>
                        <Typography
                            sx={{ fontSize: 14, color: colors.primaryBlack }}>
                            Manage Categories
                        </Typography>
                        <IconChevronRight
                            size={18}
                            color={colors.primaryBlack}
                        />
                    </Box>
                </Link>

                <Link
                    href="/gustavo/settings/locations"
                    style={{ textDecoration: 'none' }}>
                    <Box
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'justifyContent': 'space-between',
                            'paddingY': 1,
                            'borderRadius': 1,
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                        }}>
                        <Typography
                            sx={{ fontSize: 14, color: colors.primaryBlack }}>
                            Manage Locations
                        </Typography>
                        <IconChevronRight
                            size={18}
                            color={colors.primaryBlack}
                        />
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

            <Typography
                sx={{
                    fontSize: 11,
                    color: 'text.disabled',
                    marginTop: 'auto',
                    paddingBottom: 2,
                    alignSelf: 'flex-end',
                }}>
                Version: {process.env.NEXT_PUBLIC_COMMIT_HASH ?? 'dev'}
            </Typography>
        </Box>
    )
}
