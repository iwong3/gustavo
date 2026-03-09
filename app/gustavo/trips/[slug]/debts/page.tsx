'use client'

import { colors } from '@/lib/colors'
import { Box, Typography } from '@mui/material'
import { HandCoins } from '@phosphor-icons/react'
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, paddingX: 2, paddingTop: 2, paddingBottom: 1 }}>
                <HandCoins size={20} weight="bold" color={colors.primaryBlack} />
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.primaryBlack, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Debts
                </Typography>
            </Box>
            <DebtOverview />
        </Box>
    )
}
