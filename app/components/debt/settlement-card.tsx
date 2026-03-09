import { Box, Link, Typography } from '@mui/material'
import { IconArrowRight } from '@tabler/icons-react'
import { colors, hardShadow } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'

import type { UserSummary } from '@/lib/types'
import type { Settlement } from '@/lib/debt'

type Props = {
    settlement: Settlement
    participantById: Map<number, UserSummary>
    currentUserId: number
    onTap: (settlement: Settlement) => void
}

export function SettlementCard({ settlement, participantById, currentUserId, onTap }: Props) {
    const debtor = participantById.get(settlement.debtorId)
    const creditor = participantById.get(settlement.creditorId)
    if (!debtor || !creditor) return null

    const isUserDebtor = settlement.debtorId === currentUserId
    const isUserCreditor = settlement.creditorId === currentUserId
    const isUserInvolved = isUserDebtor || isUserCreditor

    return (
        <Box
            onClick={() => onTap(settlement)}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                padding: 1.5,
                backgroundColor: colors.primaryWhite,
                borderRadius: '4px',
                cursor: 'pointer',
                ...hardShadow,
                borderLeft: isUserInvolved ? `4px solid ${colors.primaryYellow}` : hardShadow.border,
                '&:active': {
                    boxShadow: 'none',
                    transform: 'translate(2px, 2px)',
                },
                'transition': 'transform 0.1s, box-shadow 0.1s',
            }}>
            {/* Debtor */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                <InitialsIcon
                    name={debtor.firstName}
                    initials={debtor.initials}
                    sx={{ width: 36, height: 36, fontSize: 14 }}
                />
                <Typography sx={{ fontSize: 11, fontWeight: 600, marginTop: 0.5, lineHeight: 1 }}>
                    {isUserDebtor ? 'You' : debtor.firstName}
                </Typography>
            </Box>

            {/* Arrow + amount */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: colors.primaryBlack }}>
                    {FormattedMoney().format(settlement.amount)}
                </Typography>
                <IconArrowRight size={18} color={colors.primaryBlack} />
            </Box>

            {/* Creditor */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                <InitialsIcon
                    name={creditor.firstName}
                    initials={creditor.initials}
                    sx={{ width: 36, height: 36, fontSize: 14 }}
                />
                <Typography sx={{ fontSize: 11, fontWeight: 600, marginTop: 0.5, lineHeight: 1 }}>
                    {isUserCreditor ? 'You' : creditor.firstName}
                </Typography>
            </Box>

            {/* Venmo link for the creditor (if user is the debtor) */}
            {isUserDebtor && creditor.venmoUrl && (
                <Link
                    href={creditor.venmoUrl}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0.5,
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.primaryWhite,
                        backgroundColor: colors.primaryBlue,
                        borderRadius: '4px',
                        textDecoration: 'none',
                        border: `1px solid ${colors.primaryBlack}`,
                        boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                        '&:active': {
                            boxShadow: 'none',
                            transform: 'translate(1px, 1px)',
                        },
                    }}>
                    Venmo
                </Link>
            )}
        </Box>
    )
}
