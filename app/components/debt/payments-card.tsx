'use client'

import { Box, Typography } from '@mui/material'
import {
    IconArrowBackUp,
    IconCheck,
    IconChevronDown,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useState } from 'react'

import { cardSx, colors, pressRowSx, toneColors } from '@/lib/colors'
import type { UserSummary } from '@/lib/types'
import { AnimatedHeight } from 'components/animated-height'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { InitialsIcon } from 'utils/icons'
import { openVenmoPayment } from 'utils/venmo'

import type { PlanPaymentRow } from './balance-card'
import { ledgerUsd } from './ledger-money'

const VENMO_BLUE = '#008CFF'
const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
const RULE = `1px solid ${colors.primaryBlack}1a`
const MUTED = '#7a6f5b'
// The person on show's own payments are tinted so they're found first
const MINE_BG = `${colors.primaryYellow}26`

export type OtherPaymentRow = {
    key: string
    debtor: UserSummary
    creditor: UserSummary
    cents: number
    canSettle: boolean
    pending: boolean
}

export type SettledRecordRow = {
    id: number
    from: UserSummary | undefined
    to: UserSummary | undefined
    cents: number
    settledOn: string
    canUndo: boolean
}

/**
 * Every payment in one place, under the chart: the person on show's own
 * (Venmo + Settle), everyone else's (Settle where allowed), then the ones
 * already made, folded, struck through, swipe to undo. It sits above the
 * expenses a tapped row opens, so nothing in it moves when they do.
 */
