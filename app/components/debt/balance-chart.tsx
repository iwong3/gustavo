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

const chartColors = {
    green: '#6b8e23',
    red: colors.primaryRed,
}

export function BalanceChart({ balances, participantById, currentUserId }: Props) {
    const maxAbs = Math.max(...balances.map((b) => Math.abs(b.netBalance)), 1)

    return (
        <Box
            sx={{
                backgroundColor: colors.primaryWhite,
                borderRadius: '4px',
                overflow: 'hidden',
                ...hardShadow,
            }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {balances.map((balance, index) => {
                    const participant = participantById.get(balance.userId)
                    if (!participant) return null

                    const isCurrentUser = balance.userId === currentUserId
                    const isOwed = balance.netBalance > 0.005
                    const owes = balance.netBalance < -0.005
                    const pct = Math.abs(balance.netBalance) / maxAbs * 100
                    // Ensure tiny amounts are still visible
                    const barPct = pct < 3 && (isOwed || owes) ? 3 : pct
                    const isFirst = index === 0
                    const isLast = index === balances.length - 1

                    return (
                        <Box
                            key={balance.userId}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                paddingX: 1,
                                paddingTop: isFirst ? 1 : 0.5,
                                paddingBottom: isLast ? 1 : 0.5,
                                ...(isCurrentUser && {
                                    backgroundColor: colors.primaryYellow,
                                }),
                            }}>
                            {/* Icon + Amount */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                <InitialsIcon
                                    name={participant.firstName}
                                    initials={participant.initials}
                                    iconColor={participant.iconColor}
                                    sx={{ width: 22, height: 22, fontSize: 9 }}
                                />
                                <Typography
                                    sx={{
                                        width: 76,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        textAlign: 'right',
                                        color: owes ? chartColors.red : isOwed ? chartColors.green : colors.primaryBlack,
                                    }}>
                                    {owes ? '-' : isOwed ? '+' : ''}
                                    {FormattedMoney().format(Math.abs(balance.netBalance))}
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
                                                width: `${barPct}%`,
                                                backgroundColor: chartColors.red,
                                                borderRadius: '3px 0 0 3px',
                                                border: `1px solid ${colors.primaryBlack}`,
                                                boxShadow: `-1px 1px 0px ${colors.primaryBlack}`,
                                            }}
                                        />
                                    )}
                                </Box>
                                {/* Right half: owed */}
                                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                    {isOwed && (
                                        <Box
                                            sx={{
                                                height: '100%',
                                                width: `${barPct}%`,
                                                backgroundColor: chartColors.green,
                                                borderRadius: '0 3px 3px 0',
                                                border: `1px solid ${colors.primaryBlack}`,
                                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
