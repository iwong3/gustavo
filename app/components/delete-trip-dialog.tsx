'use client'

import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material'

import type { TripSummary } from '@/lib/types'

type Props = {
    open: boolean
    trip: TripSummary | null
    onClose: () => void
    onConfirm: () => void
}

export default function DeleteTripDialog({ open, trip, onClose, onConfirm }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Delete trip?</DialogTitle>
            <DialogContent>
                <Typography>
                    Are you sure you want to delete <strong>{trip?.name}</strong>?
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
