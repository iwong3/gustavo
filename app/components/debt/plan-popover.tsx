'use client'

import { Box, Dialog, Typography } from '@mui/material'
import { IconArrowRight, IconChevronDown, IconX } from '@tabler/icons-react'
import { Fragment, useMemo, useState } from 'react'

import { colors, pressShadowSx, toneColors } from '@/lib/colors'
import { directPairwiseSettlements, type Settlement } from '@/lib/debt'
import { planNetCents, roundToTotal, toCents } from '@/lib/debt-proof'
import type { SettlementRecord, SettlePlan, UserSummary } from '@/lib/types'
import { AnimatedHeight } from 'components/animated-height'
import { getContrastText, InitialsIcon } from 'utils/icons'

import { ledgerUsd, signedUsd } from './ledger-money'

type DebtMap = Map<number, Map<number, number>>

const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
const RULE = `1px solid ${colors.primaryBlack}1a`
const SECTION = `1.5px solid ${colors.primaryBlack}`
const NEG_FILL = `${toneColors.negative}38`
const POS_FILL = `${toneColors.positive}38`
const DEFAULT_ICON = '#FBBC04' // InitialsIcon's default
const NAME_W = 56

const same = (a: number | string, b: number | string) => String(a) === String(b)
const toneOf = (cents: number) =>
    cents < 0 ? toneColors.negative : toneColors.positive

/**
 * "How it adds up": a popover that walks through the plan by hand.
 *   1. Everyone's balance — each person's direct debts added up (tap a
 *      person for them); what's owed out equals what's owed in.
 *   2. The steps — Fewest payments is "the biggest payer pays the biggest
 *      receiver, repeat" (simplifyDebts, in the order it runs): payers on
 *      top, receivers below, one arrow per step until all reach $0.
 *   3. The payments that result, as an aligned ledger.
 */
