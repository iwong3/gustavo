'use client'

import { Box, Skeleton } from '@mui/material'

import { cardSx, colors } from '@/lib/colors'

/**
 * Placeholder for the receipts list shown inside a trip while its expenses load.
 * This is the trip's default landing content, so the trip layout renders it as
 * the loading state: the header (trip name + tool pill) is already painted from
 * the seeded trip, and this fills the content area until expenses arrive.
 */
export function ReceiptsListSkeleton() {
    return (
        <Box sx={{ width: '100%', maxWidth: 450, marginX: 'auto', paddingTop: 1 }}>
            {[0, 1, 2].map((group) => (
                <Box key={group} sx={{ marginX: 2, marginBottom: 1.5 }}>
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                        {/* Date-group header */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingX: 1.5,
                                paddingY: 1.25,
                                backgroundColor: colors.secondaryYellow,
                                borderBottom: `1px solid ${colors.primaryBlack}`,
                            }}>
                            <Skeleton variant="rectangular" width={112} height={16} sx={{ borderRadius: '3px' }} />
                            <Skeleton variant="rectangular" width={54} height={16} sx={{ borderRadius: '3px' }} />
                        </Box>
                        {/* Expense rows */}
                        {[0, 1].map((row) => (
                            <Box
                                key={row}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    paddingX: 1.5,
                                    paddingY: 1.5,
                                    borderBottom:
                                        row === 0
                                            ? `1px solid ${colors.primaryBlack}18`
                                            : 'none',
                                }}>
                                <Skeleton variant="circular" width={34} height={34} />
                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                    <Skeleton variant="rectangular" width="60%" height={14} sx={{ borderRadius: '3px' }} />
                                    <Skeleton variant="rectangular" width="35%" height={12} sx={{ borderRadius: '3px' }} />
                                </Box>
                                <Skeleton variant="rectangular" width={54} height={16} sx={{ borderRadius: '3px' }} />
                            </Box>
                        ))}
                    </Box>
                </Box>
            ))}
        </Box>
    )
}
