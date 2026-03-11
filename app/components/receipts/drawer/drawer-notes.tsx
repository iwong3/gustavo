'use client'

import { Box, ButtonBase, Typography } from '@mui/material'
import { IconNotes } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'

interface DrawerNotesProps {
    notes: string
    onEdit?: () => void
}

export const DrawerNotes = ({ notes, onEdit }: DrawerNotesProps) => {
    if (!notes || !notes.trim()) return null

    const content = (
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
                width: '100%',
                textAlign: 'left',
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
    )

    if (onEdit) {
        return (
            <Box sx={{ mx: 2.5, mb: 2 }}>
                <ButtonBase
                    onClick={onEdit}
                    sx={{
                        display: 'block',
                        width: '100%',
                        borderRadius: '4px',
                        '&:active .MuiBox-root': { backgroundColor: colors.secondaryYellow },
                    }}>
                    {content}
                </ButtonBase>
            </Box>
        )
    }

    return (
        <Box sx={{ mx: 2.5, mb: 2 }}>
            {content}
        </Box>
    )
}