export function PlanPopover({
    open,
    onClose,
    plan,
    payments,
    debtMap,
    participants,
    currentUserId,
    settled,
}: {
    open: boolean
    onClose: () => void
    plan: SettlePlan
    /** The plan's payments, in the order the plan made them. */
    payments: Settlement[]
    /** The debts the plan was made from. */
    debtMap: DebtMap
    participants: UserSummary[]
    currentUserId: number
    /** Everything's paid: the popover shows the plan from before anyone
     *  paid, and marks the payments these records made. */
    settled?: SettlementRecord[]
}) {
    const [openId, setOpenId] = useState<string | null>(null)
    const byId = useMemo(
        () => new Map(participants.map((p) => [String(p.id), p])),
        [participants]
    )
    const isYou = (id: number | string) => same(id, currentUserId)
    const nameOf = (id: number | string) =>
        isYou(id) ? 'You' : (byId.get(String(id))?.firstName ?? '?')
    const isPaid = (s: Settlement) =>
        settled?.some(
            (r) =>
                same(r.fromUserId, s.debtorId) && same(r.toUserId, s.creditorId)
        ) ?? false

    // 1 · Balances: the plan's net per person (so every section agrees to
    // the cent), most owed first, most owing last
    const balances = useMemo(() => {
        const direct = directPairwiseSettlements(debtMap, participants)
        return participants
            .map((p) => {
                const cents = planNetCents(payments, p.id)
                const pairs = direct
                    .filter(
                        (s) =>
                            same(s.debtorId, p.id) || same(s.creditorId, p.id)
                    )
                    .map((s) => ({
                        other: same(s.debtorId, p.id)
                            ? s.creditorId
                            : s.debtorId,
                        usd: same(s.debtorId, p.id) ? -s.amount : s.amount,
                    }))
                    .sort((a, b) => a.usd - b.usd)
                const pairCents = roundToTotal(
                    pairs.map((q) => q.usd),
                    cents
                )
                return {
                    person: p,
                    cents,
                    pairs: pairs.map((q, i) => ({
                        other: q.other,
                        cents: pairCents[i],
                    })),
                }
            })
            .filter((b) => b.cents !== 0)
            .sort((a, b) => b.cents - a.cents)
    }, [debtMap, participants, payments])
    const owedIn = balances.reduce((t, b) => t + Math.max(b.cents, 0), 0)
    const owedOut = balances.reduce((t, b) => t + Math.max(-b.cents, 0), 0)
    const maxAbs = Math.max(1, ...balances.map((b) => Math.abs(b.cents)))

    // 2 · Steps: payers (biggest first) over receivers (biggest first)
    const payers = balances
        .filter((b) => b.cents < 0)
        .reverse()
        .map((b) => b.person)
    const receivers = balances.filter((b) => b.cents > 0).map((b) => b.person)
    const frames = useMemo(() => {
        const state = new Map(
            balances.map((b) => [String(b.person.id), b.cents])
        )
        const out: { move: Settlement | null; state: Map<string, number> }[] = [
            { move: null, state: new Map(state) },
        ]
        for (const s of payments) {
            const c = toCents(s.amount)
            const d = String(s.debtorId)
            const k = String(s.creditorId)
            state.set(d, (state.get(d) ?? 0) + c)
            state.set(k, (state.get(k) ?? 0) - c)
            out.push({ move: s, state: new Map(state) })
        }
        return out
    }, [balances, payments])

    // 3 · Ledger: your own payments first, then in the order the plan made
    const ledger = [
        ...payments.filter((s) => isYou(s.debtorId)),
        ...payments.filter((s) => !isYou(s.debtorId)),
    ]

    const sectionLabel = (text: string) => (
        <Typography
            sx={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: colors.primaryBrown,
            }}>
            {text}
        </Typography>
    )

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            slotProps={{
                paper: {
                    sx: {
                        'border': `2px solid ${colors.primaryBlack}`,
                        'boxShadow': `4px 4px 0px ${colors.primaryBlack}`,
                        'borderRadius': '8px',
                        'backgroundColor': colors.primaryWhite,
                        'margin': 2,
                        'width': 'calc(100% - 32px)',
                        // No top padding: the pinned title row supplies it
                        'paddingX': 2,
                        'paddingBottom': 2,
                        // A flex column: without this the sections shrink
                        // to fit instead of the popover scrolling
                        '& > *': { flexShrink: 0 },
                    },
                },
            }}>
            {/* Title row pinned to the top, so ✕ is always in reach while
                the sections scroll underneath */}
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginX: -2,
                    paddingX: 2,
                    paddingTop: 2,
                    paddingBottom: 1.25,
                    backgroundColor: colors.primaryWhite,
                }}>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>
                    How it adds up
                </Typography>
                <Box
                    component="button"
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    sx={{
                        ...pressShadowSx,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        padding: 0,
                        border: `1px solid ${colors.primaryBlack}`,
                        borderRadius: '6px',
                        boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                        backgroundColor: colors.primaryYellow,
                        cursor: 'pointer',
                    }}>
                    <IconX size={16} stroke={2} color={colors.primaryBlack} />
                </Box>
            </Box>

            {settled && (
                <Typography
                    sx={{
                        fontSize: 12.5,
                        color: colors.primaryBrown,
                        marginBottom: 1.25,
                    }}>
                    Everything’s paid. This is the plan as it stood before
                    anyone paid.
                </Typography>
            )}

            {/* 1 · Everyone's balance */}
            {sectionLabel('1 · Everyone’s balance')}
            {balances.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 12.5,
                        color: colors.primaryBrown,
                        paddingY: 1.25,
                    }}>
                    Nobody owes anyone anything yet.
                </Typography>
            ) : (
                <>
                    {/* Key on the centre line, carrying both sides' totals:
                        they always match */}
                    <BalanceRow
                        head={
                            <Box
                                sx={{ width: 18 + 8 + NAME_W, flexShrink: 0 }}
                            />
                        }
                        track={
                            <>
                                <Typography
                                    sx={{
                                        ...keySx,
                                        right: 'calc(50% + 6px)',
                                        color: toneColors.negative,
                                    }}>
                                    ← Owe {ledgerUsd(owedOut)}
                                </Typography>
                                <Typography
                                    sx={{
                                        ...keySx,
                                        left: 'calc(50% + 6px)',
                                        color: toneColors.positive,
                                    }}>
                                    {ledgerUsd(owedIn)} owed →
                                </Typography>
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: 3,
                                        bottom: 0,
                                        borderLeft: `1.5px solid ${colors.primaryBlack}`,
                                    }}
                                />
                            </>
                        }
                        height={22}
                    />
                    <Box sx={{ marginX: -2 }}>
                        {balances.map((b, i) => {
                            const id = String(b.person.id)
                            const isOpen = openId === id
                            const w = (Math.abs(b.cents) / maxAbs) * 50
                            return (
                                <Box
                                    key={id}
                                    sx={{
                                        borderTop: i > 0 ? RULE : 'none',
                                        paddingX: 2,
                                        transition: isOpen
                                            ? 'background-color 0.1s'
                                            : 'none',
                                        backgroundColor: isOpen
                                            ? `${colors.primaryYellow}40`
                                            : 'transparent',
                                    }}>
                                    <Box
                                        onClick={() =>
                                            setOpenId(isOpen ? null : id)
                                        }
                                        sx={{
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                        }}>
                                        <BalanceRow
                                            head={
                                                <>
                                                    <InitialsIcon
                                                        name={
                                                            b.person.firstName
                                                        }
                                                        initials={
                                                            b.person.initials
                                                        }
                                                        iconColor={
                                                            b.person.iconColor
                                                        }
                                                        sx={{
                                                            width: 18,
                                                            height: 18,
                                                            fontSize: 7.5,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <Typography
                                                        noWrap
                                                        sx={{
                                                            width: NAME_W,
                                                            flexShrink: 0,
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                        }}>
                                                        {nameOf(b.person.id)}
                                                    </Typography>
                                                </>
                                            }
                                            track={
                                                <>
                                                    <Box
                                                        sx={{
                                                            position:
                                                                'absolute',
                                                            left: '50%',
                                                            top: -8,
                                                            bottom: -8,
                                                            borderLeft: `1px solid ${colors.primaryBlack}33`,
                                                        }}
                                                    />
                                                    <Box
                                                        sx={{
                                                            position:
                                                                'absolute',
                                                            top: 1,
                                                            height: 14,
                                                            width: `${w}%`,
                                                            minWidth: 3,
                                                            boxSizing:
                                                                'border-box',
                                                            border: `1px solid ${colors.primaryBlack}`,
                                                            backgroundColor:
                                                                b.cents < 0
                                                                    ? NEG_FILL
                                                                    : POS_FILL,
                                                            ...(b.cents < 0
                                                                ? {
                                                                      right: '50%',
                                                                  }
                                                                : {
                                                                      left: '50%',
                                                                  }),
                                                        }}
                                                    />
                                                </>
                                            }
                                            amount={<Amount cents={b.cents} />}
                                            chevron={
                                                <IconChevronDown
                                                    size={14}
                                                    stroke={2.2}
                                                    color={colors.primaryBrown}
                                                    style={{
                                                        transform: isOpen
                                                            ? 'rotate(180deg)'
                                                            : 'none',
                                                        transition: `transform 160ms ${EASE}`,
                                                    }}
                                                />
                                            }
                                            height={30}
                                        />
                                    </Box>
                                    <AnimatedHeight duration={160}>
                                        {isOpen && (
                                            <Box
                                                sx={{
                                                    paddingLeft: 3.25,
                                                    paddingBottom: 0.75,
                                                }}>
                                                {b.pairs.map((q) => (
                                                    // Dotted leader joins each
                                                    // name to its amount
                                                    <Box
                                                        key={String(q.other)}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'baseline',
                                                            gap: 0.5,
                                                            height: 22,
                                                        }}>
                                                        <Typography
                                                            noWrap
                                                            sx={{
                                                                fontSize: 12,
                                                                color: colors.primaryBrown,
                                                            }}>
                                                            with{' '}
                                                            {nameOf(q.other)}
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                flex: 1,
                                                                borderBottom: `1.5px dotted ${colors.primaryBrown}66`,
                                                                transform:
                                                                    'translateY(-3px)',
                                                            }}
                                                        />
                                                        <Amount
                                                            cents={q.cents}
                                                        />
                                                        <Box
                                                            sx={{
                                                                width: 14,
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </AnimatedHeight>
                                </Box>
                            )
                        })}
                    </Box>

                    {/* 2 · The steps */}
                    <Box
                        sx={{
                            borderTop: SECTION,
                            marginX: -2,
                            paddingX: 2,
                            paddingTop: 1.25,
                            marginTop: 0.5,
                        }}>
                        {sectionLabel(
                            plan === 'fewest'
                                ? '2 · Biggest payer → biggest receiver, repeat'
                                : '2 · Each pair settles what they owe'
                        )}
                        {plan === 'direct' && (
                            <Typography
                                sx={{
                                    fontSize: 11.5,
                                    color: colors.primaryBrown,
                                    marginTop: 0.25,
                                }}>
                                Loops (you owe Jenny, Jenny owes Sam, Sam owes
                                you) cancel out first.
                            </Typography>
                        )}
                        {frames.map((f, i) => (
                            <Box
                                key={i}
                                sx={{
                                    borderTop: i > 0 ? RULE : 'none',
                                    paddingTop: 0.75,
                                }}>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        color: colors.primaryBrown,
                                    }}>
                                    {i === 0
                                        ? 'Start · payers on top, receivers below'
                                        : `Step ${i}${i === frames.length - 1 ? ' · everyone at $0' : ''}`}
                                </Typography>
                                <StepDiagram
                                    payers={payers}
                                    receivers={receivers}
                                    state={f.state}
                                    move={f.move}
                                    isYou={isYou}
                                />
                            </Box>
                        ))}
                    </Box>

                    {/* 3 · The payments, as a ledger: every column lines up
                        because it's one grid */}
                    <Box
                        sx={{
                            borderTop: SECTION,
                            marginX: -2,
                            paddingX: 2,
                            paddingTop: 1.25,
                        }}>
                        {sectionLabel('3 · The payments')}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 20px 1fr auto 18px',
                                alignItems: 'center',
                                marginTop: 0.5,
                            }}>
                            {ledger.map((s, i) => {
                                const cell = {
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderTop: i > 0 ? RULE : 'none',
                                    fontSize: 13,
                                } as const
                                const paid = isPaid(s)
                                return (
                                    <Fragment
                                        key={`${String(s.debtorId)}>${String(s.creditorId)}`}>
                                        <Box
                                            sx={{
                                                ...cell,
                                                fontWeight: isYou(s.debtorId)
                                                    ? 800
                                                    : 600,
                                                paddingRight: 1,
                                            }}>
                                            {nameOf(s.debtorId)}
                                        </Box>
                                        <Box
                                            sx={{
                                                ...cell,
                                                justifyContent: 'center',
                                            }}>
                                            <IconArrowRight
                                                size={14}
                                                stroke={2}
                                                color={colors.primaryBrown}
                                            />
                                        </Box>
                                        <Box
                                            sx={{
                                                ...cell,
                                                fontWeight: isYou(s.creditorId)
                                                    ? 800
                                                    : 600,
                                                paddingLeft: 0.5,
                                                minWidth: 0,
                                            }}>
                                            {nameOf(s.creditorId)}
                                        </Box>
                                        <Box
                                            sx={{
                                                ...cell,
                                                justifyContent: 'flex-end',
                                                fontWeight: 800,
                                                fontVariantNumeric:
                                                    'tabular-nums',
                                            }}>
                                            {ledgerUsd(toCents(s.amount))}
                                        </Box>
                                        <Box
                                            sx={{
                                                ...cell,
                                                justifyContent: 'flex-end',
                                                color: toneColors.positive,
                                                fontWeight: 800,
                                            }}
                                            aria-label={
                                                paid ? 'Paid' : undefined
                                            }>
                                            {paid ? '✓' : ''}
                                        </Box>
                                    </Fragment>
                                )
                            })}
                        </Box>
                    </Box>
                </>
            )}
        </Dialog>
    )
}