export function PaymentsCard({
    mine,
    others,
    settled,
    isYou,
    personName,
    youId,
    onSettle,
    onUndo,
}: {
    mine: PlanPaymentRow[]
    others: OtherPaymentRow[]
    settled: SettledRecordRow[]
    /** The person on show is the logged-in user. */
    isYou: boolean
    personName: string
    /** The logged-in user — "You" in names. */
    youId: number
    onSettle: (key: string) => void
    onUndo: (id: number) => void
}) {
    const [settledOpen, setSettledOpen] = useState(false)
    const toGo = mine.length + others.length
    if (toGo === 0 && settled.length === 0) return null

    const nameOf = (u: UserSummary | undefined) =>
        u ? (String(u.id) === String(youId) ? 'You' : u.firstName) : '?'
    const summary = [
        toGo > 0 ? `${toGo} to go` : null,
        settled.length > 0 ? `${settled.length} done` : null,
    ]
        .filter(Boolean)
        .join(' · ')

    const groupLabel = (text: string, first: boolean) => (
        <Typography
            sx={{
                paddingX: 1.5,
                paddingTop: 1.25,
                paddingBottom: 0.5,
                borderTop: first ? 'none' : RULE,
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: colors.primaryBrown,
            }}>
            {text}
        </Typography>
    )

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Section title above the card, like the expense list's */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 1,
                }}>
                <Typography
                    sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: colors.primaryBrown,
                    }}>
                    Payments
                </Typography>
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: colors.primaryBlack,
                    }}>
                    {summary}
                </Typography>
            </Box>
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                {mine.length > 0 && (
                    <>
                        {groupLabel(isYou ? 'Yours' : `${personName}’s`, true)}
                        {mine.map((p) => (
                            <MyPaymentRow
                                key={p.key}
                                row={p}
                                isYou={isYou}
                                personName={personName}
                                onSettle={onSettle}
                            />
                        ))}
                    </>
                )}

                {others.length > 0 && (
                    <>
                        {groupLabel('Everyone else', mine.length === 0)}
                        {others.map((p) => (
                            <Box
                                key={p.key}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    paddingX: 1.5,
                                    paddingY: 1,
                                    borderTop: RULE,
                                }}>
                                <Faces people={[p.debtor, p.creditor]} />
                                <Typography
                                    noWrap
                                    sx={{
                                        flex: 1,
                                        minWidth: 0,
                                        fontSize: 13.5,
                                        fontWeight: 600,
                                    }}>
                                    {nameOf(p.debtor)} → {nameOf(p.creditor)}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        fontWeight: 800,
                                        fontVariantNumeric: 'tabular-nums',
                                        flexShrink: 0,
                                    }}>
                                    {ledgerUsd(p.cents)}
                                </Typography>
                                {p.canSettle && (
                                    <SettleButton
                                        label={`Settle ${ledgerUsd(p.cents)} from ${p.debtor.firstName} to ${p.creditor.firstName}`}
                                        pending={p.pending}
                                        onClick={() => onSettle(p.key)}
                                    />
                                )}
                            </Box>
                        ))}
                    </>
                )}

                {settled.length > 0 && (
                    <Box
                        sx={{
                            borderTop:
                                toGo > 0
                                    ? `1px solid ${colors.primaryBlack}`
                                    : 'none',
                        }}>
                        <Box
                            onClick={() => setSettledOpen(!settledOpen)}
                            sx={{
                                ...pressRowSx,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                                paddingX: 1.5,
                                height: 44,
                                cursor: 'pointer',
                                userSelect: 'none',
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
                                    border: `1.5px solid ${toneColors.positive}`,
                                    backgroundColor: toneColors.positiveBg,
                                }}>
                                <IconCheck
                                    size={14}
                                    stroke={2.5}
                                    color={toneColors.positive}
                                />
                            </Box>
                            <Typography
                                noWrap
                                sx={{
                                    flex: 1,
                                    fontSize: 13.5,
                                    fontWeight: 700,
                                }}>
                                Settled · {settled.length}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: MUTED,
                                }}>
                                {ledgerUsd(
                                    settled.reduce((t, r) => t + r.cents, 0)
                                )}
                            </Typography>
                            <IconChevronDown
                                size={17}
                                stroke={2}
                                aria-label={settledOpen ? 'Hide' : 'Show'}
                                style={{
                                    flexShrink: 0,
                                    transform: settledOpen
                                        ? 'rotate(180deg)'
                                        : 'none',
                                    transition: `transform 160ms ${EASE}`,
                                }}
                            />
                        </Box>
                        <AnimatedHeight duration={160}>
                            {settledOpen &&
                                settled.map((r) => (
                                    <SwipeableRow
                                        key={String(r.id)}
                                        canEdit={false}
                                        canDelete={r.canUndo}
                                        onEdit={() => {}}
                                        onDelete={() => onUndo(r.id)}
                                        deleteLabel="Undo payment"
                                        deleteIcon={
                                            <IconArrowBackUp
                                                size={22}
                                                color={colors.primaryWhite}
                                            />
                                        }
                                        backgroundColor={colors.primaryWhite}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.25,
                                                paddingX: 1.5,
                                                paddingY: 1,
                                                borderTop: RULE,
                                            }}>
                                            <Faces
                                                people={[r.from, r.to].filter(
                                                    (u): u is UserSummary =>
                                                        Boolean(u)
                                                )}
                                            />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    noWrap
                                                    sx={{
                                                        fontSize: 13.5,
                                                        fontWeight: 600,
                                                        color: MUTED,
                                                        lineHeight: 1.25,
                                                    }}>
                                                    {nameOf(r.from)} →{' '}
                                                    {nameOf(r.to)}
                                                </Typography>
                                                <Typography
                                                    noWrap
                                                    sx={{
                                                        fontSize: 11.5,
                                                        color: colors.primaryBrown,
                                                        lineHeight: 1.25,
                                                    }}>
                                                    Paid{' '}
                                                    {dayjs(
                                                        r.settledOn +
                                                            'T00:00:00'
                                                    ).format('MMM D')}
                                                </Typography>
                                            </Box>
                                            <Typography
                                                sx={{
                                                    fontSize: 14,
                                                    fontWeight: 800,
                                                    fontVariantNumeric:
                                                        'tabular-nums',
                                                    color: MUTED,
                                                    textDecoration:
                                                        'line-through',
                                                    flexShrink: 0,
                                                }}>
                                                {ledgerUsd(r.cents)}
                                            </Typography>
                                        </Box>
                                    </SwipeableRow>
                                ))}
                        </AnimatedHeight>
                    </Box>
                )}
            </Box>
        </Box>
    )
}

