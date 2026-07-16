'use client'

import { Box, Skeleton } from '@mui/material'

import { cardSx } from '@/lib/colors'

/**
 * Generic in-theme loading placeholder for content-heavy routes. Used by
 * `loading.tsx` boundaries to give an instant on-tap fallback while the route's
 * payload and data load — enough structure to read as "loading", not a spinner.
 */
export function PageLoadingSkeleton({ cards = 4 }: { cards?: number }) {
    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: 450,
                marginX: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                paddingX: 2,
                paddingY: 2,
            }}>
            {Array.from({ length: cards }, (_, i) => (
                <Box
                    key={i}
                    sx={{
                        ...cardSx,
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                    }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Skeleton variant="rectangular" width="55%" height={16} sx={{ borderRadius: '3px' }} />
                        <Skeleton variant="rectangular" width="35%" height={12} sx={{ borderRadius: '3px' }} />
                    </Box>
                </Box>
            ))}
        </Box>
    )
}
