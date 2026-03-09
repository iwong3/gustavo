'use client'

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'
import { colors } from '@/lib/colors'
import {
    destructiveButtonSx,
    dialogPaperSx,
    secondaryButtonSx,
} from '@/lib/form-styles'

import type { Expense } from '@/lib/types'

type Props = {
    open: boolean
    expense: Expense | null
    onClose: () => void
    onConfirm: () => void
}

export default function DeleteExpenseDialog({ open, expense, onClose, onConfirm }: Props) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            slotProps={{ paper: { sx: dialogPaperSx } }}>
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    color: colors.primaryRed,
                    fontSize: 18,
                }}>
                Delete expense?
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ fontSize: 14 }}>
                    Are you sure you want to delete <strong>{expense?.name}</strong>?
                </Typography>
            </DialogContent>
            <DialogActions sx={{ padding: '8px 24px 16px' }}>
                <Button onClick={onClose} sx={secondaryButtonSx}>
                    Cancel
                </Button>
                <Button onClick={onConfirm} sx={destructiveButtonSx}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    )
}
