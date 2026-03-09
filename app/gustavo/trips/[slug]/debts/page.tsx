'use client'

import { Box } from '@mui/material'
import { DebtOverview } from 'components/debt/debt-overview'

export default function DebtsPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 450,
            }}>
            <DebtOverview />
        </Box>
    )
}
