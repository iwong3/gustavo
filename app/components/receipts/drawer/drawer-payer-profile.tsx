'use client'

import { Box, Collapse, Link, Typography } from '@mui/material'
import { IconCurrencyDollar, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'

import { colors, hardShadow } from '@/lib/colors'
import { InitialsIcon } from 'utils/icons'
import { FormattedMoney } from 'utils/currency'

import type { Expense, UserSummary } from '@/lib/types'

interface DrawerPayerProfileProps {
    payer: UserSummary
    allExpenses: Expense[] // all UNFILTERED trip expenses for stats
    getUsdValue: (exp: Expense) => number
    currentUserId: number
}

export const DrawerPayerProfile = ({
    payer,
    allExpenses,
    getUsdValue,
    currentUserId,
}: DrawerPayerProfileProps) => {
    const [historyOpen, setHistoryOpen] = useState(false)

    // Payer trip stats — always computed from full (unfiltered) trip expenses
    const payerExpenses = allExpenses.filter((e) => e.paidBy.id === payer.id)
    const payerTotal = payerExpenses.reduce((sum, e) => sum + getUsdValue(e), 0)

    // "Share history with payer" — how many times current user was covered by this payer
    const coveredByPayer = allExpenses.filter((e) =>
        e.paidBy.id === payer.id &&
        e.coveredParticipants.some((u) => u.id === currentUserId)
    )
    const coveredTotal = coveredByPayer.reduce((sum, e) => {
        const activeSplit = e.splitBetween.length - e.coveredParticipants.length
        return sum + (activeSplit > 0 ? getUsdValue(e) / activeSplit : 0)
    }, 0)

    const showCoveredHistory = coveredByPayer.length > 0 && payer.id !== currentUserId

    return (
        <Box sx={{ mx: 2.5, mb: 2 }}>
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: '4px',
                    ...hardShadow,
                    backgroundColor: colors.primaryWhite,
                }}>
                {/* Payer info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <InitialsIcon
                        name={payer.firstName}
                        initials={payer.initials}
                        iconColor={payer.iconColor}
                        sx={{ width: 36, height: 36 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            sx={{ fontSize: 14, fontWeight: 700, color: colors.primaryBlack }}>
                            Paid by {payer.firstName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {FormattedMoney('USD', 0).format(payerTotal)} paid across {payerExpenses.length} expense{payerExpenses.length !== 1 ? 's' : ''} this trip
                        </Typography>
                    </Box>

                    {/* Venmo link */}
                    {payer.venmoUrl && (
                        <Link
                            href={payer.venmoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                flexShrink: 0,
                                fontSize: 12,
                                fontWeight: 600,
                                color: colors.primaryBlack,
                                textDecoration: 'none',
                                px: 1,
                                py: 0.5,
                                borderRadius: '4px',
                                border: `1px solid ${colors.primaryBlack}`,
                                backgroundColor: colors.primaryWhite,
                                '&:hover': {
                                    backgroundColor: colors.secondaryYellow,
                                },
                                transition: 'background-color 150ms ease',
                            }}>
                            <IconCurrencyDollar size={14} />
                            Venmo
                        </Link>
                    )}
                </Box>

                {/* Covered history */}
                {showCoveredHistory && (
                    <Box sx={{ mt: 1 }}>
                        <Box
                            onClick={() => setHistoryOpen(!historyOpen)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                cursor: 'pointer',
                                py: 0.5,
                            }}>
                            {historyOpen
                                ? <IconChevronDown size={14} color={colors.primaryBlack} />
                                : <IconChevronRight size={14} color={colors.primaryBlack} />
                            }
                            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}>
                                You&apos;ve been covered by {payer.firstName} {coveredByPayer.length} time{coveredByPayer.length !== 1 ? 's' : ''}
                                {' ('}
                                {FormattedMoney('USD').format(coveredTotal)} total)
                            </Typography>
                        </Box>
                        <Collapse in={historyOpen}>
                            <Box sx={{ pl: 2.5, pt: 0.5 }}>
                                {coveredByPayer.map((exp) => (
                                    <Typography
                                        key={exp.id}
                                        sx={{ fontSize: 12, color: 'text.secondary', py: 0.25 }}>
                                        {exp.name} ({exp.date})
                                    </Typography>
                                ))}
                            </Box>
                        </Collapse>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
