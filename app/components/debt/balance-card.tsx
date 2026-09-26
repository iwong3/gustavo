'use client'

import { Box, Typography } from '@mui/material'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { memo, useLayoutEffect, useRef, useState } from 'react'

import { cardSx, colors, pressRowSx, toneColors } from '@/lib/colors'
import type { BalanceStep } from '@/lib/debt-proof'
import type { UserSummary } from '@/lib/types'
import { AnimatedHeight } from 'components/animated-height'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'
import { useTweenedNumber } from 'hooks/use-tweened-number'
import { formatUsd } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'
import { openVenmoPayment } from 'utils/venmo'

import type { DebtsSelection } from './debts-view-store'
import type { HandoffLine } from './handoff-text'

const VENMO_BLUE = '#008CFF'
// Waterfall geometry: a name column, then the bar track
const NAME_W = 84
const BAR_H = 16
const ROW_PAD = 5 // above and below each bar; connectors bridge 2 × this
const RESULT_H = 22
// Tappable rows end in a chevron, like every list row that opens something
const CHEV_W = 14
const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
const MOVE = `left 180ms ${EASE}, width 180ms ${EASE}`
// Selectable rows: the highlight is the feedback, so no pressed tint;
// eases in, drops instantly (as on Insights)
const toggleRowSx = (selected: boolean) => ({ transition: selected ? 'background-color 0.1s' : 'none' })
const SELECTED_BG = `${colors.primaryYellow}40`
const RULE = `1px solid ${colors.primaryBlack}1a`

const NEG_FILL = `${toneColors.negative}38`
const POS_FILL = `${toneColors.positive}38`
const PAID_FILL = `${colors.primaryBlack}0d`
// The $0 line and the connectors between bars: quiet, solid
const GUIDE = `${colors.primaryBlack}33`

const money = (cents: number) => formatUsd(Math.abs(cents) / 100, 2)
const signed = (cents: number) => `${cents < 0 ? '−' : '+'}${money(cents)}`

/** One payment the plan asks of the person on show. */
export type PlanPaymentRow = {
    key: string
    counterparty: UserSummary
    cents: number
    /** The person on show pays (vs. receives). */
    outgoing: boolean
    venmo?: { url: string; note: string } | null
    canSettle: boolean
    pending: boolean
}

/** Tracks an element's width (the bars are placed in px, labels beside them). */
function useWidth() {
    const ref = useRef<HTMLDivElement | null>(null)
    const [width, setWidth] = useState(0)
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => setWidth(el.getBoundingClientRect().width)
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    return [ref, width] as const
}

/**
 * The debts page's main card: the person's total, the waterfall that proves
 * it (one row per person they share expenses with, then payments already
 * made), the bottom bar split into the plan's payments, and those payments
 * with Venmo + Settle. Tapping a row selects it (the page shows its
 * expenses below); tapping it again clears it.
 */
