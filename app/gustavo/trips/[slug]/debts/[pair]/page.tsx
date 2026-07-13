'use client'

import { Box, Typography } from '@mui/material'
import { useParams } from 'next/navigation'

import { PairDetail } from 'components/debt/pair-detail'

export default function DebtPairPage() {
    const { pair } = useParams<{ slug: string; pair: string }>()

    // URL segment is <debtorId>-<creditorId>
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
                    debtorId={Number(match[1])}
                    creditorId={Number(match[2])}
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
