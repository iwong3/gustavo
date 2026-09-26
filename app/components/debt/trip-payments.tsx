'use client'

import { Box, Typography } from '@mui/material'
import { IconArrowBackUp, IconCheck, IconChevronDown } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useState } from 'react'

import { cardSx, colors, pressRowSx, toneColors } from '@/lib/colors'
import type { UserSummary } from '@/lib/types'
import { AnimatedHeight } from 'components/animated-height'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { formatUsd } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'

const RULE = `1px solid ${colors.primaryBlack}1a`
const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
const MUTED = '#7a6f5b'
const money = (cents: number) => formatUsd(cents / 100, 2)

/** A folded card: a header row that opens its body. */
function Fold({
    header,
    count,
    children,
}: {
    header: React.ReactNode
    count: number
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    return (
        <Box sx={{ ...cardSx, overflow: 'hidden' }}>
            <Box
                onClick={() => setOpen(!open)}
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
                {header}
                <IconChevronDown
                    size={17}
                    stroke={2}
                    aria-label={open ? 'Hide' : `Show ${count}`}
                    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: `transform 160ms ${EASE}` }}
                />
            </Box>
            <AnimatedHeight duration={160}>{open && <Box sx={{ borderTop: RULE }}>{children}</Box>}</AnimatedHeight>
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
                sx={{ width: 24, height: 24, fontSize: 9, marginLeft: i > 0 ? '-6px' : 0 }}
            />
        ))}
    </Box>
)

export type OtherPaymentRow = {
    key: string
    debtor: UserSummary
    creditor: UserSummary
    cents: number
    canSettle: boolean
    pending: boolean
}

/** Plan payments between other people, folded by default. */
export function EveryoneElseCard({
    payments,
    youId,
    onSettle,
}: {
    payments: OtherPaymentRow[]
    /** The logged-in user — "You" in names. */
    youId: number
    onSettle: (key: string) => void
}) {
    const nameOf = (u: UserSummary) => (String(u.id) === String(youId) ? 'You' : u.firstName)
    const faces = new Map<string, UserSummary>()
    for (const p of payments) {
        faces.set(String(p.debtor.id), p.debtor)
        faces.set(String(p.creditor.id), p.creditor)
    }
    return (
        <Fold
            count={payments.length}
            header={
                <>
                    <Faces people={Array.from(faces.values()).slice(0, 3)} />
                    <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>
                        Everyone else · {payments.length}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {money(payments.reduce((t, p) => t + p.cents, 0))}
                    </Typography>
                </>
            }>
            {payments.map((p, i) => (
                <Box
                    key={p.key}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.25, paddingX: 1.5, paddingY: 1, borderTop: i > 0 ? RULE : 'none' }}>
                    <Faces people={[p.debtor, p.creditor]} />
                    <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600 }}>
                        {nameOf(p.debtor)} → {nameOf(p.creditor)}
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {money(p.cents)}
                    </Typography>
                    {p.canSettle && (
                        <Box
                            component="button"
                            type="button"
                            aria-label={`Settle ${money(p.cents)} from ${p.debtor.firstName} to ${p.creditor.firstName}`}
                            disabled={p.pending}
                            onClick={() => onSettle(p.key)}
                            sx={{
                                'display': 'flex',
                                'alignItems': 'center',
                                'flexShrink': 0,
                                'height': 30,
                                'paddingX': 1.25,
                                'border': `1px solid ${colors.primaryBlack}`,
                                'borderRadius': '4px',
                                'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                'backgroundColor': colors.primaryYellow,
                                'font': 'inherit',
                                'fontSize': 11.5,
                                'fontWeight': 800,
                                'color': colors.primaryBlack,
                                'cursor': 'pointer',
                                'opacity': p.pending ? 0.5 : 1,
                                '&:active': { boxShadow: 'none', transform: 'translate(1.5px, 1.5px)' },
                                'transition': 'transform 0.1s, box-shadow 0.1s',
                            }}>
                            Settle
                        </Box>
                    )}
                </Box>
            ))}
        </Fold>
    )
}

export type SettledRecordRow = {
    id: number
    from: UserSummary | undefined
    to: UserSummary | undefined
    cents: number
    settledOn: string
    canUndo: boolean
}

/** Recorded payments — struck through; swipe left to undo. */
export function SettledCard({
    records,
    youId,
    onUndo,
}: {
    records: SettledRecordRow[]
    youId: number
    onUndo: (id: number) => void
}) {
    const nameOf = (u: UserSummary | undefined) => (u ? (String(u.id) === String(youId) ? 'You' : u.firstName) : '?')
    return (
        <Fold
            count={records.length}
            header={
                <>
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
                        <IconCheck size={14} stroke={2.5} color={toneColors.positive} />
                    </Box>
                    <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700 }}>
                        Settled · {records.length}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: MUTED }}>
                        {money(records.reduce((t, r) => t + r.cents, 0))}
                    </Typography>
                </>
            }>
            {records.map((r, i) => (
                <SwipeableRow
                    key={String(r.id)}
                    canEdit={false}
                    canDelete={r.canUndo}
                    onEdit={() => {}}
                    onDelete={() => onUndo(r.id)}
                    deleteLabel="Undo payment"
                    deleteIcon={<IconArrowBackUp size={22} color={colors.primaryWhite} />}
                    backgroundColor={colors.primaryWhite}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            paddingX: 1.5,
                            paddingY: 1,
                            borderTop: i > 0 ? RULE : 'none',
                        }}>
                        <Faces people={[r.from, r.to].filter((u): u is UserSummary => Boolean(u))} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600, color: MUTED, lineHeight: 1.25 }}>
                                {nameOf(r.from)} → {nameOf(r.to)}
                            </Typography>
                            <Typography noWrap sx={{ fontSize: 11.5, color: colors.primaryBrown, lineHeight: 1.25 }}>
                                Paid {dayjs(r.settledOn + 'T00:00:00').format('MMM D')}
                            </Typography>
                        </Box>
                        <Typography
                            sx={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: MUTED, textDecoration: 'line-through', flexShrink: 0 }}>
                            {money(r.cents)}
                        </Typography>
                    </Box>
                </SwipeableRow>
            ))}
        </Fold>
    )
}
