'use client'

import { useEffect, useState } from 'react'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material'
import { colors } from '@/lib/colors'

import type { TripSummary } from '@/lib/types'

type Props = {
    open: boolean
    trip: TripSummary | null
    onClose: () => void
    onConfirm: () => void
}

export default function DeleteTripDialog({ open, trip, onClose, onConfirm }: Props) {
    const [confirmText, setConfirmText] = useState('')

    useEffect(() => {
        if (open) setConfirmText('')
    }, [open])

    const tripName = trip?.name ?? ''
    const isConfirmed = confirmText === tripName

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ color: colors.primaryRed }}>Delete trip?</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography>
                    This will delete <strong>{tripName}</strong> and all its expenses.
                    This action cannot be undone.
                </Typography>
                <Typography variant="body2">
                    Type <strong>{tripName}</strong> to confirm:
                </Typography>
                <TextField
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    size="small"
                    fullWidth
                    autoFocus
                    placeholder={tripName}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error"
                    disabled={!isConfirmed}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    )
}
