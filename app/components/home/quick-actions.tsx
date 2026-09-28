'use client'

/**
 * The home page's two one-tap shortcuts, side by side, each dressed as the
 * thing it records:
 *
 * - ReceiptButton (Add expense): a till receipt — paper with a torn zigzag
 *   bottom edge; under the title, a printed line with the trip and when it is
 *   ("IN 12 DAYS", "DAY 3/13").
 * - FlapScaleButton (Track weight): a bathroom scale — your last weight in
 *   split-flap tiles on a mint penny-tile floor, under a strip of the same
 *   mint. The digits roll into place on mount, like a scale settling
 *   (skipped for reduced motion).
 *
 * The receipt's outline + hard shadow are drop-shadow filters on a wrapper so
 * they follow the masked zigzag (box-shadow/border can't). Both share a
 * height so the row lines up. Presentational + gallery-importable.
 */
import { Box, Typography } from '@mui/material'
import { IconCheck, IconPlus } from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { colors, toneColors } from '@/lib/colors'

const HEIGHT = 70
const TEETH_H = 5
const MONO = 'var(--font-mono, monospace)'

// Bathroom palette: mint penny tiles on pale grout, a strip of the same mint
const TILE_MINT = '#9fd4bc'
const GROUT = '#e7f3ed'
const SCALE_INK = '#10261b'
const DIGIT_TILE = '#fbfdfc'
/** Two offset grids of round tiles = a penny-tile floor. */
const PENNY_FLOOR = `radial-gradient(circle at 5px 5px, ${TILE_MINT} 3.4px, transparent 3.8px) 0 0 / 10px 10px, radial-gradient(circle at 5px 5px, ${TILE_MINT} 3.4px, transparent 3.8px) 5px 5px / 10px 10px, ${GROUT}`

