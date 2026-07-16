'use client'

import { Box, Typography } from '@mui/material'
import { IconAlertTriangle, IconGift } from '@tabler/icons-react'

import { colors } from '@/lib/colors'
import { expenseShareForUser } from '@/lib/spend'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'

import type { Expense, UserSummary } from '@/lib/types'

// ── The receipt ───────────────────────────────────────────────────────────────
//
// The money half of the expense, drawn as a thermal receipt: amount → rate →
// total → per-head is genuinely receipt-shaped content, and dot leaders + mono
// digits make it read BETTER here than in a card.
//
// People are the exception, and the reason this isn't a full-page receipt:
// avatars and mixed-case names carry identity that ALL-CAPS mono destroys. So
// the ledger lines are mono, the people rows are the app's normal type — a
// printed receipt with the app's people stickers on it.
//
// It deliberately ends with the barcode and no call to action: debts are
// settled on the debts page, never per-expense.

const BOBA_COST = 6.5
const BOBA_EMOJI = '🧋'
const LEADER_COLOR = '#b9b09a'

const monoFont = 'ui-monospace, "Cascadia Mono", Consolas, monospace'

/** Torn paper edge — a zigzag masked out of the receipt's top/bottom. */
const TearEdge = ({ flip = false }: { flip?: boolean }) => (
    <Box
        sx={{
            height: 9,
            backgroundImage: `linear-gradient(45deg, ${colors.primaryWhite} 5px, transparent 0), linear-gradient(-45deg, ${colors.primaryWhite} 5px, transparent 0)`,
            backgroundSize: '12px 12px',
            backgroundRepeat: 'repeat-x',
            ...(flip && { transform: 'scaleY(-1)' }),
        }}
    />
)

const Divider = () => (
    <Box
        sx={{
            borderTop: `1.5px dashed ${colors.primaryBlack}73`,
            marginY: 1,
        }}
    />
)

/** A ledger line: label ···················· value */
const LedgerLine = ({
    label,
    value,
    big = false,
    valueColor,
}: {
    label: string
    value: string
    big?: boolean
    valueColor?: string
}) => (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
        <Typography
            sx={{
                fontFamily: monoFont,
                fontSize: big ? 16 : 12,
                fontWeight: big ? 800 : 400,
                lineHeight: 1.7,
                color: colors.primaryBlack,
                whiteSpace: 'nowrap',
            }}>
            {label}
        </Typography>
        {/* Dot leader — takes the slack so the value stays flush right */}
        <Box
            sx={{
                flex: 1,
                borderBottom: `2px dotted ${LEADER_COLOR}`,
                transform: 'translateY(-3px)',
            }}
        />
        <Typography
            sx={{
                fontFamily: monoFont,
                fontSize: big ? 16 : 12,
                fontWeight: big ? 800 : 400,
                lineHeight: 1.7,
                fontVariantNumeric: 'tabular-nums',
                color: valueColor ?? colors.primaryBlack,
                whiteSpace: 'nowrap',
            }}>
            {value}
        </Typography>
    </Box>
)

const ParticipantLine = ({
    user,
    amount,
    isPayer,
    isCovered,
    isCurrentUser,
    payerFirstName,
}: {
    user: UserSummary
    amount: number
    isPayer: boolean
    isCovered: boolean
    isCurrentUser: boolean
    payerFirstName: string
}) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            paddingY: 0.5,
            // "You" is what the eye hunts for — give it the highlight, and let
            // it bleed to the paper's edge so it reads as a marker stroke
            ...(isCurrentUser && {
                marginX: -1,
                paddingX: 1,
                borderRadius: '3px',
                backgroundColor: colors.primaryYellow,
            }),
            ...(!isCurrentUser && {
                borderBottom: `1px solid ${colors.primaryBlack}14`,
                '&:last-of-type': { borderBottom: 'none' },
            }),
        }}>
        <InitialsIcon
            name={user.firstName}
            initials={user.initials}
            iconColor={user.iconColor}
            sx={{ width: 22, height: 22, fontSize: 9, flexShrink: 0, opacity: isCovered ? 0.55 : 1 }}
        />
        <Typography
            sx={{
                fontSize: 12.5,
                fontWeight: isPayer || isCurrentUser ? 700 : 400,
                color: colors.primaryBlack,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
            }}>
            {user.firstName}
        </Typography>

        {isPayer && (
            <Typography
                sx={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    color: colors.primaryBrown,
                    flexShrink: 0,
                }}>
                PAYER
            </Typography>
        )}
        {isCurrentUser && !isPayer && (
            <Typography
                sx={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    color: colors.primaryBrown,
                    flexShrink: 0,
                }}>
                YOU
            </Typography>
        )}
        {isCovered && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
                <IconGift size={11} color={colors.primaryRed} style={{ flexShrink: 0 }} />
                <Typography
                    sx={{
                        fontSize: 10.5,
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                    treated by {payerFirstName}
                </Typography>
            </Box>
        )}

        <Typography
            sx={{
                marginLeft: 'auto',
                flexShrink: 0,
                fontFamily: monoFont,
                fontSize: 12.5,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: isCovered ? 'text.secondary' : colors.primaryBlack,
            }}>
            {FormattedMoney('USD').format(amount)}
        </Typography>
    </Box>
)

