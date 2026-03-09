import { Box, Collapse, Slide, Typography } from '@mui/material'
import { IconX, IconArrowRight, IconChevronDown } from '@tabler/icons-react'
import { createPortal } from 'react-dom'
import { useState } from 'react'
import { colors, hardShadow } from '@/lib/colors'
import { secondaryButtonSx } from '@/lib/form-styles'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { getPersonPairwiseDebts } from '@/lib/debt'
import { ReceiptsList } from 'components/receipts/receipts-list'

import type { Expense, UserSummary } from '@/lib/types'
import type { PersonPairwiseDebt, GroupedExpenses } from '@/lib/debt'

type Props = {
    open: boolean
    onClose: () => void
    userId: number | null
    participants: UserSummary[]
    participantById: Map<number, UserSummary>
    currentUserId: number
    debtMap: Map<number, Map<number, number>>
    expenses: Expense[]
}

export function DebtDetailDrawer({
    open,
    onClose,
    userId,
    participants,
    participantById,
    currentUserId,
    debtMap,
    expenses,
}: Props) {
    if (typeof document === 'undefined') return null
    if (!userId) return null

    const person = participantById.get(userId)
    if (!person) return null

    const isCurrentUser = userId === currentUserId
    const personName = isCurrentUser ? 'You' : person.firstName
    const pairwiseDebts = getPersonPairwiseDebts(userId, debtMap, expenses, participants)

    return createPortal(
        <>
            {open && (
                <Box
                    onClick={onClose}
                    sx={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.15)' }}
                />
            )}
            <Slide
                direction="up"
                in={open}
                mountOnEnter
                unmountOnExit
                easing={{ enter: 'ease-out', exit: 'ease-in' }}
                timeout={300}>
                <Box
                    sx={{
                        position: 'fixed',
                        top: 'calc(56px + env(safe-area-inset-top, 0px) + 8px)',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: colors.primaryWhite,
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        borderTop: `2px solid ${colors.primaryBlack}`,
                        boxShadow: `2px -2px 0px ${colors.primaryBlack}`,
                        zIndex: 1300,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                    {/* Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 2,
                            borderBottom: `1px solid ${colors.primaryBlack}`,
                        }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <InitialsIcon
                                name={person.firstName}
                                initials={person.initials}
                                sx={{ width: 36, height: 36, fontSize: 14 }}
                            />
                            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                                {isCurrentUser ? 'Your Debts' : `${personName}'s Debts`}
                            </Typography>
                        </Box>
                        <Box
                            onClick={onClose}
                            sx={{
                                ...secondaryButtonSx,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 32,
                                height: 32,
                                cursor: 'pointer',
                            }}>
                            <IconX size={18} />
                        </Box>
                    </Box>

                    {/* Scrollable content */}
                    <Box sx={{ flex: 1, overflowY: 'auto', padding: 2 }}>
                        {pairwiseDebts.length === 0 ? (
                            <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', paddingY: 4 }}>
                                All settled up!
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                                {pairwiseDebts.map((debt) => (
                                    <PairwiseSection
                                        key={debt.otherUserId}
                                        debt={debt}
                                        userId={userId}
                                        participantById={participantById}
                                        currentUserId={currentUserId}
                                        participants={participants}
                                    />
                                ))}
                            </Box>
                        )}
                    </Box>
                </Box>
            </Slide>
        </>,
        document.body
    )
}

// --- Pairwise section within the drawer ---

function PairwiseSection({
    debt,
    userId,
    participantById,
    currentUserId,
    participants,
}: {
    debt: PersonPairwiseDebt
    userId: number
    participantById: Map<number, UserSummary>
    currentUserId: number
    participants: UserSummary[]
}) {
    const [expanded, setExpanded] = useState(false)

    const other = participantById.get(debt.otherUserId)
    if (!other) return null

    const isCurrentUser = userId === currentUserId
    const isOtherCurrentUser = debt.otherUserId === currentUserId
    const personName = isCurrentUser ? 'You' : (participantById.get(userId)?.firstName ?? '')
    const otherName = isOtherCurrentUser ? 'You' : other.firstName

    const iOwe = debt.netAmount > 0 // positive means this person (userId) owes otherUser
    const debtorName = iOwe ? personName : otherName
    const creditorName = iOwe ? otherName : personName
    const debtorData = iOwe ? participantById.get(userId) : other
    const creditorData = iOwe ? other : participantById.get(userId)

    const participantCount = participants.length

    return (
        <Box>
            {/* Direction header — tap to expand/collapse */}
            <Box
                onClick={() => setExpanded((v) => !v)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    padding: 1,
                    backgroundColor: colors.secondaryYellow,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    ...hardShadow,
                }}>
                <IconChevronDown
                    size={16}
                    style={{
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        flexShrink: 0,
                    }}
                />
                {debtorData && (
                    <InitialsIcon
                        name={debtorData.firstName}
                        initials={debtorData.initials}
                        sx={{ width: 28, height: 28, fontSize: 12 }}
                    />
                )}
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {debtorName}
                </Typography>
                <IconArrowRight size={14} />
                {creditorData && (
                    <InitialsIcon
                        name={creditorData.firstName}
                        initials={creditorData.initials}
                        sx={{ width: 28, height: 28, fontSize: 12 }}
                    />
                )}
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {creditorName}
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, marginLeft: 'auto' }}>
                    {FormattedMoney().format(Math.abs(debt.netAmount))}
                </Typography>
            </Box>

            {/* Collapsible expense groups */}
            <Collapse in={expanded}>
                <Box sx={{ marginTop: 1 }}>
                    <ExpenseGroup
                        label="USD Expenses"
                        expenses={debt.expenses.usdExpenses}
                        participantCount={participantCount}
                    />
                    <ExpenseGroup
                        label="Foreign Currency Expenses"
                        expenses={debt.expenses.foreignExpenses}
                        participantCount={participantCount}
                        showExchangeInfo
                    />
                    <ExpenseGroup
                        label="Currency Exchanges"
                        expenses={debt.expenses.currencyExchangeExpenses}
                        participantCount={participantCount}
                    />
                </Box>
            </Collapse>
        </Box>
    )
}

