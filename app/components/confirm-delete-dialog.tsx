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
    confirmLabel?: string
}

/**
 * The standard delete confirmation — same look as the expense/trip delete
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
    confirmLabel = 'Delete',
}: Props) {
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
                    color: colors.primaryRed,
                    fontSize: 18,
                }}>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: 14 }}>{children}</Typography>
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
                    disabled={busy}
                    sx={destructiveButtonSx}>
                    {busy ? 'Deleting...' : confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
