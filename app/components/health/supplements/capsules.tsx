'use client'

import { Box, Typography } from '@mui/material'

import { colors, supplementColors, toneColors } from '@/lib/colors'

/** Beyond this many doses a day, show "2/5" instead of capsules. */
const MAX_CAPSULES = 4

/**
 * A supplement's doses for one day as capsules — two-tone when taken, an
 * empty shell when not. Shared by the Home card, the Supplements page tiles
 * and its day panel, so "taken" looks the same everywhere.
 */
export function Capsules({ taken, dosesPerDay }: { taken: number; dosesPerDay: number }) {
    if (dosesPerDay > MAX_CAPSULES) {
        return (
            <Typography
                sx={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: taken >= dosesPerDay ? toneColors.positive : colors.primaryBrown,
                    flexShrink: 0,
                }}>
                {Math.min(taken, dosesPerDay)}/{dosesPerDay}
            </Typography>
        )
    }
    return (
        <Box sx={{ display: 'flex', gap: '4px', flexShrink: 0 }} aria-hidden="true">
            {Array.from({ length: dosesPerDay }, (_, i) => (
                <Box
                    key={i}
                    sx={{
                        width: 24,
                        height: 12,
                        borderRadius: 6,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        background:
                            i < taken
                                ? `linear-gradient(90deg, ${supplementColors.fill} 50%, ${supplementColors.fillLight} 50%)`
                                : colors.primaryWhite,
                        transition: 'background 0.15s',
                    }}
                />
            ))}
        </Box>
    )
}