// --- Expense group (USD / foreign / exchange) ---

function ExpenseGroup({
    label,
    expenses,
    participantCount,
    showExchangeInfo,
}: {
    label: string
    expenses: Expense[]
    participantCount: number
    showExchangeInfo?: boolean
}) {
    if (expenses.length === 0) return null

    // Compute group total (in USD)
    const groupTotal = expenses.reduce((sum, exp) => sum + exp.costConvertedUsd, 0)

    // For foreign expenses, compute effective blended rate
    let effectiveRate: number | null = null
    if (showExchangeInfo && expenses.length > 0) {
        const totalOriginal = expenses.reduce((sum, exp) => sum + exp.costOriginal, 0)
        const totalUsd = expenses.reduce((sum, exp) => sum + exp.costConvertedUsd, 0)
        if (totalUsd > 0) {
            effectiveRate = totalOriginal / totalUsd
        }
    }

    const currency = expenses[0]?.currency ?? 'USD'

    return (
        <Box sx={{ marginBottom: 1.5 }}>
            {/* Group header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingX: 1,
                    paddingY: 0.5,
                }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {effectiveRate != null && (
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>
                            ~{effectiveRate.toFixed(1)} {currency}/$
                        </Typography>
                    )}
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                        {FormattedMoney().format(groupTotal)}
                    </Typography>
                </Box>
            </Box>

            {/* Expense list */}
            <Box
                sx={{
                    borderLeft: `2px solid ${colors.primaryBlack}20`,
                    marginLeft: 1,
                    paddingLeft: 1,
                }}>
                <ReceiptsList expenses={expenses} />
            </Box>
        </Box>
    )
}
