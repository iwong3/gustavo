'use client'

import { Box, Typography } from '@mui/material'
import { IconCheck, IconX } from '@tabler/icons-react'
import dayjs from 'dayjs'

import { cardSx, colors } from '@/lib/colors'
import type { SettlementRecord, UserSummary } from '@/lib/types'
import { InitialsIcon } from 'utils/icons'
import { openVenmoPayment } from 'utils/venmo'

const OWED_GREEN = '#2e7d32'
const VENMO_BLUE = '#008CFF'

// CSS `dashed` borders can't control dash length/spacing, so settled cards
// draw their border as an SVG background: longer dashes, wider gaps.
// stroke-width 3 is centered on the edge, so ~1.5px stays visible.
const settledDashedBorder = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='none' rx='4' ry='4' stroke='%23090401' stroke-width='3' stroke-dasharray='9 7' stroke-linecap='square'/%3E%3C/svg%3E")`

const formatUsd = (n: number | null | undefined) =>
    Number.isFinite(n)
        ? n!.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
          })
        : '—'

// ── Trip-settled progress ─────────────────────────────────────────────────────

/** Linear blend between two hex colors, t ∈ [0, 1]. */
function blendHex(from: string, to: string, t: number): string {
    const c = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
    const ch = (i: number) =>
        Math.round(c(from, i) + (c(to, i) - c(from, i)) * Math.min(Math.max(t, 0), 1))
    return `#${[0, 1, 2].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`
}

// Progress card bg shifts with how settled the trip is: pastel red (nothing
// paid) → pastel green (all paid, matching the celebration card)
const PROGRESS_RED = '#f9ded8'
const PROGRESS_GREEN = '#d4edda'

/**
 * Chunky segment bar showing how much of the trip's settle-up plan has been
 * paid. One segment per payment (recorded + outstanding); falls back to a
 * continuous fill when there are too many payments for readable segments.
 */
