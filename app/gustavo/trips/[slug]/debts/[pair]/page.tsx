'use client'

import { Box, Typography } from '@mui/material'
import { useParams } from 'next/navigation'

import { PairDetail } from 'components/debt/pair-detail'

export default function DebtPairPage() {
    const { pair } = useParams<{ slug: string; pair: string }>()

    // URL segment is <debtorId>-<creditorId>. Ids stay strings — user ids
    // are BIGINTs that arrive as strings at runtime, so Number() conversion
    // would never match participants (see CLAUDE.md runtime-types rule).
    const match = pair?.match(/^(\d+)-(\d+)$/)

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
                paddingX: 2,
                paddingY: 2,
            }}>
            {match ? (
                <PairDetail
                    debtorId={match[1]}
                    creditorId={match[2]}
                />
            ) : (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: 'text.secondary',
                        padding: 4,
                        textAlign: 'center',
                    }}>
                    This debt no longer exists.
                </Typography>
            )}
        </Box>
    )
}