// Outline = four 1px drop-shadows; then the signature 2px hard shadow
const OUTLINE = `drop-shadow(1px 0 0 ${colors.primaryBlack}) drop-shadow(-1px 0 0 ${colors.primaryBlack}) drop-shadow(0 1px 0 ${colors.primaryBlack}) drop-shadow(0 -1px 0 ${colors.primaryBlack})`
// Zigzag bottom edge: solid body above, a row of down-pointing teeth below
const ZIGZAG_MASK = `linear-gradient(#000 0 0) top / 100% calc(100% - ${TEETH_H}px) no-repeat, conic-gradient(from -45deg at bottom, #000 90deg, #0000 0) bottom / ${TEETH_H * 2}px ${TEETH_H}px repeat-x`

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function ReceiptButton({
    href,
    tripName,
    tripWhen,
}: {
    href: string
    tripName: string
    /** When the trip is, board-style: "IN 12 DAYS", "DAY 3/13", "TOMORROW". */
    tripWhen: string
}) {
    return (
        <Box
            component={Link}
            href={href}
            aria-label={`Add expense to ${tripName}`}
            sx={{
                'display': 'block',
                'minWidth': 0,
                'color': colors.primaryBlack,
                'textDecoration': 'none',
                'filter': `${OUTLINE} drop-shadow(2px 2px 0 ${colors.primaryBlack})`,
                'transition': 'transform 0.1s, filter 0.1s',
                '&:active': { transform: 'translate(2px, 2px)', filter: OUTLINE },
            }}>
            <Box
                sx={{
                    height: HEIGHT,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: `10px 12px ${TEETH_H + 9}px`,
                    backgroundColor: colors.primaryWhite,
                    borderRadius: '4px 4px 0 0',
                    mask: ZIGZAG_MASK,
                    WebkitMask: ZIGZAG_MASK,
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <IconPlus size={16} stroke={2.6} style={{ flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                        Add expense
                    </Typography>
                </Box>
                {/* The printed line: trip on the left, when on the right */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 0.75,
                        minWidth: 0,
                        fontFamily: MONO,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: colors.primaryBrown,
                        whiteSpace: 'nowrap',
                    }}>
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                        {tripName}
                    </Box>
                    <Box component="span" sx={{ flexShrink: 0, fontWeight: 700, color: colors.primaryBlack }}>
                        {tripWhen}
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

const ROLL_CHARS = '0123456789'
const ROLL_TICK_MS = 45
const ROLL_TICKS = 12

/** The reading, rolling into place once on mount (each tile settles in turn). */
function useRollingDigits(target: string): string {
    const [shown, setShown] = useState(target)
    const still = prefersReducedMotion()
    useEffect(() => {
        if (still) return
        let tick = 0
        const timer = window.setInterval(() => {
            tick++
            setShown(
                target
                    .split('')
                    .map((c, i) =>
                        // Digits settle left to right; the point never rolls
                        c === '.' || tick >= ROLL_TICKS - (target.length - 1 - i) * 2
                            ? c
                            : ROLL_CHARS[Math.floor(Math.random() * ROLL_CHARS.length)]
                    )
                    .join('')
            )
            if (tick >= ROLL_TICKS) window.clearInterval(timer)
        }, ROLL_TICK_MS)
        return () => window.clearInterval(timer)
    }, [target, still])
    return still ? target : shown
}

export function FlapScaleButton({
    href,
    reading,
    when,
    done,
}: {
    href: string
    /** Last weigh-in, e.g. "172.4" — null shows dashes. */
    reading: string | null
    /** When it was, e.g. "FRI" / "TODAY". */
    when: string
    /** Weighed in today: the + becomes a green check. */
    done: boolean
}) {
    const shown = useRollingDigits(reading ?? '---.-')
    return (
        <Box
            component={Link}
            href={href}
            aria-label={`Track weight — last ${reading ?? 'none'} lb, ${when}`}
            sx={{
                'height': HEIGHT,
                'minWidth': 0,
                'display': 'flex',
                'flexDirection': 'column',
                'background': PENNY_FLOOR,
                'border': `1px solid ${colors.primaryBlack}`,
                'borderRadius': '6px',
                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                'overflow': 'hidden',
                'color': colors.primaryBlack,
                'textDecoration': 'none',
                'transition': 'transform 0.1s, box-shadow 0.1s',
                '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
            }}>
            {/* Sand strip: action + when */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    height: 24,
                    flexShrink: 0,
                    paddingX: 1,
                    backgroundColor: TILE_MINT,
                    color: SCALE_INK,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                }}>
                {done ? (
                    <Box
                        sx={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            backgroundColor: toneColors.positive,
                            color: colors.primaryWhite,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                        <IconCheck size={10} stroke={3.2} />
                    </Box>
                ) : (
                    <IconPlus size={13} stroke={2.8} style={{ flexShrink: 0 }} />
                )}
                <Typography
                    sx={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                    }}>
                    Weigh-in
                </Typography>
                <Typography
                    sx={{
                        marginLeft: 'auto',
                        fontFamily: MONO,
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: done ? '#1b5e20' : SCALE_INK,
                        whiteSpace: 'nowrap',
                    }}>
                    {when}
                </Typography>
            </Box>
            {/* The readout */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                {shown.split('').map((c, i) =>
                    c === '.' ? (
                        <Box
                            key={i}
                            sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                backgroundColor: SCALE_INK,
                                alignSelf: 'flex-end',
                                marginBottom: '9px',
                            }}
                        />
                    ) : (
                        <Box
                            key={i}
                            sx={{
                                'position': 'relative',
                                'width': 17,
                                'height': 26,
                                'lineHeight': '26px',
                                'textAlign': 'center',
                                'fontFamily': MONO,
                                'fontSize': 16,
                                'fontWeight': 700,
                                'backgroundColor': DIGIT_TILE,
                                'color': SCALE_INK,
                                'border': `1px solid ${colors.primaryBlack}`,
                                'borderRadius': '2px',
                                'fontVariantNumeric': 'tabular-nums',
                                // The flap's hinge line
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: '50%',
                                    height: '1px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.28)',
                                },
                            }}>
                            {c}
                        </Box>
                    )
                )}
                <Typography
                    sx={{
                        fontFamily: MONO,
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: SCALE_INK,
                        alignSelf: 'flex-end',
                        marginBottom: '9px',
                        marginLeft: '3px',
                    }}>
                    LB
                </Typography>
            </Box>
        </Box>
    )
}
