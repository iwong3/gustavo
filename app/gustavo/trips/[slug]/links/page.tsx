'use client'

import { colors, hardShadow } from '@/lib/colors'
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
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, marginX: 2, marginTop: 2, marginBottom: 1, paddingX: 1.5, paddingY: 0.75, backgroundColor: '#b4cedf', ...hardShadow, borderRadius: '4px', alignSelf: 'flex-start' }}>
                {getTablerIcon({ name: 'IconExternalLink', size: 20, stroke: 2, color: colors.primaryBlack, fill: colors.primaryWhite })}
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.primaryBlack, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Links
                </Typography>
            </Box>
            <Links />
        </Box>
    )
}