const keySx = {
    position: 'absolute',
    bottom: 2,
    fontSize: 9.5,
    lineHeight: '14px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
} as const

/** A balance-section row: avatar + name, centred track, amount, chevron. */
function BalanceRow({
    head,
    track,
    amount,
    chevron,
    height,
}: {
    head: React.ReactNode
    track: React.ReactNode
    amount?: React.ReactNode
    chevron?: React.ReactNode
    height: number
}) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height }}>
            {head}
            <Box sx={{ position: 'relative', flex: 1, height: 16 }}>
                {track}
            </Box>
            <Box
                sx={{
                    width: 66,
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}>
                {amount}
            </Box>
            <Box
                sx={{
                    width: 14,
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}>
                {chevron}
            </Box>
        </Box>
    )
}

function Amount({ cents }: { cents: number }) {
    return (
        <Typography
            noWrap
            sx={{
                fontSize: 11.5,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: toneOf(cents),
            }}>
            {signedUsd(cents)}
        </Typography>
    )
}

/** Short signed balance for the diagrams: "−$123", "+$98.50", "✓ $0". */
const shortUsd = (cents: number) => {
    if (cents === 0) return '✓ $0'
    const whole = cents % 100 === 0
    const text = (Math.abs(cents) / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2,
    })
    return `${cents < 0 ? '−' : '+'}${text}`
}

