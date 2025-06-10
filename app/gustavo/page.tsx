'use client'

import { Box } from '@mui/material'
import { Main } from 'views/main'

export default function GustavoPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
            }}>
            <Main />
        </Box>
    )
}