export const BalanceCard = memo(function BalanceCard({
    steps,
    totalCents,
    isYou,
    personName,
    participantById,
    payments,
    selected,
    onSelect,
    onSettle,
    whyLines,
}: {
    steps: BalanceStep[]
    totalCents: number
    /** The person on show is the logged-in user ("you"). */
    isYou: boolean
    personName: string
    participantById: Map<string, UserSummary>
    payments: PlanPaymentRow[]
    selected: DebtsSelection
    onSelect: (selection: DebtsSelection) => void
    onSettle: (key: string) => void
    /** Why the payments go where they go (hand-offs). */
    whyLines: HandoffLine[]
}) {
    const [trackRef, rowWidth] = useWidth()
    const [whyOpen, setWhyOpen] = useState(false)
    const nameOf = (id: number) => participantById.get(String(id))?.firstName ?? '?'

    // Running totals → a shared horizontal scale that includes $0
    const points = [0]
    for (const s of steps) points.push(points[points.length - 1] + s.cents)
    const lo = Math.min(...points, totalCents, 0)
    const hi = Math.max(...points, totalCents, 0)
    const span = hi - lo || 1
    // Bars sit in % of the track, so they're right from the first paint;
    // the measured width only decides which side of a bar its label fits
    const trackW = rowWidth > 0 ? rowWidth - 24 - NAME_W - CHEV_W - 16 : 240
    const x = (cents: number) => ((cents - lo) / span) * 100
    const px = (pct: number) => (pct / 100) * trackW

    const tone = totalCents < 0 ? toneColors.negative : toneColors.positive
    const settled = totalCents === 0
    const headline = settled
        ? 'All square'
        : totalCents < 0
          ? isYou ? 'You pay' : `${personName} pays`
          : isYou ? 'You get' : `${personName} gets`

    /** A bar and its value label, placed on the track. */
    const bar = (from: number, to: number, fill: string, labelText: string, labelColor: string) => {
        const l = x(Math.min(from, to))
        const r = x(Math.max(from, to))
        const labelW = labelText.length * 6.3 + 6
        const goesLeft = to < from
        const roomLeft = px(l) >= labelW
        const roomRight = px(100 - r) >= labelW
        const beforeBar = { right: `calc(${100 - l}% + 6px)` }
        const afterBar = { left: `calc(${r}% + 6px)` }
        let labelSx: object
        if (goesLeft ? roomLeft : roomRight) labelSx = goesLeft ? beforeBar : afterBar
        else if (goesLeft ? roomRight : roomLeft) labelSx = goesLeft ? afterBar : beforeBar
        else labelSx = { right: `calc(${100 - r}% + 4px)` } // inside, at the far end
        return (
            <>
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: `${l}%`,
                        width: `${r - l}%`,
                        minWidth: 3,
                        height: BAR_H,
                        boxSizing: 'border-box',
                        border: `1px solid ${colors.primaryBlack}`,
                        backgroundColor: fill,
                        transition: MOVE,
                        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                    }}
                />
                <Typography
                    component="span"
                    sx={{
                        position: 'absolute',
                        top: 0,
                        lineHeight: `${BAR_H}px`,
                        fontSize: 11,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                        color: labelColor,
                        ...labelSx,
                    }}>
                    {labelText}
                </Typography>
            </>
        )
    }

    const zeroLine = (
        <Box
            sx={{
                position: 'absolute',
                top: -ROW_PAD,
                bottom: -ROW_PAD,
                left: `${x(0)}%`,
                borderLeft: `1px solid ${GUIDE}`,
            }}
        />
    )

    /** Tappable rows end in a chevron; the rest keep its space so bars align. */
    const chevron = (show: boolean) => (
        <Box sx={{ width: CHEV_W, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            {show && <IconChevronRight size={CHEV_W} stroke={2.2} color={colors.primaryBrown} />}
        </Box>
    )

    return (
        <Box sx={{ ...cardSx, border: `1.5px solid ${colors.primaryBlack}`, boxShadow: `3px 3px 0px ${colors.primaryBlack}`, overflow: 'hidden' }}>
            {/* Headline: the total this all adds up to */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, paddingX: 1.5, paddingTop: 1.25, paddingBottom: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: settled ? toneColors.positive : tone }}>
                        {headline}
                    </Typography>
                    <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: 28, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: settled ? toneColors.positive : tone }}>
                        {settled ? '$0' : <RollingCents cents={Math.abs(totalCents)} />}
                    </Typography>
                </Box>
                <PageInfo title="Reading the chart">
                    <PageInfoSection title="One row per person">
                        Each bar is everything between {isYou ? 'you' : personName} and one
                        person, from expenses: red when {isYou ? 'you' : 'they'} owe them,
                        green when they owe {isYou ? 'you' : personName}. Tap a row to see
                        every expense behind it, with the split.
                    </PageInfoSection>
                    <PageInfoSection title="Bars run end to end">
                        Each bar starts where the last one stopped, so the chart adds
                        the rows up as it goes. Payments already made are the grey
                        rows. Wherever it ends is the total up top.
                    </PageInfoSection>
                    <PageInfoSection title="The bottom bar">
                        The same total, split into the payments that clear it. With
                        Fewest payments these can go to different people than the rows
                        above — Why these people? explains each hand-off. The amount is
                        always the same.
                    </PageInfoSection>
                    <PageInfoNote>Every level adds up to the cent: expenses → rows → total → payments.</PageInfoNote>
                </PageInfo>
            </Box>
            {/* Waterfall — list rows (faint dividers, chevrons) whose bars
                chain across them */}
            <Box ref={trackRef}>
                {steps.length === 0 && (
                    <Typography sx={{ fontSize: 12.5, color: colors.primaryBrown, paddingX: 1.5, paddingBottom: 1.5 }}>
                        {isYou ? 'You don’t' : `${personName} doesn’t`} share any expenses with anyone yet.
                    </Typography>
                )}
                {steps.map((s, i) => {
                    const from = points[i]
                    const to = points[i + 1]
                    const isPaid = s.kind === 'paid'
                    const sel = !isPaid && selected === String(s.userId)
                    const dim = selected !== null && selected !== 'all' && !sel
                    const name = isPaid ? `${s.cents > 0 ? 'Paid' : 'From'} ${nameOf(s.userId)}` : nameOf(s.userId)
                    const fill = isPaid ? PAID_FILL : s.cents < 0 ? NEG_FILL : POS_FILL
                    const labelColor = isPaid ? colors.primaryBrown : s.cents < 0 ? toneColors.negative : toneColors.positive
                    return (
                        <Box
                            key={`${s.kind}:${s.userId}`}
                            onClick={isPaid ? undefined : () => onSelect(sel ? null : String(s.userId))}
                            sx={{
                                ...toggleRowSx(sel),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                paddingX: 1.5,
                                paddingY: `${ROW_PAD}px`,
                                borderTop: i > 0 ? RULE : 'none',
                                cursor: isPaid ? 'default' : 'pointer',
                                backgroundColor: sel ? SELECTED_BG : 'transparent',
                                opacity: dim ? 0.45 : 1,
                                userSelect: 'none',
                            }}>
                            <Typography
                                noWrap
                                sx={{
                                    width: NAME_W,
                                    flexShrink: 0,
                                    fontSize: 12,
                                    fontWeight: sel ? 800 : 700,
                                    color: isPaid ? colors.primaryBrown : colors.primaryBlack,
                                }}>
                                {name}
                            </Typography>
                            <Box sx={{ position: 'relative', flex: 1, height: BAR_H }}>
                                {zeroLine}
                                {bar(from, to, fill, signed(s.cents), labelColor)}
                                {i < steps.length - 1 && (
                                    // Crosses the divider to the next bar
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            zIndex: 1,
                                            top: BAR_H,
                                            height: ROW_PAD * 2 + 1,
                                            left: `${x(to)}%`,
                                            borderLeft: `1px solid ${colors.primaryBlack}80`,
                                            transition: `left 180ms ${EASE}`,
                                        }}
                                    />
                                )}
                            </Box>
                            {chevron(!isPaid)}
                        </Box>
                    )
                })}

                {/* The result: the total, split into the plan's payments */}
                {/* Tapping it lists every expense (selection 'all') */}
                {steps.length > 0 && (
                    <Box
                        onClick={() => onSelect(selected === 'all' ? null : 'all')}
                        sx={{
                            ...toggleRowSx(selected === 'all'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            paddingX: 1.5,
                            paddingTop: 1,
                            paddingBottom: 1.25,
                            marginTop: 0.5,
                            borderTop: `1px solid ${colors.primaryBlack}`,
                            cursor: 'pointer',
                            userSelect: 'none',
                            backgroundColor: selected === 'all' ? SELECTED_BG : 'transparent',
                        }}>
                        <Typography noWrap sx={{ width: NAME_W, flexShrink: 0, fontSize: 12, fontWeight: 800 }}>
                            {settled ? 'Left' : totalCents < 0 ? '= Pay' : '= Get'}
                        </Typography>
                        <Box sx={{ position: 'relative', flex: 1, height: RESULT_H }}>
                            <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: `${x(0)}%`, borderLeft: `1px solid ${GUIDE}` }} />
                            {settled ? (
                                <Typography sx={{ position: 'absolute', left: 0, lineHeight: `${RESULT_H}px`, fontSize: 12, fontWeight: 800, color: toneColors.positive, whiteSpace: 'nowrap' }}>
                                    ✓ nothing left to settle
                                </Typography>
                            ) : (
                                <ResultSegments payments={payments} totalCents={totalCents} x={x} trackW={trackW} />
                            )}
                        </Box>
                        {chevron(true)}
                    </Box>
                )}
            </Box>

            {/* The payments, with the actions */}
            <AnimatedHeight duration={160}>
                {payments.map((p) => (
                    <PaymentRow key={p.key} row={p} isYou={isYou} personName={personName} onSettle={onSettle} />
                ))}
            </AnimatedHeight>

            {/* Why these people — the hand-offs */}
            {whyLines.length > 0 && payments.length > 0 && (
                <Box sx={{ borderTop: RULE }}>
                    <Box
                        onClick={() => setWhyOpen(!whyOpen)}
                        sx={{
                            ...pressRowSx,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingX: 1.5,
                            height: 40,
                            cursor: 'pointer',
                            userSelect: 'none',
                        }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                            Why {whyLines.length === 1 ? 'this person' : 'these people'}?
                        </Typography>
                        <IconChevronDown
                            size={16}
                            stroke={2.2}
                            style={{ transform: whyOpen ? 'rotate(180deg)' : 'none', transition: `transform 160ms ${EASE}` }}
                        />
                    </Box>
                    <AnimatedHeight duration={160}>
                        {whyOpen && (
                            <Box component="ul" sx={{ margin: 0, paddingLeft: 3.5, paddingRight: 1.5, paddingBottom: 1.25, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {whyLines.map((line, i) => (
                                    <Typography component="li" key={i} sx={{ fontSize: 12.5, lineHeight: 1.45, color: colors.primaryBrown }}>
                                        <Box component="span" sx={{ fontWeight: 800, color: colors.primaryBlack }}>
                                            {line.amount}
                                        </Box>
                                        : {line.text}
                                    </Typography>
                                ))}
                            </Box>
                        )}
                    </AnimatedHeight>
                </Box>
            )}
        </Box>
    )
})

