'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    TextField,
    Typography,
} from '@mui/material'
import { IconCheck, IconPlus, IconTrash, IconX } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'
import { primaryButtonSx, secondaryButtonSx } from '@/lib/form-styles'
import {
    fetchAllowedEmails,
    addAllowedEmail,
    removeAllowedEmail,
} from 'utils/api'
import type { AllowedEmail } from 'utils/api'

export default function InviteUsersPage() {
    const [entries, setEntries] = useState<AllowedEmail[]>([])
    const [loading, setLoading] = useState(true)
    const [newEmail, setNewEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<AllowedEmail | null>(null)

    const load = useCallback(async () => {
        try {
            const data = await fetchAllowedEmails()
            setEntries(data)
        } catch {
            setError('Failed to load allowlist')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const handleAdd = async () => {
        const email = newEmail.trim().toLowerCase()
        if (!email) return
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address')
            return
        }
        setAdding(true)
        setError(null)
        try {
            const entry = await addAllowedEmail(email)
            setEntries((prev) => [entry, ...prev])
            setNewEmail('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add')
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            await removeAllowedEmail(deleteTarget.id)
            setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove')
        } finally {
            setDeleteTarget(null)
        }
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 400,
                paddingX: 3,
                paddingTop: 4,
                gap: 2,
                marginX: 'auto',
            }}>
            <Typography
                sx={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: colors.primaryBlack,
                }}>
                Invite Users
            </Typography>
            <Typography
                sx={{
                    fontSize: 13,
                    color: 'text.secondary',
                    marginBottom: 1,
                }}>
                Add a Google email to allow someone to sign in. They&apos;ll get
                an account automatically on first login.
            </Typography>

            {/* Add email form */}
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    value={newEmail}
                    onChange={(e) => {
                        setNewEmail(e.target.value)
                        setError(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd()
                    }}
                    placeholder="email@gmail.com"
                    type="email"
                    autoComplete="off"
                    slotProps={{ htmlInput: { maxLength: 254 } }}
                    size="small"
                    fullWidth
                    disabled={adding}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            'border': `1px solid ${colors.primaryBlack}`,
                            'borderRadius': 1,
                            'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                            'backgroundColor': colors.primaryWhite,
                            'fontSize': 14,
                            '& fieldset': { border: 'none' },
                        },
                    }}
                />
                <Button
                    onClick={handleAdd}
                    disabled={adding || !newEmail.trim()}
                    sx={{
                        ...primaryButtonSx,
                        minWidth: 0,
                        width: 40,
                        padding: 0,
                        flexShrink: 0,
                        aspectRatio: '1 / 1',
                    }}>
                    <IconPlus size={18} />
                </Button>
            </Box>

            {error && (
                <Typography
                    sx={{
                        fontSize: 12,
                        color: colors.primaryRed,
                        fontWeight: 500,
                    }}>
                    {error}
                </Typography>
            )}

            {/* Email list */}
            {loading ? (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    Loading...
                </Typography>
            ) : (
                <List disablePadding>
                    {entries.map((entry) => (
                        <ListItem
                            key={entry.id}
                            disablePadding
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingY: 1,
                                borderBottom: `1px solid rgba(0,0,0,0.08)`,
                            }}>
                            <Box>
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        color: colors.primaryBlack,
                                        fontWeight: 500,
                                    }}>
                                    {entry.email}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        color: 'text.secondary',
                                    }}>
                                    {entry.hasAccount
                                        ? `Signed up as ${entry.userName}`
                                        : 'Invited — not yet signed in'}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {entry.hasAccount && (
                                    <IconCheck
                                        size={16}
                                        color={colors.primaryGreen}
                                    />
                                )}
                                <IconButton
                                    size="small"
                                    onClick={() => setDeleteTarget(entry)}
                                    sx={{ color: colors.primaryRed }}>
                                    <IconTrash size={16} />
                                </IconButton>
                            </Box>
                        </ListItem>
                    ))}
                </List>
            )}

            {/* Delete confirmation dialog */}
            <Dialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                PaperProps={{
                    sx: {
                        ...hardShadow,
                        borderRadius: '8px',
                        backgroundColor: colors.primaryWhite,
                    },
                }}>
                <DialogTitle sx={{ fontWeight: 600, fontSize: 16 }}>
                    Remove Access
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: 14 }}>
                        Remove <strong>{deleteTarget?.email}</strong> from the
                        allowlist? They won&apos;t be able to sign in anymore.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ paddingX: 3, paddingBottom: 2 }}>
                    <Button
                        onClick={() => setDeleteTarget(null)}
                        sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        sx={{
                            ...primaryButtonSx,
                            backgroundColor: colors.primaryRed,
                            color: colors.primaryWhite,
                        }}>
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