// Step diagram geometry (viewBox units; the SVG scales to the popover)
const W = 300
const R = 14
const MAX_PER_ROW = 6
const ROW_H = 50 // a circle and its balance underneath
const GAP = 44 // between payers and receivers: room for the arrow
const GAP_START = 10 // the Start frame has no arrow

/** Lays people out in centred rows of up to MAX_PER_ROW. */
function layoutRows(people: UserSummary[], top: number) {
    const pos = new Map<string, { x: number; y: number }>()
    const rows = Math.max(1, Math.ceil(people.length / MAX_PER_ROW))
    for (let r = 0; r < rows; r++) {
        const row = people.slice(r * MAX_PER_ROW, (r + 1) * MAX_PER_ROW)
        const step = Math.min(50, (W - 2 * 26) / Math.max(row.length - 1, 1))
        const start = W / 2 - (step * (row.length - 1)) / 2
        row.forEach((p, i) =>
            pos.set(String(p.id), {
                x: start + i * step,
                y: top + r * ROW_H + R,
            })
        )
    }
    return { pos, height: rows * ROW_H }
}

/**
 * One step: payers on top, receivers below, and this step's payment as an
 * arrow from payer down to receiver with its amount. Anyone at $0 fades
 * with a ✓.
 */
function StepDiagram({
    payers,
    receivers,
    state,
    move,
    isYou,
}: {
    payers: UserSummary[]
    receivers: UserSummary[]
    state: Map<string, number>
    move: Settlement | null
    isYou: (id: number | string) => boolean
}) {
    const top = layoutRows(payers, 6)
    const gap = move ? GAP : GAP_START
    const bottom = layoutRows(receivers, 6 + top.height + gap)
    const H = 6 + top.height + gap + bottom.height
    const pos = new Map([...Array.from(top.pos), ...Array.from(bottom.pos)])

    let arrow: React.ReactNode = null
    if (move) {
        const a = pos.get(String(move.debtorId))
        const b = pos.get(String(move.creditorId))
        if (a && b) {
            // From under the payer's balance to just above the receiver
            const x1 = a.x
            const y1 = a.y + R + 16
            const x2 = b.x
            const y2 = b.y - R - 3
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2
            const id = `step-${String(move.debtorId)}-${String(move.creditorId)}`
            arrow = (
                <>
                    <defs>
                        <marker
                            id={id}
                            viewBox="0 0 10 10"
                            refX="7"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto">
                            <path
                                d="M0 0L10 5L0 10z"
                                fill={colors.primaryBlack}
                            />
                        </marker>
                    </defs>
                    <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={colors.primaryYellow}
                        strokeWidth={6}
                    />
                    <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2 - 1}
                        stroke={colors.primaryBlack}
                        strokeWidth={1.3}
                        markerEnd={`url(#${id})`}
                    />
                    <rect
                        x={mx - 34}
                        y={my - 9}
                        width={68}
                        height={18}
                        rx={9}
                        fill={colors.primaryWhite}
                        stroke={colors.primaryBlack}
                    />
                    <text
                        x={mx}
                        y={my + 4}
                        textAnchor="middle"
                        fontSize={10.5}
                        fontWeight={800}
                        fill={colors.primaryBlack}>
                        {ledgerUsd(toCents(move.amount))}
                    </text>
                </>
            )
        }
    }

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ display: 'block', fontFamily: 'inherit' }}
            role="img"
            aria-label="Everyone's balance after this step">
            {/* People first, so the arrow and its label sit on top */}
            {[...payers, ...receivers].map((p) => {
                const at = pos.get(String(p.id))
                if (!at) return null
                const cents = state.get(String(p.id)) ?? 0
                const done = cents === 0
                const fill = p.iconColor ?? DEFAULT_ICON
                return (
                    <g key={String(p.id)} opacity={done ? 0.4 : 1}>
                        <circle
                            cx={at.x}
                            cy={at.y}
                            r={R}
                            fill={fill}
                            stroke={colors.primaryBlack}
                        />
                        <text
                            x={at.x}
                            y={at.y + 3.5}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight={800}
                            fill={getContrastText(fill)}>
                            {isYou(p.id)
                                ? 'You'
                                : (p.initials ??
                                  p.firstName.slice(0, 2).toUpperCase())}
                        </text>
                        <text
                            x={at.x}
                            y={at.y + R + 12}
                            textAnchor="middle"
                            fontSize={9.5}
                            fontWeight={800}
                            fill={done ? toneColors.positive : toneOf(cents)}>
                            {shortUsd(cents)}
                        </text>
                    </g>
                )
            })}
            {arrow}
        </svg>
    )
}
