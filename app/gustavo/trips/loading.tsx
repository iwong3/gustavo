'use client'

import { Box } from '@mui/material'

import BoardingPassSkeleton from 'components/boarding-pass-skeleton'

// Instant navigation boundary for the trips list: Next shows this the moment you
// tap "Trips", before the route payload + data arrive, so the click never feels
// dead. The page's own react-query loading state reuses the same skeleton, so
// the transition into loaded content is seamless.
export default function Loading() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                paddingX: 4,
                paddingY: 2,
                width: '100%',
            }}>
            {[0, 1, 2].map((i) => (
                <BoardingPassSkeleton key={i} />
            ))}
        </Box>
    )
}
