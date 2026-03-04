'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
    Avatar,
    Box,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Typography,
} from '@mui/material'

export default function UserMenu() {
    const { data: session } = useSession()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

    if (!session?.user) return null

    const { name, email, image } = session.user
    const initials =
        name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase() ||
        email?.[0]?.toUpperCase() ||
        '?'

    return (
        <>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
                <Avatar src={image ?? undefined} sx={{ width: 36, height: 36 }}>
                    {!image && initials}
                </Avatar>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>
                <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
                    <Typography variant="subtitle2">{name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {email}
                    </Typography>
                </Box>
                <Divider />
                <MenuItem
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    sx={{ color: 'error.main' }}>
                    Sign out
                </MenuItem>
            </Menu>
        </>
    )
}