export function SettleProgressCard({
    settledCount,
    settledSum,
    remainingCount,
    remainingSum,
}: {
    settledCount: number
    settledSum: number
    remainingCount: number
    remainingSum: number
}) {
    const totalCount = settledCount + remainingCount
    const totalSum = settledSum + remainingSum
    const done = remainingCount === 0
    const fraction = totalSum > 0 ? settledSum / totalSum : 1

    return (
        <Box
            sx={{
                ...cardSx,
                backgroundColor: blendHex(PROGRESS_RED, PROGRESS_GREEN, fraction),
                paddingX: 1.75,
                paddingY: 1.5,
            }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 1,
                }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
                    Debts settled
                </Typography>
                <Typography
                    sx={{
                        fontSize: 12.5,
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                    {settledCount} of {totalCount}{' '}
                    {totalCount === 1 ? 'payment' : 'payments'}
                </Typography>
            </Box>
            {totalCount <= 12 ? (
                <Box sx={{ display: 'flex', gap: '4px', marginTop: 1 }}>
                    {Array.from({ length: totalCount }, (_, i) => (
                        <Box
                            key={i}
                            sx={{
                                flex: 1,
                                height: 12,
                                border: `1px solid ${colors.primaryBlack}`,
                                backgroundColor:
                                    i < settledCount
                                        ? OWED_GREEN
                                        : colors.primaryWhite,
                            }}
                        />
                    ))}
                </Box>
            ) : (
                <Box
                    sx={{
                        height: 12,
                        border: `1px solid ${colors.primaryBlack}`,
                        backgroundColor: colors.primaryWhite,
                        marginTop: 1,
                    }}>
                    <Box
                        sx={{
                            width: `${Math.round(fraction * 100)}%`,
                            height: '100%',
                            backgroundColor: OWED_GREEN,
                        }}
                    />
                </Box>
            )}
            <Typography
                sx={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    color: colors.primaryBrown,
                    marginTop: 0.75,
                }}>
                {done
                    ? `${formatUsd(settledSum)} paid · all settled`
                    : `${formatUsd(settledSum)} paid · ${formatUsd(remainingSum)} to go`}
            </Typography>
        </Box>
    )
}

// ── Shared row bits ───────────────────────────────────────────────────────────

const rowButtonSx = {
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'flexShrink': 0,
    'border': `1px solid ${colors.primaryBlack}`,
    'borderRadius': '4px',
    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
    'cursor': 'pointer',
    'userSelect': 'none',
    '&:active': {
        boxShadow: 'none',
        transform: 'translate(1.5px, 1.5px)',
    },
    'transition': 'transform 0.1s, box-shadow 0.1s',
} as const

/**
 * One outstanding payment. What it shows depends on the viewer:
 * - perspective person is the debtor → counterparty (creditor) avatar + name
 * - perspective person is the creditor → debtor avatar + name
 * - neither → both avatars and "A → B"
 * The section header carries the direction, so rows stay terse.
 */
export function SettleRow({
    debtor,
    creditor,
    amount,
    perspectiveId,
    youId,
    venmo,
    onTap,
    onMarkPaid,
    disabled,
}: {
    debtor: UserSummary
    creditor: UserSummary
    amount: number
    /** Person whose section grouping this row sits under. */
    perspectiveId: number
    /** The logged-in user — rendered as "You" in neutral rows. */
    youId: number
    /** Hand-off to Venmo (deep-links into the app with amount + note). */
    venmo?: { url: string; note: string } | null
    onTap: () => void
    onMarkPaid: () => void
    disabled?: boolean
}) {
    const isDebtorSide = String(debtor.id) === String(perspectiveId)
    const isCreditorSide = String(creditor.id) === String(perspectiveId)
    const counterparty = isDebtorSide ? creditor : debtor
    const nameOf = (u: UserSummary) =>
        String(u.id) === String(youId) ? 'You' : u.firstName

    const venmoButton = venmo && (
        <Box
            component="button"
            aria-label={`Pay ${counterparty.firstName} on Venmo`}
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                openVenmoPayment(venmo.url, amount, venmo.note)
            }}
            sx={{
                ...rowButtonSx,
                width: 28,
                height: 28,
                padding: 0,
                borderRadius: '50%',
                backgroundColor: VENMO_BLUE,
            }}>
            {/* Stand-in for the Venmo wordmark: bold italic V on brand blue */}
            <Typography
                component="span"
                sx={{
                    fontSize: 15,
                    fontWeight: 900,
                    fontStyle: 'italic',
                    lineHeight: 1,
                    color: colors.primaryWhite,
                    transform: 'translateX(-1px)',
                }}>
                v
            </Typography>
        </Box>
    )

    return (
        <Box
            onClick={onTap}
            sx={{
                ...cardSx,
                'display': 'flex',
                'alignItems': 'center',
                'gap': 1.25,
                'paddingX': 1.5,
                'paddingY': 1.1,
                'cursor': 'pointer',
                'userSelect': 'none',
                '&:active': {
                    boxShadow: 'none',
                    transform: 'translate(2px, 2px)',
                },
                'transition': 'transform 0.1s, box-shadow 0.1s',
            }}>
            {isDebtorSide || isCreditorSide ? (
                <InitialsIcon
                    name={counterparty.firstName}
                    initials={counterparty.initials}
                    iconColor={counterparty.iconColor}
                    sx={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}
                />
            ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <InitialsIcon
                        name={debtor.firstName}
                        initials={debtor.initials}
                        iconColor={debtor.iconColor}
                        sx={{ width: 24, height: 24, fontSize: 9 }}
                    />
                    <InitialsIcon
                        name={creditor.firstName}
                        initials={creditor.initials}
                        iconColor={creditor.iconColor}
                        sx={{
                            width: 24,
                            height: 24,
                            fontSize: 9,
                            marginLeft: '-6px',
                        }}
                    />
                </Box>
            )}
            {/* Name + Venmo hand-off sit together; amount + action right-aligned */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flex: 1,
                    minWidth: 0,
                }}>
                <Typography
                    sx={{
                        fontSize: isDebtorSide || isCreditorSide ? 13.5 : 13,
                        fontWeight: isDebtorSide || isCreditorSide ? 700 : 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                    {isDebtorSide || isCreditorSide
                        ? counterparty.firstName
                        : `${nameOf(debtor)} → ${nameOf(creditor)}`}
                </Typography>
                {venmoButton}
            </Box>
            <Typography
                sx={{
                    fontSize: 16,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                }}>
                {formatUsd(amount)}
            </Typography>
            <Box
                component="button"
                aria-label="Settle this debt"
                disabled={disabled}
                onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (!disabled) onMarkPaid()
                }}
                sx={{
                    ...rowButtonSx,
                    height: 28,
                    paddingX: 1.1,
                    fontSize: 11,
                    fontWeight: 800,
                    color: colors.primaryBlack,
                    backgroundColor: colors.primaryYellow,
                    opacity: disabled ? 0.5 : 1,
                }}>
                Settle
            </Box>
        </Box>
    )
}

/** A recorded payment: stamped, struck through, undoable. */
export function SettledRow({
    record,
    from,
    to,
    youId,
    onUndo,
    disabled,
}: {
    record: SettlementRecord
    from: UserSummary | undefined
    to: UserSummary | undefined
    youId: number
    onUndo: () => void
    disabled?: boolean
}) {
    const nameOf = (u: UserSummary | undefined) =>
        u ? (String(u.id) === String(youId) ? 'You' : u.firstName) : '?'

    return (
        <Box
            sx={{
                ...cardSx,
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                paddingX: 1.5,
                paddingY: 1.1,
                // Dashed + muted + flat (no card shadow) says "done"; the
                // check stamp keeps its mini shadow to stay on-theme
                border: 'none',
                boxShadow: 'none',
                backgroundImage: settledDashedBorder,
                backgroundColor: '#f5f1e3',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: '50%',
                    border: `1.5px solid ${OWED_GREEN}`,
                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                    backgroundColor: '#eef5ee',
                }}>
                <IconCheck size={14} stroke={2.5} color={OWED_GREEN} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#7a6f5b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                    {nameOf(from)} → {nameOf(to)}
                </Typography>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: '#9a9075' }}>
                    Paid {dayjs(record.settledOn + 'T00:00:00').format('MMM D')}
                </Typography>
            </Box>
            <Typography
                sx={{
                    fontSize: 14.5,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#7a6f5b',
                    textDecoration: 'line-through',
                }}>
                {formatUsd(record.amountUsd)}
            </Typography>
            <Box
                component="button"
                aria-label="Undo this payment"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) onUndo()
                }}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    padding: 0,
                    flexShrink: 0,
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    opacity: disabled ? 0.4 : 1,
                }}>
                <IconX size={16} stroke={2} color="#9a9075" />
            </Box>
        </Box>
    )
}
