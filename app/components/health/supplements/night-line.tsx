'use client'

import { Box } from '@mui/material'
import { IconMoon } from '@tabler/icons-react'

import { colors, pressTextSx } from '@/lib/colors'

export type NightNote = {
    /** e.g. "Counting for Monday until 6 AM." */
    text: string
    /** The switch, e.g. "Log for Tue". */
    action: string
    onAction: () => void
}

/** Late-night explainer: which day the taps count for, and a switch. Blue
 *  underline = "the app picked this", like the expense form's "Use today?". */
export function NightLine({ note }: { note: NightNote }) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
                fontSize: 12,
                lineHeight: 1.3,
                color: colors.primaryBrown,
            }}>
            <IconMoon size={14} stroke={2} style={{ flexShrink: 0 }} />
            <span>{note.text}</span>
            <Box
                component="button"
                type="button"
                onClick={note.onAction}
                sx={{
                    font: 'inherit',
                    fontWeight: 600,
                    color: colors.primaryBlue,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    ...pressTextSx,
                }}>
                {note.action}
            </Box>
        </Box>
    )
}
