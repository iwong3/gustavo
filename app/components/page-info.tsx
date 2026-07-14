'use client'

import { Box, Dialog, Typography } from '@mui/material'
import { IconInfoSmall, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { colors } from '@/lib/colors'

/** Height of the ⓘ trigger — matches other controls sharing a title row. */
export const PAGE_INFO_BUTTON_SIZE = 30

/**
 * Standard per-page help affordance: an ⓘ button that lives in the page's
 * title row (top right) and opens a modal explaining how the page works.
 * Compose the modal body from PageInfoSection cards plus free-form text.
 */
export function PageInfo({
    title,
    children,
}: {
    /** Modal heading, e.g. "How debts work". */
    title: string
    children: ReactNode
}) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Box
                onClick={() => setOpen(true)}
                aria-label={title}
                sx={{
                    'display': 'flex',
                    'alignItems': 'center',
                    'justifyContent': 'center',
                    'width': PAGE_INFO_BUTTON_SIZE,
                    'height': PAGE_INFO_BUTTON_SIZE,
                    'flexShrink': 0,
                    'borderRadius': '50%',
                    'border': `1px solid ${colors.primaryBlack}`,
                    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                    'backgroundColor': colors.primaryWhite,
                    'cursor': 'pointer',
                    'userSelect': 'none',
                    '&:active': {
                        boxShadow: 'none',
                        transform: 'translate(1.5px, 1.5px)',
                    },
                    'transition': 'transform 0.1s, box-shadow 0.1s',
                }}>
                {/* Bare "i" — the button is already a circle, IconInfoCircle
                    nested a second ring inside it */}
                <IconInfoSmall size={30} stroke={1.8} color={colors.primaryBlack} />
            </Box>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    paper: {
                        sx: {
                            border: `2px solid ${colors.primaryBlack}`,
                            boxShadow: `4px 4px 0px ${colors.primaryBlack}`,
                            borderRadius: '8px',
                            backgroundColor: colors.primaryWhite,
                            margin: 2,
                        },
                    },
                }}>
                <Box sx={{ padding: 2 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 1.5,
                        }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
                            {title}
                        </Typography>
                        <Box
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                            sx={{
                                'display': 'flex',
                                'alignItems': 'center',
                                'justifyContent': 'center',
                                'width': 28,
                                'height': 28,
                                'flexShrink': 0,
                                'borderRadius': '6px',
                                'border': `1px solid ${colors.primaryBlack}`,
                                'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                'backgroundColor': colors.primaryYellow,
                                'cursor': 'pointer',
                                '&:active': {
                                    boxShadow: 'none',
                                    transform: 'translate(1.5px, 1.5px)',
                                },
                                'transition': 'transform 0.1s, box-shadow 0.1s',
                            }}>
                            <IconX size={16} stroke={2} color={colors.primaryBlack} />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {children}
                    </Box>
                </Box>
            </Dialog>
        </>
    )
}

/** A titled card inside the PageInfo modal — one concept per card. */
export function PageInfoSection({
    title,
    children,
}: {
    title: string
    children: ReactNode
}) {
    return (
        <Box
            sx={{
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '6px',
                backgroundColor: colors.secondaryYellow,
                padding: 1.25,
            }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, marginBottom: 0.25 }}>
                {title}
            </Typography>
            <Typography
                component="div"
                sx={{ fontSize: 12.5, lineHeight: 1.5, color: colors.primaryBrown }}>
                {children}
            </Typography>
        </Box>
    )
}

/** Free-form note text inside the PageInfo modal (outside the cards). */
export function PageInfoNote({ children }: { children: ReactNode }) {
    return (
        <Typography
            component="div"
            sx={{
                fontSize: 12.5,
                lineHeight: 1.5,
                color: colors.primaryBrown,
                paddingX: 0.25,
            }}>
            {children}
        </Typography>
    )
}
