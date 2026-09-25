'use client'

import { useState } from 'react'
import { Box, TextField, Typography } from '@mui/material'

import { ConfirmDeleteDialog } from 'components/confirm-delete-dialog'
import { fieldSx, labelSx } from '@/lib/form-styles'

import type { TripSummary } from '@/lib/types'

type Props = {
    open: boolean
    trip: TripSummary | null
    onClose: () => void
    onConfirm: () => void
    /** True while the delete request is in flight. */
    busy?: boolean
    /** Why the last attempt failed — shown inline. */
    error?: string | null
}

export default function DeleteTripDialog({
    open,
    trip,
    onClose,
    onConfirm,
    busy,
    error,
}: Props) {
    const [confirmText, setConfirmText] = useState('')
    // Clear the field each time the dialog opens (adjust-state-on-prop-change,
    // not an effect)
    const [wasOpen, setWasOpen] = useState(open)
    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) setConfirmText('')
    }

    const tripName = trip?.name ?? ''
    const isConfirmed = confirmText === tripName

    return (
        <ConfirmDeleteDialog
            open={open}
            title="Delete trip?"
            onClose={onClose}
            onConfirm={onConfirm}
            busy={busy}
            error={error}
            confirmDisabled={!isConfirmed}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                    This will delete <strong>{tripName}</strong> and all its
                    expenses. This action cannot be undone.
                </Box>
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
                        disabled={busy}
                        placeholder={tripName}
                        sx={fieldSx}
                    />
                </Box>
            </Box>
        </ConfirmDeleteDialog>
    )
}
