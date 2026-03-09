'use client'

import { Box } from '@mui/material'
import { Summary } from 'components/summary/summary'

export default function GraphsPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <Summary />
        </Box>
    )
}
