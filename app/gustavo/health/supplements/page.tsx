'use client'

import { colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'

export default function SupplementsPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 600,
                paddingX: 2,
                paddingY: 2,
            }}>
            <Typography
                sx={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: 'var(--font-serif)',
                    mb: 2,
                }}>
                Supplements
            </Typography>
            <Typography sx={{ fontSize: 14, color: colors.primaryBrown }}>
                Coming soon.
            </Typography>
        </Box>
    )
}