/** The bottom bar: one segment per payment when they all go one way. */
function ResultSegments({
    payments,
    totalCents,
    x,
    trackW,
}: {
    payments: PlanPaymentRow[]
    totalCents: number
    /** Cents → % of the track. */
    x: (cents: number) => number
    /** Track width in px, to judge whether a name fits in its segment. */
    trackW: number
}) {
    const oneWay = payments.length > 0 && payments.every((p) => p.outgoing === totalCents < 0)
    const sign = totalCents < 0 ? -1 : 1
    const segments = oneWay
        ? payments.map((p) => ({ key: p.key, cents: p.cents, label: p.counterparty.firstName, initials: p.counterparty.initials ?? p.counterparty.firstName.slice(0, 2).toUpperCase() }))
        : [{ key: 'net', cents: Math.abs(totalCents), label: '', initials: '' }]
    const fills = totalCents < 0
        ? [colors.primaryYellow, `${colors.primaryYellow}80`]
        : [`${toneColors.positive}59`, `${toneColors.positive}2e`]
    // Where each segment starts: the sum of the ones before it
    const starts = segments.map((_, i) => segments.slice(0, i).reduce((t, s) => t + s.cents, 0))
    return (
        <>
            {segments.map((s, i) => {
                const a = sign * starts[i]
                const b = sign * (starts[i] + s.cents)
                const left = x(Math.min(a, b))
                const widthPct = Math.abs(x(b) - x(a))
                const width = (widthPct / 100) * trackW
                const text = width > s.label.length * 6.5 + 10 ? s.label : width > 24 ? s.initials : ''
                return (
                    <Box
                        key={s.key}
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: `${left}%`,
                            width: `${widthPct}%`,
                            minWidth: 3,
                            height: RESULT_H,
                            boxSizing: 'border-box',
                            border: `1px solid ${colors.primaryBlack}`,
                            marginLeft: i > 0 && sign > 0 ? '-1px' : 0,
                            backgroundColor: fills[i % 2],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            transition: MOVE,
                            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                        }}>
                        <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, paddingX: 0.5 }}>
                            {text}
                        </Typography>
                    </Box>
                )
            })}
        </>
    )
}

