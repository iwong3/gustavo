'use client'

import { Box, Typography } from '@mui/material'
import { IconGift } from '@tabler/icons-react'

import { colors, hardShadow } from '@/lib/colors'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { SplitDonutChart } from './split-donut-chart'

import type { Expense } from '@/lib/types'

// Default colors for participants without an iconColor
const FALLBACK_COLORS = [
    '#6C8EBF', '#82B366', '#D6AB4C', '#B85450',
    '#9673A6', '#D79B00', '#23445D', '#AE4132',
]

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

    // Build donut segments
    const segments = expense.splitBetween.map((user, i) => {
        const isCovered = coveredIds.has(user.id)
        return {
            label: user.firstName,
            value: isCovered ? perPersonShare : perPersonShare, // equal visual size
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

            {/* Donut (left) + participant list (right) side-by-side */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                    p: 1.5,
                    borderRadius: '4px',
                    ...hardShadow,
                    backgroundColor: colors.primaryWhite,
                }}>
                {/* Donut chart — only for 2+ participants */}
                {splitCount > 1 && (
                    <Box sx={{ flexShrink: 0 }}>
                        <SplitDonutChart segments={segments} size={90} />
                    </Box>
                )}

                {/* Participant list */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {expense.splitBetween.map((user) => {
                        const isCovered = coveredIds.has(user.id)
                        const isPayer = user.id === expense.paidBy.id

                        return (
                            <Box
                                key={user.id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    py: 0.5,
                                    '&:not(:last-child)': {
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    },
                                }}>
                                <InitialsIcon
                                    name={user.firstName}
                                    initials={user.initials}
                                    iconColor={user.iconColor}
                                    sx={{
                                        width: 22,
                                        height: 22,
                                        fontSize: 9,
                                        opacity: isCovered ? 0.5 : 1,
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: isPayer ? 700 : 400,
                                        color: colors.primaryBlack,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        minWidth: 0,
                                    }}>
                                    {user.firstName}
                                    {isPayer && (
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: 10,
                                                color: colors.primaryBrown,
                                                fontWeight: 600,
                                                ml: 0.5,
                                            }}>
                                            payer
                                        </Typography>
                                    )}
                                    {isCovered && (
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: 10,
                                                color: 'text.secondary',
                                                ml: 0.5,
                                            }}>
                                            covered <IconGift size={10} color={colors.primaryRed} style={{ verticalAlign: 'middle' }} />
                                        </Typography>
                                    )}
                                </Typography>

                                {/* Share amount — only when covered participants exist */}
                                {coveredIds.size > 0 && (
                                    <Typography
                                        sx={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: isCovered ? 'text.secondary' : colors.primaryBlack,
                                            fontStyle: isCovered ? 'italic' : 'normal',
                                            flexShrink: 0,
                                        }}>
                                        {isCovered
                                            ? '$0'
                                            : FormattedMoney('USD').format(perPersonShare)
                                        }
                                    </Typography>
                                )}
                            </Box>
                        )
                    })}
                </Box>
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
