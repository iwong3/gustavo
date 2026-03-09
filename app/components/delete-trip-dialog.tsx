'use client'

import { useEffect, useState } from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material'
import { colors } from '@/lib/colors'
import {
    destructiveButtonSx,
    dialogPaperSx,
    fieldSx,
    labelSx,
    secondaryButtonSx,
} from '@/lib/form-styles'

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
                Delete trip?
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontSize: 14 }}>
                    This will delete <strong>{tripName}</strong> and all its expenses.
                    This action cannot be undone.
                </Typography>
                <Box>
                    <Typography sx={{ ...labelSx, marginBottom: 0.5 }}>
                        Type <strong>{tripName}</strong> to confirm:
                    </Typography>
                    <TextField
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        size="small"
                        fullWidth
                        autoFocus
                        placeholder={tripName}
                        sx={fieldSx}
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ padding: '8px 24px 16px' }}>
                <Button onClick={onClose} sx={secondaryButtonSx}>
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={!isConfirmed}
                    sx={destructiveButtonSx}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    )
}