interface DrawerReceiptProps {
    expense: Expense
    costUsd: number
    currentUserId: number
    tripParticipantCount: number
    /** 1-based position within the list the user came from */
    expenseIndex: number
    totalExpenses: number
    dayNumber: number | null
    totalDays: number | null
}

export const DrawerReceipt = ({
    expense,
    costUsd,
    currentUserId,
    tripParticipantCount,
    expenseIndex,
    totalExpenses,
    dayNumber,
    totalDays,
}: DrawerReceiptProps) => {
    // Currency-exchange rows are stored inside out: costOriginal is the USD
    // PAID and `currency` names the currency RECEIVED, not the currency of
    // costOriginal (see lib/spend.ts § computeBlendedRates). Formatting
    // costOriginal as `currency` would print "¥200" for $200 — so exchanges get
    // their own ledger shape instead of the foreign-amount one.
    const isExchange = expense.categorySlug === 'currency_exchange'
    const hasForeignAmount = !isExchange && expense.currency !== 'USD'
    const exchangeRateOut =
        isExchange && expense.localCurrencyReceived != null && expense.costOriginal > 0
            ? expense.localCurrencyReceived / expense.costOriginal
            : null

    const coveredIds = new Set(expense.coveredParticipants.map((u) => String(u.id)))

    // The per-row amount comes from expenseShareForUser — the same function the
    // debts page uses — rather than being recomputed here. This UI used to do
    // its own math (dividing by only the untreated people) and silently
    // disagreed with the debt engine whenever anyone was treated; routing both
    // through one function is what stops that from coming back.
    //
    // The engine's rule: cost divides across EVERY participant, treated ones
    // included, and each treated share is reattributed to the payer. So the
    // column sums to TOTAL — the payer carries their own share plus whatever
    // they picked up, and nobody is charged twice.
    const splitCount = expense.isEveryone
        ? tripParticipantCount
        : expense.splitBetween.length
    const splitCost = splitCount > 0 ? costUsd / splitCount : 0
    const payerInSplit = expense.splitBetween.some(
        (u) => String(u.id) === String(expense.paidBy.id)
    )
    const amountFor = (user: UserSummary) =>
        expenseShareForUser(expense, user.id, costUsd, tripParticipantCount)

    const bobaCount = costUsd > 0 ? Math.round((costUsd / BOBA_COST) * 10) / 10 : 0

    // Payer first, then alphabetical. A payer outside the split still gets a
    // row: they're who paid, and if they treated anyone they carry that cost —
    // without the row, both facts vanish and the column stops summing to TOTAL.
    const sorted = [...expense.splitBetween].sort((a, b) => {
        if (String(a.id) === String(expense.paidBy.id)) return -1
        if (String(b.id) === String(expense.paidBy.id)) return 1
        return a.firstName.localeCompare(b.firstName)
    })
    const rows = payerInSplit ? sorted : [expense.paidBy, ...sorted]

    const splitLabel = splitCount === 1 ? 'Not split' : `Split ${splitCount} ways`

    // Fine print carries the receipt-shaped metadata (where this sits in the
    // trip). Who filed it stays in prose in the page footer — a receipt would
    // print a serial number, not a sentence.
    const finePrint = [
        totalExpenses > 0 ? `EXPENSE ${expenseIndex + 1}/${totalExpenses}` : null,
        dayNumber && totalDays ? `DAY ${dayNumber}/${totalDays}` : null,
    ]
        .filter(Boolean)
        .join(' · ')

    // No outer card: the torn paper is already its own container, and a border
    // around it just drew a box around a thing that isn't a box. drop-shadow
    // (not box-shadow) so the hard shadow follows the zigzag tear instead of
    // squaring it off.
    return (
        <Box
            sx={{
                marginX: 2.5,
                marginBottom: 2,
                filter: `drop-shadow(3px 3px 0 ${colors.primaryBlack}e6)`,
            }}>
            <TearEdge flip />
            <Box sx={{ backgroundColor: colors.primaryWhite, padding: '12px 16px 10px' }}>
                    <Typography
                        sx={{
                            fontFamily: monoFont,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '2.5px',
                            textAlign: 'center',
                            color: colors.primaryBrown,
                        }}>
                        * * * GUSTAVO EXPENSE CO. * * *
                    </Typography>

                    <Divider />

                    {/* Ledger */}
                    {hasForeignAmount && (
                        <LedgerLine
                            label={`AMOUNT (${expense.currency})`}
                            value={FormattedMoney(expense.currency).format(expense.costOriginal)}
                        />
                    )}
                    {hasForeignAmount && expense.exchangeRate != null && (
                        <LedgerLine
                            label="RATE"
                            value={`${expense.exchangeRate.toFixed(2)} ${expense.currency} / $`}
                        />
                    )}
                    <LedgerLine
                        label={isExchange ? 'PAID (USD)' : 'TOTAL (USD)'}
                        value={FormattedMoney('USD').format(costUsd)}
                        big
                        valueColor={expense.conversionError ? colors.primaryRed : undefined}
                    />

                    {expense.conversionError && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5,
                                marginTop: 0.5,
                            }}>
                            <IconAlertTriangle size={13} color={colors.primaryRed} />
                            <Typography
                                sx={{
                                    fontFamily: monoFont,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: colors.primaryRed,
                                }}>
                                COULD NOT CONVERT TO USD
                            </Typography>
                        </Box>
                    )}

                    {/* What you got for the USD — the point of an exchange */}
                    {isExchange && expense.localCurrencyReceived != null && (
                        <LedgerLine
                            label={`RECEIVED (${expense.currency})`}
                            value={FormattedMoney(expense.currency, 0).format(
                                expense.localCurrencyReceived
                            )}
                        />
                    )}
                    {exchangeRateOut != null && (
                        <LedgerLine
                            label="RATE"
                            value={`${exchangeRateOut.toFixed(2)} ${expense.currency} / $`}
                        />
                    )}

                    {/* Boba is a joke about spending, not about swapping money */}
                    {bobaCount > 0 && !expense.conversionError && !isExchange && (
                        <Typography
                            sx={{
                                fontFamily: monoFont,
                                fontSize: 11,
                                textAlign: 'center',
                                color: colors.primaryBrown,
                            }}>
                            ≈ {bobaCount} {bobaCount === 1 ? 'BOBA' : 'BOBAS'} {BOBA_EMOJI}
                        </Typography>
                    )}

                    <Divider />

                    {/* People */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 0.5,
                        }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: colors.primaryBlack }}>
                            {splitLabel}
                        </Typography>
                        {splitCount > 1 && (
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
                                {FormattedMoney('USD').format(splitCost)} each
                            </Typography>
                        )}
                    </Box>

                    {rows.map((user) => (
                        <ParticipantLine
                            key={user.id}
                            user={user}
                            amount={amountFor(user)}
                            isPayer={String(user.id) === String(expense.paidBy.id)}
                            isCovered={coveredIds.has(String(user.id))}
                            isCurrentUser={String(user.id) === String(currentUserId)}
                            payerFirstName={expense.paidBy.firstName}
                        />
                    ))}

                    <Divider />

                    {/* Barcode — pure decoration, encodes nothing */}
                    <Box
                        aria-hidden
                        sx={{
                            height: 26,
                            width: '62%',
                            margin: '9px auto 3px',
                            backgroundImage: `repeating-linear-gradient(90deg, ${colors.primaryBlack} 0 2px, transparent 2px 5px, ${colors.primaryBlack} 5px 6px, transparent 6px 8px, ${colors.primaryBlack} 8px 11px, transparent 11px 13px, ${colors.primaryBlack} 13px 14px, transparent 14px 18px)`,
                        }}
                    />
                    {finePrint && (
                        <Typography
                            sx={{
                                fontFamily: monoFont,
                                fontSize: 9.5,
                                letterSpacing: '0.4px',
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}>
                            {finePrint}
                        </Typography>
                    )}
            </Box>
            <TearEdge />
        </Box>
    )
}
