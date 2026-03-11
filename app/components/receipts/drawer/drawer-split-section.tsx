'use client'

import { Box, Typography } from '@mui/material'
import { IconGift } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { SplitDonutChart } from './split-donut-chart'

import type { Expense, UserSummary } from '@/lib/types'

// Default colors for participants without an iconColor
const FALLBACK_COLORS = [
    '#6C8EBF', '#82B366', '#D6AB4C', '#B85450',
    '#9673A6', '#D79B00', '#23445D', '#AE4132',
]

/** Threshold for switching to 2 user columns */
const TWO_COL_THRESHOLD = 5

interface DrawerSplitSectionProps {
    expense: Expense
    costUsd: number
    currentUserId: number
    tripParticipantCount: number
}

export const DrawerSplitSection = ({
    expense,
    costUsd,
    currentUserId,
    tripParticipantCount,
}: DrawerSplitSectionProps) => {
    const coveredIds = new Set(expense.coveredParticipants.map((u) => u.id))
    const activeSplitCount = expense.splitBetween.length - coveredIds.size
    const perPersonShare = activeSplitCount > 0 ? costUsd / activeSplitCount : 0
    const splitCount = expense.splitBetween.length

    const isCurrentUserParticipant = expense.splitBetween.some((u) => u.id === currentUserId)
    const isCurrentUserPayer = expense.paidBy.id === currentUserId
    const isCurrentUserCovered = coveredIds.has(currentUserId)
    const currentUserOwes =
        isCurrentUserParticipant && !isCurrentUserPayer && !isCurrentUserCovered
            ? perPersonShare
            : 0

    // Sort: payer first, then alphabetical by firstName
    const sortedParticipants = [...expense.splitBetween].sort((a, b) => {
        if (a.id === expense.paidBy.id) return -1
        if (b.id === expense.paidBy.id) return 1
        return a.firstName.localeCompare(b.firstName)
    })

    // Build donut segments (in sorted order for consistency)
    const segments = sortedParticipants.map((user, i) => {
        const isCovered = coveredIds.has(user.id)
        return {
            label: user.firstName,
            value: perPersonShare, // equal visual size
            color: user.iconColor || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            isCovered,
            isPayer: user.id === expense.paidBy.id,
        }
    })

    // Header text
    const splitLabel = expense.isEveryone
        ? `everyone (${tripParticipantCount})`
        : splitCount === 1
            ? '1 person'
            : `${splitCount} people`

    const useTwoUserCols = splitCount >= TWO_COL_THRESHOLD

    return (
        <Box sx={{ mx: 2.5, mb: 2 }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.primaryBlack }}>
                    {splitCount === 1 ? `Paid by ${splitLabel}` : `Split between ${splitLabel}`}
                </Typography>
                {splitCount > 1 && (
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                        {FormattedMoney('USD').format(perPersonShare)} each
                    </Typography>
                )}
            </Box>

            {/* Card: donut + participants — always centered */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 2.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2,
                    py: 1.5,
                    borderRadius: '4px',
                    ...hardShadow,
                    backgroundColor: colors.primaryWhite,
                }}>
                {/* Donut chart — only for 2+ participants */}
                {splitCount > 1 && (
                    <Box sx={{ flexShrink: 0 }}>
                        <SplitDonutChart segments={segments} size={useTwoUserCols ? 80 : 90} />
                    </Box>
                )}

                {/* User columns: 1 column for <5 people, 2 columns for ≥5 */}
                {useTwoUserCols ? (
                    <TwoColumnParticipants
                        participants={sortedParticipants}
                        coveredIds={coveredIds}
                        payerId={expense.paidBy.id}
                        perPersonShare={perPersonShare}
                    />
                ) : (
                    <SingleColumnParticipants
                        participants={sortedParticipants}
                        coveredIds={coveredIds}
                        payerId={expense.paidBy.id}
                        perPersonShare={perPersonShare}
                    />
                )}
            </Box>

            {/* "You owe" callout */}
            {currentUserOwes > 0 && (
                <Box
                    sx={{
                        mt: 1,
                        p: 1.25,
                        borderRadius: '4px',
                        ...hardShadow,
                        backgroundColor: colors.primaryYellow,
                        textAlign: 'center',
                    }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: colors.primaryBlack }}>
                        You owe {expense.paidBy.firstName} {FormattedMoney('USD').format(currentUserOwes)}
                    </Typography>
                </Box>
            )}
        </Box>
    )
}

