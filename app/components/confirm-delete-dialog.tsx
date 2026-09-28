'use client'

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'
import type { ReactNode } from 'react'

import { colors } from '@/lib/colors'
import {
    destructiveButtonSx,
    dialogPaperSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'

type Props = {
    open: boolean
    /** "Delete workout?" */
    title: string
    /** "Are you sure you want to delete <b>Bench day</b>?" */
    children: ReactNode
    onClose: () => void
    onConfirm: () => void
    /** True while the delete request is in flight. */
    busy?: boolean
    /** Why the last attempt failed — shown inline; the dialog stays open. */
    error?: string | null
    /** Keep Delete disabled (e.g. until a type-to-confirm field matches). */
    confirmDisabled?: boolean
    confirmLabel?: string
    /** Shown on the confirm button while busy. */
    busyLabel?: string
    /** 'constructive' for a non-destructive confirm (e.g. Restore): black
     *  title, primary button instead of red. */
    tone?: 'destructive' | 'constructive'
}

/**
 * The standard delete confirmation (also a plain confirm via tone) — same look as the expense/trip delete
 * dialogs (neo-brutalist paper, Cancel | red Delete). Deletes stay dialogs
 * even though forms are pages: it's a one-tap confirmation, not data entry.
 */
export function ConfirmDeleteDialog({
    open,
    title,
    children,
    onClose,
    onConfirm,
    busy = false,
    error = null,
    confirmDisabled = false,
    confirmLabel = 'Delete',
    busyLabel = 'Deleting...',
    tone = 'destructive',
}: Props) {
    const destructive = tone === 'destructive'
    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: dialogPaperSx } }}>
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    color: destructive ? colors.primaryRed : colors.primaryBlack,
                    fontSize: 18,
                }}>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography component="div" sx={{ fontSize: 14 }}>
                    {children}
                </Typography>
                {error && (
                    <Typography
                        role="alert"
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: colors.primaryRed,
                            marginTop: 1.5,
                        }}>
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions
                sx={{
                    padding: '8px 24px 16px',
                    justifyContent: 'space-between',
                }}>
                <Button
                    onClick={onClose}
                    disabled={busy}
                    sx={secondaryButtonSx}>
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={busy || confirmDisabled}
                    sx={destructive ? destructiveButtonSx : primaryButtonSx}>
                    {busy ? busyLabel : confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
