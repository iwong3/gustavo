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
/** Strip height, and the height every right-side pill uses. */
export const STRIP_H = 34
export const PILL_H = 22
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
    right,
    headerBg = HEADER_BG,
    children,
}: {
    href: string
    /** Strip colour — defaults to the departures board's sand. */
    headerBg?: string
    icon: ReactNode
    title: string
    pill?: BoardPill
    /** Custom content for the strip's right side, in place of `pill`. */
    right?: ReactNode
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
                    'minHeight': STRIP_H,
                    // Right side: the 22px pill sits 6px from the top and bottom
                    // of the 34px strip, so 6px from the edge too
                    'paddingLeft': 1.75,
                    'paddingRight': `${(STRIP_H - PILL_H) / 2}px`,
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
                {right}
                {!right && pill && (
                    <Typography
                        sx={{
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            height: PILL_H,
                            boxSizing: 'border-box',
                            paddingX: 1,
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
            <Box
                sx={{
                    padding: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                }}>
                {children}
            </Box>
        </Box>
    )
}

/** Numbers in a strip count ("5 ON · 25 OFF", "7/16 DOSES"). */
export const stripNumSx = {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0,
    fontVariantNumeric: 'tabular-nums',
} as const
/** Words in a strip count — the title's letter-spaced caps, in brown. */
export const stripWordSx = {
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: '0.12em',
    color: colors.primaryBrown,
} as const

/**
 * Plain-text status for the strip's right side (`right`), instead of a pill:
 * baseline-aligned numbers + words, inset 14px from the edge to match the
 * title's inset on the left (the strip's own right padding is sized for pills).
 */
export function StripText({
    label,
    children,
}: {
    label: string
    children: ReactNode
}) {
    return (
        <Typography
            component="span"
            aria-label={label}
            sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px',
                flexShrink: 0,
                lineHeight: 1,
                textTransform: 'uppercase',
                paddingRight: `${14 - (STRIP_H - PILL_H) / 2}px`,
            }}>
            {children}
        </Typography>
    )
}
