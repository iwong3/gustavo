'use client'

import { Box, Typography } from '@mui/material'
import { IconNotes } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'

interface DrawerNotesProps {
    notes: string
}

export const DrawerNotes = ({ notes }: DrawerNotesProps) => {
    if (!notes || !notes.trim()) return null

    return (
        <Box sx={{ mx: 2.5, mb: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1.5,
                    borderRadius: '4px',
                    ...hardShadow,
                    backgroundColor: colors.primaryWhite,
                    borderLeft: `3px solid ${colors.primaryYellow}`,
                }}>
                <IconNotes
                    size={14}
                    color={colors.primaryBlack}
                    style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Typography
                    sx={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: colors.primaryBlack,
                        fontStyle: 'italic',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}>
                    {notes}
                </Typography>
            </Box>
        </Box>
    )
}
