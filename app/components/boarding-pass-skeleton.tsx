'use client'

import { Box, Skeleton } from '@mui/material'

import { cardSx, colors } from '@/lib/colors'

/**
 * Placeholder for a BoardingPass while the trips list loads. Matches the pass
 * anatomy (header strip + body with title and field rows) and footprint so the
 * list appears instantly with no layout shift when real cards swap in.
 */
export default function BoardingPassSkeleton() {
    return (
        <Box sx={{ ...cardSx, borderRadius: '8px', overflow: 'hidden', width: '100%' }}>
            {/* Header strip */}
            <Box
                sx={{
                    height: 34,
                    backgroundColor: colors.secondaryYellow,
                    borderBottom: `1px solid ${colors.primaryBlack}`,
                }}
            />
            {/* Body */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.25,
                    paddingX: 1.75,
                    paddingTop: 1.5,
                    paddingBottom: 1.75,
                }}>
                <Skeleton variant="rectangular" width="55%" height={22} sx={{ borderRadius: '3px' }} />
                <Box sx={{ display: 'flex', gap: 2.25, marginTop: 0.5 }}>
                    <Skeleton variant="rectangular" width={96} height={14} sx={{ borderRadius: '3px' }} />
                    <Skeleton variant="rectangular" width={72} height={14} sx={{ borderRadius: '3px' }} />
                </Box>
            </Box>
        </Box>
    )
}
