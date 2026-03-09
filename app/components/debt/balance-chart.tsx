import { Box, Typography } from '@mui/material'
import { colors, hardShadow } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'

import type { UserSummary } from '@/lib/types'
import type { PersonBalance } from '@/lib/debt'

type Props = {
    balances: PersonBalance[]
    participantById: Map<number, UserSummary>
    currentUserId: number
}

export function BalanceChart({ balances, participantById, currentUserId }: Props) {
    // Find the max absolute balance for scaling bars
    const maxAbs = Math.max(...balances.map((b) => Math.abs(b.netBalance)), 1)

    return (
        <Box
            sx={{
                padding: 1.5,
                backgroundColor: colors.primaryWhite,
                borderRadius: '4px',
                ...hardShadow,
            }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {balances.map((balance) => {
                    const participant = participantById.get(balance.userId)
                    if (!participant) return null

                    const isCurrentUser = balance.userId === currentUserId
                    const isOwed = balance.netBalance > 0.005
                    const owes = balance.netBalance < -0.005
                    const pct = Math.abs(balance.netBalance) / maxAbs * 100

                    return (
                        <Box key={balance.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {/* Name column */}
                            <Box sx={{ width: 56, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <InitialsIcon
                                    name={participant.firstName}
                                    initials={participant.initials}
                                    sx={{ width: 24, height: 24, fontSize: 10 }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: isCurrentUser ? 700 : 600,
                                        lineHeight: 1.2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                    {isCurrentUser ? 'You' : participant.firstName}
                                </Typography>
                            </Box>

                            {/* Bar area — split into left (owes) and right (owed) halves */}
                            <Box sx={{ flex: 1, display: 'flex', height: 20 }}>
                                {/* Left half: owes */}
                                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {owes && (
                                        <Box
                                            sx={{
                                                height: '100%',
                                                width: `${pct}%`,
                                                minWidth: 2,
                                                backgroundColor: colors.primaryRed,
                                                borderRadius: '2px 0 0 2px',
                                                opacity: 0.75,
                                            }}
                                        />
                                    )}
                                </Box>
                                {/* Center line */}
                                <Box sx={{ width: '1px', backgroundColor: `${colors.primaryBlack}30`, flexShrink: 0 }} />
                                {/* Right half: owed */}
                                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                    {isOwed && (
                                        <Box
                                            sx={{
                                                height: '100%',
                                                width: `${pct}%`,
                                                minWidth: 2,
                                                backgroundColor: colors.primaryGreen,
                                                borderRadius: '0 2px 2px 0',
                                                opacity: 0.75,
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Amount */}
                            <Typography
                                sx={{
                                    width: 60,
                                    flexShrink: 0,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textAlign: 'right',
                                    color: owes ? colors.primaryRed : isOwed ? colors.primaryGreen : colors.primaryBlack,
                                }}>
                                {owes ? '-' : isOwed ? '+' : ''}
                                {FormattedMoney().format(Math.abs(balance.netBalance))}
                            </Typography>
                        </Box>
                    )
                })}
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1, paddingTop: 1, borderTop: `1px solid ${colors.primaryBlack}15` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: colors.primaryRed, opacity: 0.75 }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Owes</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: colors.primaryGreen, opacity: 0.75 }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Is owed</Typography>
                </Box>
            </Box>
        </Box>
    )
}
