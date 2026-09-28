'use client'

/**
 * The home greeting's quote (see useHomeQuote): HeroQuote under the big Gus,
 * HeaderQuote in the header when home is compact. Both hide their text (but
 * keep its space) until the day's quote has resolved, so the line never
 * visibly swaps from a placeholder to the fetched one.
 */
import { Box, Typography } from '@mui/material'

import { colors } from '@/lib/colors'
import { useHomeQuote } from './use-home-quote'

const fadeIn = (ready: boolean) =>
    ({
        opacity: ready ? 1 : 0,
        transition: 'opacity 200ms ease',
    }) as const

export function HeroQuote() {
    const { quote, ready } = useHomeQuote()
    return (
        <Box sx={{ ...fadeIn(ready), textAlign: 'center', paddingBottom: 3, maxWidth: 340 }}>
            <Typography
                sx={{
                    fontSize: 20,
                    fontFamily: 'var(--font-serif)',
                    lineHeight: 1.3,
                    textWrap: 'balance',
                }}>
                “{quote.quote}”
            </Typography>
            <Typography
                sx={{
                    marginTop: 0.75,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: colors.primaryBrown,
                }}>
                — {quote.author}
            </Typography>
        </Box>
    )
}

export function HeaderQuote() {
    const { quote, ready } = useHomeQuote()
    return (
        <Typography
            aria-label={`${quote.quote} — ${quote.author}`}
            sx={{
                ...fadeIn(ready),
                fontFamily: 'var(--font-serif)',
                fontSize: 14.5,
                lineHeight: 1.2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
            }}>
            “{quote.quote}”
            <Box
                component="span"
                sx={{
                    marginLeft: 0.75,
                    fontFamily: 'var(--font-roboto), Roboto, sans-serif',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: colors.primaryBrown,
                    whiteSpace: 'nowrap',
                }}>
                — {quote.author.split(' ')[0]}
            </Box>
        </Typography>
    )
}
