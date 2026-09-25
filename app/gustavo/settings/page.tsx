'use client'

import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material'
import { IconChevronRight, IconPencil } from '@tabler/icons-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import { cardSx, colors, hardShadow, pressIconSx, pressShadowSx } from '@/lib/colors'
import {
    destructiveButtonSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import type { UserPreferences } from '@/lib/types'
import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'
import { SlidingToggle } from 'components/sliding-toggle'
import { Circle, TextBone } from 'components/skeleton/bones'
import { useUserPreferences } from 'hooks/useUserPreferences'
import { InitialsIcon, getContrastText } from 'utils/icons'

// Section label — same as the debts / links section headings
const sectionLabelSx = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: colors.primaryBrown,
    marginTop: 1,
} as const

/** A tappable row that opens a settings sub-page — card style, like Home. */
function SettingsLinkRow({ href, label }: { href: string; label: string }) {
    return (
        <Box
            component={Link}
            href={href}
            sx={{
                ...cardSx,
                ...pressShadowSx,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingX: 2,
                paddingY: 1.5,
                textDecoration: 'none',
                color: colors.primaryBlack,
            }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{label}</Typography>
            <IconChevronRight size={18} color={colors.primaryBlack} />
        </Box>
    )
}

export default function SettingsPage() {
    const { data: session } = useSession()
    // Cached + persisted: the last-known values show instantly, even on a
    // cold open, and a fresh copy loads in the background
    const { prefs, update: updatePrefs, updateAsync } = useUserPreferences()
    const [iconDialogOpen, setIconDialogOpen] = useState(false)
    const [logoutOpen, setLogoutOpen] = useState(false)

    const handlePrefChange = (field: keyof UserPreferences, value: string) =>
        updatePrefs({ [field]: value } as Partial<UserPreferences>)

    // Render straight away — the session fills the name/email in when ready
    const name = session?.user?.name ?? null
    const email = session?.user?.email ?? null

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
                role="button"
                aria-label="Edit your icon"
                sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    ...pressIconSx,
                }}
                onClick={() => setIconDialogOpen(true)}>
                {/* Custom initials/colour live in prefs: placeholder until they
                    load, rather than name-derived initials that then swap */}
                {prefs ? (
                    <InitialsIcon
                        name={name ?? ''}
                        initials={prefs.initials}
                        iconColor={prefs.iconColor}
                        sx={{
                            width: 80,
                            height: 80,
                            fontSize: 32,
                            border: `2px solid ${colors.primaryBlack}`,
                            boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                        }}
                    />
                ) : (
                    <Circle size={80} />
                )}
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
                {name !== null ? (
                    <Typography sx={{ fontSize: 20, fontWeight: 600 }}>
                        {name}
                    </Typography>
                ) : (
                    <TextBone fontSize={20} width={140} sx={{ marginX: 'auto' }} />
                )}
                {email !== null ? (
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                        {email}
                    </Typography>
                ) : (
                    <TextBone fontSize={14} width={180} sx={{ marginX: 'auto' }} />
                )}
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
                <Typography sx={sectionLabelSx}>Trip</Typography>

                <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                        Default trip visibility
                    </Typography>
                    <SlidingToggle
                        loading={!prefs}
                        value={prefs?.defaultTripVisibility ?? ''}
                        options={[
                            {
                                value: 'participants',
                                label: 'Participants only',
                            },
                            { value: 'all_users', label: 'All users' },
                        ]}
                        onChange={(val) =>
                            handlePrefChange('defaultTripVisibility', val)
                        }
                    />
                </Box>

                <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                        Default participant role
                    </Typography>
                    <SlidingToggle
                        loading={!prefs}
                        value={prefs?.defaultParticipantRole ?? ''}
                        options={[
                            { value: 'viewer', label: 'Viewer' },
                            { value: 'editor', label: 'Editor' },
                            { value: 'admin', label: 'Admin' },
                        ]}
                        onChange={(val) =>
                            handlePrefChange('defaultParticipantRole', val)
                        }
                    />
                </Box>

                <SettingsLinkRow href="/gustavo/settings/categories" label="Manage categories" />

                <Typography sx={sectionLabelSx}>Health</Typography>

                <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography sx={{ ...labelSx, marginBottom: 0 }}>
                        Alphabet index side
                    </Typography>
                    <SlidingToggle
                        loading={!prefs}
                        value={prefs?.alphabetIndexSide ?? 'right'}
                        options={[
                            { value: 'left', label: 'Left' },
                            { value: 'right', label: 'Right' },
                        ]}
                        onChange={(val) =>
                            handlePrefChange('alphabetIndexSide', val)
                        }
                    />
                </Box>

                {prefs?.isAdmin && (
                    <>
                        <Typography sx={sectionLabelSx}>Admin</Typography>
                        <SettingsLinkRow href="/gustavo/settings/invite" label="Invite users" />
                    </>
                )}
            </Box>

            <Button
                onClick={() => setLogoutOpen(true)}
                sx={{ ...destructiveButtonSx, width: '100%', maxWidth: 300, height: 44, marginTop: 1 }}>
                Log out
            </Button>
            <ConfirmDeleteDialog
                open={logoutOpen}
                title="Log out?"
                confirmLabel="Log out"
                onClose={() => setLogoutOpen(false)}
                onConfirm={() => signOut({ callbackUrl: '/login' })}>
                You&apos;ll need to sign in with Google again.
            </ConfirmDeleteDialog>

            {/* Component gallery — dev only (the route 404s in production) */}
            {process.env.NODE_ENV === 'development' && (
                <Link
                    href="/dev/gallery"
                    style={{
                        alignSelf: 'center',
                        marginTop: 16,
                        fontSize: 13,
                        color: colors.primaryBrown,
                    }}>
                    Component gallery (dev)
                </Link>
            )}

            <Typography
                sx={{
                    fontSize: 11,
                    color: 'text.disabled',
                    marginTop: 'auto',
                    paddingBottom: 2,
                    alignSelf: 'flex-end',
                }}>
                Built{' '}
                {process.env.NEXT_PUBLIC_BUILD_TIME
                    ? new Date(
                          process.env.NEXT_PUBLIC_BUILD_TIME
                      ).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                      })
                    : 'dev'}{' '}
                · {process.env.NEXT_PUBLIC_COMMIT_HASH ?? '?'}
            </Typography>

            {prefs && (
                <IconCustomizeDialog
                    open={iconDialogOpen}
                    onClose={() => setIconDialogOpen(false)}
                    name={name ?? ''}
                    initials={prefs.initials}
                    iconColor={prefs.iconColor}
                    onSave={async (newInitials, newColor) => {
                        await updateAsync({
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
                    <Box
                        sx={{
                            flex: '0 0 90px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
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
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
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
