'use client'

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'

import type { Expense } from '@/lib/types'

type Props = {
    open: boolean
    expense: Expense | null
    onClose: () => void
    onConfirm: () => void
}

export default function DeleteExpenseDialog({ open, expense, onClose, onConfirm }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Delete expense?</DialogTitle>
            <DialogContent>
                <Typography>
                    Are you sure you want to delete <strong>{expense?.name}</strong>?
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error">
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    )
}
