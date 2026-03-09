import { Box, Typography } from '@mui/material'
import { IconArrowUpRight, IconArrowDownLeft, IconMinus } from '@tabler/icons-react'
import { colors, hardShadow } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { netPairwiseDebts } from '@/lib/debt'

import type { UserSummary } from '@/lib/types'
import type { PersonBalance } from '@/lib/debt'

type Props = {
    balance: PersonBalance
    participant: UserSummary
    currentUserId: number
    debtMap: Map<number, Map<number, number>>
    participantById: Map<number, UserSummary>
    onTap: (userId: number) => void
}

export function PersonBalanceCard({
    balance,
    participant,
    currentUserId,
    debtMap,
    participantById,
    onTap,
}: Props) {
    const isCurrentUser = participant.id === currentUserId
    const isOwed = balance.netBalance > 0.005
    const owes = balance.netBalance < -0.005
    const settled = !isOwed && !owes

    // Get this person's pairwise netted debts for the summary line
    const pairwiseDebts = netPairwiseDebts(debtMap).filter(
        (d) => d.fromId === participant.id || d.toId === participant.id
    )

    return (
        <Box
            onClick={() => onTap(participant.id)}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                padding: 1.5,
                backgroundColor: colors.primaryWhite,
                borderRadius: '4px',
                cursor: 'pointer',
                ...hardShadow,
                ...(isCurrentUser && {
                    border: `2px solid ${colors.primaryYellow}`,
                    boxShadow: `2px 2px 0px ${colors.primaryYellow}`,
                }),
                '&:active': {
                    boxShadow: 'none',
                    transform: 'translate(2px, 2px)',
                },
                'transition': 'transform 0.1s, box-shadow 0.1s',
            }}>
            {/* Top row: avatar + name + net balance */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <InitialsIcon
                    name={participant.firstName}
                    initials={participant.initials}
                    sx={{ width: 40, height: 40, fontSize: 16 }}
                />
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {isCurrentUser ? 'You' : participant.firstName}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {settled
                            ? 'All settled up'
                            : isOwed
                              ? 'is owed money'
                              : 'owes money'}
                    </Typography>
                </Box>
                {/* Net balance badge */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: settled
                            ? '#e8e8e8'
                            : isOwed
                              ? '#d4edda'
                              : '#f8d7da',
                        border: `1px solid ${settled ? colors.primaryBlack : isOwed ? colors.primaryGreen : colors.primaryRed}`,
                    }}>
                    {settled ? (
                        <IconMinus size={14} />
                    ) : isOwed ? (
                        <IconArrowDownLeft size={14} color={colors.primaryGreen} />
                    ) : (
                        <IconArrowUpRight size={14} color={colors.primaryRed} />
                    )}
                    <Typography
                        sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: settled
                                ? colors.primaryBlack
                                : isOwed
                                  ? colors.primaryGreen
                                  : colors.primaryRed,
                        }}>
                        {settled ? '$0' : FormattedMoney().format(Math.abs(balance.netBalance))}
                    </Typography>
                </Box>
            </Box>

            {/* Pairwise summary lines */}
            {pairwiseDebts.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.25,
                        marginTop: 1,
                        paddingTop: 1,
                        borderTop: `1px dashed ${colors.primaryBlack}40`,
                    }}>
                    {pairwiseDebts.map((debt) => {
                        const iFrom = debt.fromId === participant.id
                        const otherId = iFrom ? debt.toId : debt.fromId
                        const other = participantById.get(otherId)
                        if (!other) return null

                        const otherName = otherId === currentUserId ? 'you' : other.firstName

                        return (
                            <Typography
                                key={`${debt.fromId}-${debt.toId}`}
                                sx={{ fontSize: 12, color: 'text.secondary', paddingLeft: 6.5 }}>
                                {iFrom
                                    ? `owes ${otherName} ${FormattedMoney().format(debt.netAmount)}`
                                    : `owed ${FormattedMoney().format(debt.netAmount)} by ${otherName}`}
                            </Typography>
                        )
                    })}
                </Box>
            )}
        </Box>
    )
}
