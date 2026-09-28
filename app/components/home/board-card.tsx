'use client'

/**
 * BoardCard — a home-page card wearing the departures board's header: a sand
 * strip with an icon + letter-spaced caps title on the left and a status pill
 * on the right. Keeps the Health cards visually tied to the board at the top
 * of the page. The strip links to the section's page; the body is free.
 * The strip defaults to the board's sand; Health cards pass their section
 * colour (healthColors — the same as the Health page's section pills). Pill
 * colours mirror components/departures-board.tsx. Presentational +
 * gallery-importable.
 */
import { Box, Typography } from '@mui/material'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { colors, toneColors } from '@/lib/colors'

const HEADER_BG = '#c9a877'
const PILL_BG = '#f3ead6'
const PILL_TEXT = '#4a3418'

export type BoardPill = { label: string; tone?: 'neutral' | 'alert' | 'good' }

const PILL_COLOR: Record<NonNullable<BoardPill['tone']>, string> = {
    neutral: PILL_TEXT,
    alert: toneColors.negative,
    good: toneColors.positive,
}

export default function BoardCard({
    href,
    icon,
    title,
    pill,
    headerBg = HEADER_BG,
    children,
}: {
    href: string
    /** Strip colour — defaults to the departures board's sand. */
    headerBg?: string
    icon: ReactNode
    title: string
    pill?: BoardPill
    children: ReactNode
}) {
    return (
        <Box
            sx={{
                border: `1px solid ${colors.primaryBlack}`,
                borderRadius: '8px',
                backgroundColor: colors.primaryWhite,
                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                overflow: 'hidden',
            }}>
            <Box
                component={Link}
                href={href}
                sx={{
                    'display': 'flex',
                    'alignItems': 'center',
                    'justifyContent': 'space-between',
                    'gap': 1,
                    'minHeight': 34,
                    'paddingX': 1.75,
                    'backgroundColor': headerBg,
                    'borderBottom': `1px solid ${colors.primaryBlack}`,
                    'color': colors.primaryBlack,
                    'textDecoration': 'none',
                    'transition': 'filter 0.1s',
                    '&:active': { filter: 'brightness(0.94)' },
                }}>
                <Typography
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                    }}>
                    {icon}
                    {title}
                </Typography>
                {pill && (
                    <Typography
                        sx={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            paddingX: 1,
                            paddingY: '2px',
                            borderRadius: 999,
                            border: `1.5px solid ${colors.primaryBlack}`,
                            backgroundColor: PILL_BG,
                            color: PILL_COLOR[pill.tone ?? 'neutral'],
                            whiteSpace: 'nowrap',
                            // Long routine names ("Next: …") truncate, not wrap
                            maxWidth: '62%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                        {pill.label}
                    </Typography>
                )}
            </Box>
            <Box sx={{ padding: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>{children}</Box>
        </Box>
    )
}