/* ── Shared participant row ── */

const ParticipantRow = ({
    user,
    isCovered,
    isPayer,
    perPersonShare,
    showAmount,
}: {
    user: UserSummary
    isCovered: boolean
    isPayer: boolean
    perPersonShare: number
    showAmount: boolean
}) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            py: 0.35,
        }}>
        <InitialsIcon
            name={user.firstName}
            initials={user.initials}
            iconColor={user.iconColor}
            sx={{
                width: 20,
                height: 20,
                fontSize: 8,
                opacity: isCovered ? 0.5 : 1,
                flexShrink: 0,
            }}
        />
        <Typography
            sx={{
                fontSize: 11,
                fontWeight: isPayer ? 700 : 400,
                color: colors.primaryBlack,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                lineHeight: 1.3,
            }}>
            {user.firstName}
            {isPayer && (
                <Typography
                    component="span"
                    sx={{ fontSize: 9, color: colors.primaryBrown, fontWeight: 600, ml: 0.5 }}>
                    payer
                </Typography>
            )}
            {isCovered && (
                <Typography
                    component="span"
                    sx={{ fontSize: 9, color: 'text.secondary', ml: 0.5 }}>
                    covered <IconGift size={9} color={colors.primaryRed} style={{ verticalAlign: 'middle' }} />
                </Typography>
            )}
        </Typography>

        {showAmount && (
            <Typography
                sx={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isCovered ? 'text.secondary' : colors.primaryBlack,
                    fontStyle: isCovered ? 'italic' : 'normal',
                    flexShrink: 0,
                    ml: 'auto',
                }}>
                {isCovered ? '$0' : FormattedMoney('USD').format(perPersonShare)}
            </Typography>
        )}
    </Box>
)

/* ── Single column (< 5 participants) ── */

const SingleColumnParticipants = ({
    participants,
    coveredIds,
    payerId,
    perPersonShare,
}: {
    participants: UserSummary[]
    coveredIds: Set<number>
    payerId: number
    perPersonShare: number
}) => (
    <Box sx={{ minWidth: 0 }}>
        {participants.map((user) => (
            <Box
                key={user.id}
                sx={{
                    '&:not(:last-child)': {
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    },
                }}>
                <ParticipantRow
                    user={user}
                    isCovered={coveredIds.has(user.id)}
                    isPayer={user.id === payerId}
                    perPersonShare={perPersonShare}
                    showAmount={coveredIds.size > 0}
                />
            </Box>
        ))}
    </Box>
)

/* ── Two user columns (≥ 5 participants) ── */

const TwoColumnParticipants = ({
    participants,
    coveredIds,
    payerId,
    perPersonShare,
}: {
    participants: UserSummary[]
    coveredIds: Set<number>
    payerId: number
    perPersonShare: number
}) => {
    const mid = Math.ceil(participants.length / 2)
    const left = participants.slice(0, mid)
    const right = participants.slice(mid)

    return (
        <Box sx={{ minWidth: 0, display: 'flex', gap: 1.5 }}>
            <Box sx={{ minWidth: 0 }}>
                {left.map((user) => (
                    <ParticipantRow
                        key={user.id}
                        user={user}
                        isCovered={coveredIds.has(user.id)}
                        isPayer={user.id === payerId}
                        perPersonShare={perPersonShare}
                        showAmount={false}
                    />
                ))}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                {right.map((user) => (
                    <ParticipantRow
                        key={user.id}
                        user={user}
                        isCovered={coveredIds.has(user.id)}
                        isPayer={user.id === payerId}
                        perPersonShare={perPersonShare}
                        showAmount={false}
                    />
                ))}
            </Box>
        </Box>
    )
}