function PaymentRow({
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
        ? isYou ? 'you pay' : `${personName} pays`
        : isYou ? 'pays you' : `pays ${personName}`
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, paddingX: 1.5, paddingY: 1, borderTop: RULE }}>
            <InitialsIcon
                name={c.firstName}
                initials={c.initials}
                iconColor={c.iconColor}
                sx={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>
                    {c.firstName}
                </Typography>
                <Typography noWrap sx={{ fontSize: 11.5, color: colors.primaryBrown, lineHeight: 1.25 }}>
                    {caption}
                </Typography>
            </Box>
            {row.venmo && (
                <Box
                    component="button"
                    type="button"
                    aria-label={`Pay ${c.firstName} on Venmo`}
                    onClick={() => openVenmoPayment(row.venmo!.url, row.cents / 100, row.venmo!.note)}
                    sx={{
                        ...actionSx,
                        width: 30,
                        padding: 0,
                        borderRadius: '50%',
                        backgroundColor: VENMO_BLUE,
                    }}>
                    {/* Stand-in for the Venmo wordmark: bold italic v on brand blue */}
                    <Typography component="span" sx={{ fontSize: 15, fontWeight: 900, fontStyle: 'italic', lineHeight: 1, color: colors.primaryWhite, transform: 'translateX(-1px)' }}>
                        v
                    </Typography>
                </Box>
            )}
            <Typography sx={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {money(row.cents)}
            </Typography>
            {row.canSettle && (
                <Box
                    component="button"
                    type="button"
                    aria-label={`Settle ${money(row.cents)} with ${c.firstName}`}
                    disabled={row.pending}
                    onClick={() => onSettle(row.key)}
                    sx={{
                        ...actionSx,
                        paddingX: 1.25,
                        fontSize: 11.5,
                        fontWeight: 800,
                        backgroundColor: colors.primaryYellow,
                        opacity: row.pending ? 0.5 : 1,
                    }}>
                    Settle
                </Box>
            )}
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

/** The total rolls to its new amount (switching person or plan). */
function RollingCents({ cents }: { cents: number }) {
    return <>{formatUsd(useTweenedNumber(cents / 100), 2)}</>
}
