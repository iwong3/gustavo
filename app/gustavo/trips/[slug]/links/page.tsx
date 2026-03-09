'use client'

import { Box } from '@mui/material'
import { Links } from 'components/links/links'

export default function LinksPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <Links />
        </Box>
    )
}
