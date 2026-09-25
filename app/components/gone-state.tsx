'use client'

import { Box, Button, Typography } from '@mui/material'

import { cardSx, colors } from '@/lib/colors'
import { primaryButtonSx, secondaryButtonSx } from '@/lib/form-styles'

type Action = { label: string; onClick: () => void }

type Props = {
    /** "This expense was deleted" */
    title: string
    /** Optional second line of explanation. */
    detail?: string
    /** The way forward — e.g. "Back to expenses". */
    action: Action
    /** Optional second button — e.g. "Try again" on a load failure. */
    secondaryAction?: Action
}

/**
 * Page body for a record that isn't there (deleted, or failed to load) —
 * calm, not an error screen, and never a dead end: always offers a way
 * forward. Use instead of a bare "no longer exists" line.
 */
export function GoneState({ title, detail, action, secondaryAction }: Props) {
    return (
        <Box sx={{ width: '100%', maxWidth: 450, padding: 2 }}>
            <Box
                sx={{
                    ...cardSx,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    padding: 3,
                    textAlign: 'center',
                }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                    {title}
                </Typography>
                {detail && (
                    <Typography sx={{ fontSize: 14, color: colors.primaryBrown }}>
                        {detail}
                    </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1.5, marginTop: 1.5 }}>
                    {secondaryAction && (
                        <Button
                            onClick={secondaryAction.onClick}
                            sx={secondaryButtonSx}>
                            {secondaryAction.label}
                        </Button>
                    )}
                    <Button onClick={action.onClick} sx={primaryButtonSx}>
                        {action.label}
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}
