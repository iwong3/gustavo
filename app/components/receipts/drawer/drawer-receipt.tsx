'use client'

import { Box, Typography } from '@mui/material'
import { IconAlertTriangle, IconGift } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { colors } from '@/lib/colors'
import { expenseShareForUser } from '@/lib/spend'
import { FormattedMoney } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'

import type { Expense, UserSummary } from '@/lib/types'

// ── The receipt ───────────────────────────────────────────────────────────────
//
// The money half of the expense, drawn as a thermal receipt. Top to bottom it
// answers "how much was it" first: one big centred TOTAL in USD, with the
// original amount and rate on a single line under it. Then the split.
//
// People rows are the exception to the receipt styling: avatars and
// mixed-case names carry identity that ALL-CAPS mono destroys. So the money is
// mono, the people rows are the app's normal type — a printed receipt with the
// app's people stickers on it.
//
// Legibility floor (Nov 2026 pass): nothing under 11px, names and amounts at
// 15px, and a pinned mono face (JetBrains Mono, self-hosted via next/font in
// app/layout.tsx) — `ui-monospace` is SF Mono on iOS but has no Android
// equivalent, where it fell back to thin, wide faces.
//
// It deliberately ends with the barcode and no call to action: debts are
// settled on the debts page, never per-expense.

const BOBA_COST = 6.5
const BOBA_EMOJI = '🧋'

const monoFont =
    'var(--font-receipt-mono), ui-monospace, "Cascadia Mono", Consolas, monospace'
/** Secondary text on the paper — darker than text.secondary, which washes out
 *  on the warm off-white at receipt sizes. */
const softInk = `${colors.primaryBlack}b3`

/**
 * Torn bottom edge, cut out of the paper itself with a mask.
 *
 * Two things this fixes over stacking separate triangle strips above and below
 * the paper: the teeth are literally the same element as the paper (so they
 * can't read as detached), and `drop-shadow` traces the real torn silhouette.
 *
 * Only the BOTTOM tears — that's the edge a receipt is torn from, and it's the
 * only edge a bottom-right shadow can physically fall on. A torn TOP edge puts
 * notches above the paper, and the hard shadow shows through each one as a dark
 * triangle floating over the header — shadow above the object, which is exactly
 * the "slightly awkward" tell.
 *
 * Falls back to a plain rectangle if `mask` is unsupported — no visual break.
 */
const TOOTH = 12
const tornBottomMask = `conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / ${TOOTH}px 100%`

/** "¥151.20" — the rate always shows two decimals, even for zero-decimal
 *  currencies (FormattedMoney would print JPY as "¥151"). */
const formatRate = (rate: number, currency: string) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(rate)

const Divider = () => (
    <Box
        sx={{
            borderTop: `1px dashed ${colors.primaryBlack}8c`,
            marginY: 1.25,
        }}
    />
)

/** Outlined tag after a name: PAID / YOU */
const Pill = ({ label }: { label: string }) => (
    <Box
        component="span"
        sx={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.4px',
            lineHeight: 1.4,
            paddingX: '5px',
            border: `1px solid ${colors.primaryBlack}`,
            borderRadius: '3px',
            backgroundColor: colors.primaryWhite,
            color: colors.primaryBlack,
        }}>
        {label}
    </Box>
)

/** The big centred number and the line(s) under it */
const HeroTotal = ({
    caption,
    amount,
    isError,
    children,
}: {
    caption: string
    amount: string
    isError: boolean
    children?: ReactNode
}) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            paddingTop: 0.75,
            textAlign: 'center',
        }}>
        <Typography
            sx={{
                fontFamily: monoFont,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1.5px',
                color: colors.primaryBrown,
            }}>
            {caption}
        </Typography>
        <Typography
            sx={{
                fontFamily: monoFont,
                fontSize: 38,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-1px',
                fontVariantNumeric: 'tabular-nums',
                color: isError ? colors.primaryRed : colors.primaryBlack,
            }}>
            {amount}
        </Typography>
        {children}
    </Box>
)

/** A line under the hero: "¥8,400 at ¥151.20/$" */
const HeroSubline = ({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'brown' }) => (
    <Typography
        sx={{
            fontFamily: monoFont,
            fontSize: tone === 'brown' ? 12 : 13,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            color: tone === 'brown' ? colors.primaryBrown : softInk,
            '& b': { color: colors.primaryBlack, fontWeight: 700 },
        }}>
        {children}
    </Typography>
)