const Faces = ({ people }: { people: UserSummary[] }) => (
    <Box sx={{ display: 'flex', flexShrink: 0 }}>
        {people.map((u, i) => (
            <InitialsIcon
                key={String(u.id)}
                name={u.firstName}
                initials={u.initials}
                iconColor={u.iconColor}
                sx={{
                    width: 24,
                    height: 24,
                    fontSize: 9,
                    marginLeft: i > 0 ? '-6px' : 0,
                }}
            />
        ))}
    </Box>
)

/** One of the person on show's payments: counterparty, Venmo, Settle. */
function MyPaymentRow({
    row,
    isYou,
    personName,
    onSettle,
}: {
    row: PlanPaymentRow
    isYou: boolean
    personName: string
    onSettle: (key: string) => void
}) {
    const c = row.counterparty
    const caption = row.outgoing
        ? isYou
            ? 'you pay'
            : `${personName} pays`
        : isYou
          ? 'pays you'
          : `pays ${personName}`
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                paddingX: 1.5,
                paddingY: 1,
                borderTop: RULE,
                backgroundColor: MINE_BG,
            }}>
            <InitialsIcon
                name={c.firstName}
                initials={c.initials}
                iconColor={c.iconColor}
                sx={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    noWrap
                    sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>
                    {c.firstName}
                </Typography>
                <Typography
                    noWrap
                    sx={{
                        fontSize: 11.5,
                        color: colors.primaryBrown,
                        lineHeight: 1.25,
                    }}>
                    {caption}
                </Typography>
            </Box>
            {row.venmo && (
                <Box
                    component="button"
                    type="button"
                    aria-label={`Pay ${c.firstName} on Venmo`}
                    onClick={() =>
                        openVenmoPayment(
                            row.venmo!.url,
                            row.cents / 100,
                            row.venmo!.note
                        )
                    }
                    sx={{
                        ...actionSx,
                        width: 30,
                        padding: 0,
                        borderRadius: '50%',
                        backgroundColor: VENMO_BLUE,
                    }}>
                    {/* Stand-in for the Venmo wordmark: bold italic v on brand blue */}
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
            )}
            <Typography
                sx={{
                    fontSize: 15,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                }}>
                {ledgerUsd(row.cents)}
            </Typography>
            {row.canSettle && (
                <SettleButton
                    label={`Settle ${ledgerUsd(row.cents)} with ${c.firstName}`}
                    pending={row.pending}
                    onClick={() => onSettle(row.key)}
                />
            )}
        </Box>
    )
}

function SettleButton({
    label,
    pending,
    onClick,
}: {
    label: string
    pending: boolean
    onClick: () => void
}) {
    return (
        <Box
            component="button"
            type="button"
            aria-label={label}
            disabled={pending}
            onClick={onClick}
            sx={{
                ...actionSx,
                paddingX: 1.25,
                fontSize: 11.5,
                fontWeight: 800,
                backgroundColor: colors.primaryYellow,
                opacity: pending ? 0.5 : 1,
            }}>
            Settle
        </Box>
    )
}

const actionSx = {
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'flexShrink': 0,
    'height': 30,
    'border': `1px solid ${colors.primaryBlack}`,
    'borderRadius': '4px',
    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
    'font': 'inherit',
    'color': colors.primaryBlack,
    'cursor': 'pointer',
    'userSelect': 'none',
    '&:active': { boxShadow: 'none', transform: 'translate(1.5px, 1.5px)' },
    'transition': 'transform 0.1s, box-shadow 0.1s',
} as const
