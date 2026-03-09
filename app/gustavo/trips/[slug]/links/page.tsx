'use client'

import { colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { Links } from 'components/links/links'
import { getTablerIcon } from 'utils/icons'

export default function LinksPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingX: 2, paddingTop: 2, paddingBottom: 1 }}>
                {getTablerIcon({ name: 'IconExternalLink', size: 20, stroke: 2, color: colors.primaryBlack })}
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.primaryBlack, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Links
                </Typography>
            </Box>
            <Links />
        </Box>
    )
}
