'use client'

import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import { IconChevronRight, IconPencil } from '@tabler/icons-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import { colors, hardShadow } from '@/lib/colors'
import { labelSx, primaryButtonSx, secondaryButtonSx } from '@/lib/form-styles'
import type { UserPreferences } from '@/lib/types'
import { fetchUserPreferences, updateUserPreferences } from 'utils/api'
import { InitialsIcon, getContrastText } from 'utils/icons'

export default function SettingsPage() {
    const { data: session } = useSession()
    const [prefs, setPrefs] = useState<UserPreferences | null>(null)
    const [iconDialogOpen, setIconDialogOpen] = useState(false)

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

    const { name, email } = session.user

    const toggleGroupSx = {
        'border': `2px solid ${colors.primaryBlack}`,
        'borderRadius': 1,
        'boxShadow': `3px 4px 0px ${colors.primaryBlack}`,
        '& .MuiToggleButton-root': {
            'textTransform': 'none',
            'fontSize': 14,
            'border': 'none',
            'borderRight': `2px solid ${colors.primaryBlack}`,
            'color': colors.primaryBlack,
            '&:last-of-type': { borderRight: 'none' },
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
            {/* Profile icon + edit button */}
            <Box
                sx={{
                    position: 'relative',
                    cursor: 'pointer',
                }}
                onClick={() => setIconDialogOpen(true)}>
                <InitialsIcon
                    name={name ?? ''}
                    initials={prefs?.initials}
                    iconColor={prefs?.iconColor}
                    sx={{
                        width: 80,
                        height: 80,
                        fontSize: 32,
                        border: `2px solid ${colors.primaryBlack}`,
                        boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: colors.primaryWhite,
                        border: `1px solid ${colors.primaryBlack}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <IconPencil size={14} />
                </Box>
            </Box>
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

                {prefs?.isAdmin && (
                    <>
                        <Typography
                            sx={{
                                fontSize: 16,
                                fontWeight: 500,
                                color: colors.primaryBlack,
                                marginTop: 1,
                            }}>
                            Admin
                        </Typography>
                        <Link
                            href="/gustavo/settings/invite"
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
                                    Invite Users
                                </Typography>
                                <IconChevronRight
                                    size={18}
                                    color={colors.primaryBlack}
                                />
                            </Box>
                        </Link>
                    </>
                )}
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

            {prefs && (
                <IconCustomizeDialog
                    open={iconDialogOpen}
                    onClose={() => setIconDialogOpen(false)}
                    name={name ?? ''}
                    initials={prefs.initials}
                    iconColor={prefs.iconColor}
                    onSave={async (newInitials, newColor) => {
                        setPrefs((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      initials: newInitials,
                                      iconColor: newColor,
                                  }
                                : prev
                        )
                        await updateUserPreferences({
                            initials: newInitials,
                            iconColor: newColor,
                        })
                    }}
                />
            )}
        </Box>
    )
}

// ── Icon Customize Dialog ────────────────────────────────────────────────────

function deriveInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

type IconCustomizeDialogProps = {
    open: boolean
    onClose: () => void
    name: string
    initials: string | null
    iconColor: string | null
    onSave: (initials: string, color: string) => Promise<void>
}

function IconCustomizeDialog({
    open,
    onClose,
    name,
    initials,
    iconColor,
    onSave,
}: IconCustomizeDialogProps) {
    const [editInitials, setEditInitials] = useState(
        initials || deriveInitials(name)
    )
    const [editColor, setEditColor] = useState(iconColor || '#FBBC04')
    const [saving, setSaving] = useState(false)

    // Sync when dialog opens with new props
    useEffect(() => {
        if (open) {
            setEditInitials(initials || deriveInitials(name))
            setEditColor(iconColor || '#FBBC04')
        }
    }, [open, initials, iconColor, name])

    const handleSave = async () => {
        if (!editInitials.trim()) return
        setSaving(true)
        try {
            await onSave(editInitials.trim().toUpperCase(), editColor)
            onClose()
        } catch (err) {
            console.error('Failed to save icon settings:', err)
        } finally {
            setSaving(false)
        }
    }

    const contrastText = getContrastText(editColor)

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    ...hardShadow,
                    borderRadius: '8px',
                    backgroundColor: colors.primaryWhite,
                },
            }}>
            <DialogTitle
                sx={{
                    fontWeight: 600,
                    fontSize: 18,
                    color: colors.primaryBlack,
                    paddingBottom: 1,
                }}>
                Customize Icon
            </DialogTitle>
            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    paddingTop: '8px !important',
                }}>
                {/* Preview */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1.5,
                        paddingY: 2,
                    }}>
                    <InitialsIcon
                        name={name}
                        initials={editInitials || undefined}
                        iconColor={editColor}
                        sx={{
                            width: 80,
                            height: 80,
                            fontSize: 32,
                            border: `2px solid ${colors.primaryBlack}`,
                            boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        }}
                    />
                    <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', fontSize: 12 }}>
                        Preview
                    </Typography>
                </Box>

                {/* Initials + Color — single row, equal height */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: '0 0 90px', display: 'flex', flexDirection: 'column' }}>
                        <Typography sx={labelSx}>Initials</Typography>
                        <TextField
                            value={editInitials}
                            onChange={(e) => {
                                const val = e.target.value.toUpperCase()
                                if (val.length <= 3) setEditInitials(val)
                            }}
                            size="small"
                            fullWidth
                            inputProps={{
                                maxLength: 3,
                                style: {
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    letterSpacing: 2,
                                },
                            }}
                            sx={{
                                'flex': 1,
                                '& .MuiOutlinedInput-root': {
                                    'height': '100%',
                                    'border': `2px solid ${colors.primaryBlack}`,
                                    'borderRadius': 1,
                                    'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                    '& fieldset': { border: 'none' },
                                },
                            }}
                        />
                    </Box>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography sx={labelSx}>Color</Typography>
                        <Box
                            sx={{
                                flex: 1,
                                borderRadius: 1,
                                backgroundColor: editColor,
                                border: `2px solid ${colors.primaryBlack}`,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1,
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    color: contrastText,
                                    fontWeight: 600,
                                }}>
                                {editColor.toUpperCase()}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Color wheel */}
                <Box
                    sx={{
                        'display': 'flex',
                        'justifyContent': 'center',
                        '& .react-colorful': {
                            width: '100%',
                            height: 180,
                            borderRadius: 1,
                            border: `2px solid ${colors.primaryBlack}`,
                            boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        },
                        '& .react-colorful__saturation': {
                            borderRadius: '4px 4px 0 0',
                            borderBottom: `2px solid ${colors.primaryBlack}`,
                        },
                        '& .react-colorful__hue': {
                            borderRadius: '0 0 4px 4px',
                            height: 20,
                        },
                        '& .react-colorful__pointer': {
                            width: 20,
                            height: 20,
                            border: `2px solid ${colors.primaryBlack}`,
                        },
                    }}>
                    <HexColorPicker color={editColor} onChange={setEditColor} />
                </Box>

                {/* Actions */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1.5,
                        paddingTop: 1,
                        paddingBottom: 1,
                    }}>
                    <Button onClick={onClose} sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !editInitials.trim()}
                        sx={primaryButtonSx}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    )
}