const ParticipantLine = ({
    user,
    amount,
    isPayer,
    isCovered,
    isCurrentUser,
    treatedBy,
    coversNote,
}: {
    user: UserSummary
    amount: number
    isPayer: boolean
    isCovered: boolean
    isCurrentUser: boolean
    /** Who covers the treated shares, e.g. "Ivan + Jenny". */
    treatedBy: string
    /** For a coverer: "incl. $13.89 for Sarah" — why their row is bigger. */
    coversNote: string | null
}) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            paddingY: '7px',
            // "You" is what the eye hunts for — give it the highlight, and let
            // it bleed to the paper's edge so it reads as a marker stroke
            ...(isCurrentUser && {
                marginX: -1,
                paddingX: 1,
                borderRadius: '4px',
                backgroundColor: colors.primaryYellow,
            }),
            ...(!isCurrentUser && {
                borderBottom: `1px solid ${colors.primaryBlack}1a`,
                '&:last-of-type': { borderBottom: 'none' },
            }),
        }}>
        <InitialsIcon
            name={user.firstName}
            initials={user.initials}
            iconColor={user.iconColor}
            sx={{ width: 28, height: 28, fontSize: 11, flexShrink: 0, opacity: isCovered ? 0.55 : 1 }}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 15,
                        fontWeight: isPayer || isCurrentUser ? 700 : 500,
                        lineHeight: 1.3,
                        color: colors.primaryBlack,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                    }}>
                    {user.firstName}
                </Typography>
                {isPayer && <Pill label="PAID" />}
                {isCurrentUser && <Pill label="YOU" />}
            </Box>
            {isCovered ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                    <IconGift size={12} color={colors.primaryRed} style={{ flexShrink: 0 }} />
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: softInk,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                        Treated by {treatedBy}
                    </Typography>
                </Box>
            ) : (
                coversNote && (
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: softInk,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                        {coversNote}
                    </Typography>
                )
            )}
        </Box>

        <Typography
            sx={{
                marginLeft: 'auto',
                flexShrink: 0,
                fontFamily: monoFont,
                fontSize: 15,
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
    // their own hero shape instead of the foreign-amount one.
    const isExchange = expense.categorySlug === 'currency_exchange'
    const hasForeignAmount = !isExchange && expense.currency !== 'USD'
    const exchangeRateOut =
        isExchange && expense.localCurrencyReceived != null && expense.costOriginal > 0
            ? expense.localCurrencyReceived / expense.costOriginal
            : null

    // A foreign-currency expense valuing at $0 means no rate exists for it: no
    // one has recorded a currency exchange in that currency (and no legacy
    // converted value is stored). Distinct from conversionError — that's a
    // backfill-time failure; this one the user can fix by logging an exchange.
    const noRate =
        hasForeignAmount && costUsd === 0 && expense.costOriginal > 0 && !expense.conversionError

    const splitIds = new Set(expense.splitBetween.map((u) => String(u.id)))
    const coveredIds = new Set(expense.coveredParticipants.map((u) => String(u.id)))
    // Who covers the treats — the marked coverers still in the split, else
    // the payer (lib/expense-shares' rule)
    const coverers = (expense.coveringParticipants ?? []).filter(
        (u) => !coveredIds.has(String(u.id)) && splitIds.has(String(u.id))
    )
    const treatedBy = (coverers.length > 0 ? coverers : [expense.paidBy])
        .map((u) => u.firstName)
        .join(' + ')
    // Treated people the engine actually counts (it ignores any not in the split)
    const treatedNames = expense.coveredParticipants
        .filter((u) => splitIds.has(String(u.id)))
        .map((u) => u.firstName)
    const treatedLabel =
        treatedNames.length <= 2 ? treatedNames.join(' + ') : `${treatedNames.length} people`

    // The per-row amount comes from expenseShareForUser — the same function the
    // debts page uses — rather than being recomputed here. This UI used to do
    // its own math (dividing by only the untreated people) and silently
    // disagreed with the debt engine whenever anyone was treated; routing both
    // through one function is what stops that from coming back.
    //
    // The engine's rule: cost divides across EVERY participant, treated ones
    // included, and the treated shares are split across the coverers (the
    // payer by default). So the column sums to TOTAL — coverers carry their
    // own share plus their part of the treat, and nobody is charged twice.
    const splitCount = expense.isEveryone
        ? tripParticipantCount
        : expense.splitBetween.length
    const splitCost = splitCount > 0 ? costUsd / splitCount : 0
    const payerInSplit = splitIds.has(String(expense.paidBy.id))
    const amountFor = (user: UserSummary) =>
        expenseShareForUser(expense, user.id, costUsd, tripParticipantCount)

    // A coverer's row is bigger than the base share; say why. The extra is
    // whatever the engine gave them beyond their own share (none if they're
    // outside the split, e.g. a payer who isn't eating).
    const coversNoteFor = (user: UserSummary, amount: number) => {
        if (treatedNames.length === 0 || coveredIds.has(String(user.id))) return null
        const ownShare = splitIds.has(String(user.id)) ? splitCost : 0
        const extra = amount - ownShare
        if (!(extra > 0.005)) return null
        return `incl. ${FormattedMoney('USD').format(extra)} for ${treatedLabel}`
    }

    const bobaCount = costUsd > 0 ? Math.round((costUsd / BOBA_COST) * 10) / 10 : 0
    // Boba is a joke about spending, not about swapping money
    const showBoba = bobaCount > 0 && !expense.conversionError && !isExchange

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
    // With treats, rows differ from the even split — "each" would be a lie
    const perHeadLabel = `${FormattedMoney('USD').format(splitCost)} ${
        treatedNames.length > 0 ? 'base share' : 'each'
    }`

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
    // (not box-shadow) so the hard shadow traces the torn bottom edge rather
    // than squaring it off — that's what makes it read as a shadow.
    return (
        <Box
            sx={{
                marginX: 2.5,
                marginBottom: 2,
                filter: `drop-shadow(3px 3px 0 ${colors.primaryBlack})`,
            }}>
            <Box
                sx={{
                    backgroundColor: colors.primaryWhite,
                    // Bottom padding clears the teeth (they bite ~TOOTH/2 deep)
                    padding: `12px 16px ${TOOTH}px`,
                    // Border only where the shadow isn't: the drop-shadow already
                    // draws the bottom and right, so top + left complete the
                    // outline instead of doubling it. The mask trims the border
                    // along the torn edge for free — it's the same element.
                    borderTop: `1px solid ${colors.primaryBlack}`,
                    borderLeft: `1px solid ${colors.primaryBlack}`,
                    WebkitMask: tornBottomMask,
                    mask: tornBottomMask,
                }}>
                <Typography
                    sx={{
                        fontFamily: monoFont,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '2px',
                        textAlign: 'center',
                        color: colors.primaryBrown,
                    }}>
                    GUSTAVO EXPENSE CO.
                </Typography>

                <HeroTotal
                    caption={isExchange ? 'PAID' : 'TOTAL'}
                    amount={FormattedMoney('USD').format(costUsd)}
                    isError={expense.conversionError || noRate}>
                    {hasForeignAmount && (
                        <HeroSubline>
                            <b>{FormattedMoney(expense.currency).format(expense.costOriginal)}</b>
                            {expense.exchangeRate != null &&
                                ` at ${formatRate(expense.exchangeRate, expense.currency)}/$`}
                        </HeroSubline>
                    )}
                    {/* What you got for the USD — the point of an exchange */}
                    {isExchange && expense.localCurrencyReceived != null && (
                        <HeroSubline>
                            <b>
                                {FormattedMoney(expense.currency, 0).format(
                                    expense.localCurrencyReceived
                                )}
                            </b>
                            {' received'}
                            {exchangeRateOut != null &&
                                ` at ${formatRate(exchangeRateOut, expense.currency)}/$`}
                        </HeroSubline>
                    )}
                    {showBoba && (
                        <HeroSubline tone="brown">
                            ≈ {bobaCount} {bobaCount === 1 ? 'boba' : 'bobas'} {BOBA_EMOJI}
                        </HeroSubline>
                    )}
                </HeroTotal>

                {(expense.conversionError || noRate) && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                            marginTop: 0.75,
                        }}>
                        <IconAlertTriangle size={14} color={colors.primaryRed} style={{ flexShrink: 0 }} />
                        <Typography
                            sx={{
                                fontFamily: monoFont,
                                fontSize: 11,
                                fontWeight: 700,
                                color: colors.primaryRed,
                                textAlign: 'center',
                            }}>
                            {expense.conversionError
                                ? 'COULD NOT CONVERT TO USD'
                                : `NO ${expense.currency} RATE — LOG A CURRENCY EXCHANGE`}
                        </Typography>
                    </Box>
                )}

                <Divider />

                {/* People */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 1,
                        marginBottom: 0.5,
                    }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: colors.primaryBlack }}>
                        {splitLabel}
                    </Typography>
                    {splitCount > 1 && (
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: softInk }}>
                            {perHeadLabel}
                        </Typography>
                    )}
                </Box>

                {/* Own wrapper so :last-of-type finds the last row — as
                    siblings of the Dividers (also divs) it never matched */}
                <Box>
                    {rows.map((user) => {
                        const amount = amountFor(user)
                        return (
                            <ParticipantLine
                                key={user.id}
                                user={user}
                                amount={amount}
                                isPayer={String(user.id) === String(expense.paidBy.id)}
                                isCovered={coveredIds.has(String(user.id))}
                                isCurrentUser={String(user.id) === String(currentUserId)}
                                treatedBy={treatedBy}
                                coversNote={coversNoteFor(user, amount)}
                            />
                        )
                    })}
                </Box>

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
                            fontSize: 11,
                            fontWeight: 500,
                            letterSpacing: '0.4px',
                            textAlign: 'center',
                            color: softInk,
                        }}>
                        {finePrint}
                    </Typography>
                )}
            </Box>
        </Box>
    )
}
