'use client'

import { Box, Typography } from '@mui/material'
import { IconCheck, IconChevronDown, IconMathSymbols } from '@tabler/icons-react'
import { Fragment, memo, useLayoutEffect, useRef, useState } from 'react'

import { cardSx, colors, pressShadowSx, toneColors } from '@/lib/colors'
import type { BalanceStep } from '@/lib/debt-proof'
import type { UserSummary } from '@/lib/types'
import { AnimatedHeight } from 'components/animated-height'
import { useTweenedNumber } from 'hooks/use-tweened-number'
import { formatUsd } from 'utils/currency'

import type { DebtsSelection } from './debts-view-store'
import { ledgerUsd, signedUsd } from './ledger-money'

// Waterfall geometry: name column, bar track, amount column, chevron
const NAME_W = 80
const AMT_W = 66 // fits "−$1,234.56"
const BAR_H = 16
const ROW_PAD = 5 // above and below each bar; connectors bridge 2 × this
const RESULT_H = 22
// Tappable rows end in a chevron, like every list row that opens something
const CHEV_W = 14
const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)'
const MOVE = `left 180ms ${EASE}, width 180ms ${EASE}`
// Selectable rows: the highlight is the feedback, so no pressed tint;
// eases in, drops instantly (as on Insights)
const toggleRowSx = (selected: boolean) => ({
    transition: selected ? 'background-color 0.1s' : 'none',
})
const SELECTED_BG = `${colors.primaryYellow}40`
const RULE = `1px solid ${colors.primaryBlack}1a`

const NEG_FILL = `${toneColors.negative}38`
const POS_FILL = `${toneColors.positive}38`
// Money that already moved: green diagonal hatching
const PAID_HATCH = `repeating-linear-gradient(-45deg, ${toneColors.positive}66 0 3px, transparent 3px 6px)`
// The $0 line and the connectors between bars: quiet, solid
const GUIDE = `${colors.primaryBlack}33`

const money = ledgerUsd
const signed = signedUsd

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

/** Width of a direction-key label (uppercase 9.5px/800, 0.4px tracking). */
let keyCanvas: CanvasRenderingContext2D | null = null
function keyTextWidth(text: string): number {
    const upper = text.toUpperCase()
    if (typeof document === 'undefined') return upper.length * 6.8
    keyCanvas ??= document.createElement('canvas').getContext('2d')
    if (!keyCanvas) return upper.length * 6.8
    keyCanvas.font = `800 9.5px ${getComputedStyle(document.body).fontFamily}`
    return keyCanvas.measureText(upper).width + upper.length * 0.4
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
    onHowItWorks,
    viewKey,
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
    /** Opens the "How it adds up" popover; no button when absent. */
    onHowItWorks?: () => void
    /** Changes when the person or plan on show changes: the body fades in
     *  fresh while the card eases to its new height. */
    viewKey: string
}) {
    const [trackRef, rowWidth] = useWidth()
    const [totalRef, totalW] = useWidth()
    const nameOf = (id: number) =>
        participantById.get(String(id))?.firstName ?? '?'

    // Running totals → a shared horizontal scale that includes $0
    const points = [0]
    for (const s of steps) points.push(points[points.length - 1] + s.cents)
    const lo = Math.min(...points, totalCents, 0)
    const hi = Math.max(...points, totalCents, 0)
    const span = hi - lo || 1
    // Bars sit in % of the track, so they're right from the first paint;
    // the measured width only decides whether a name fits in a segment
    const trackW =
        rowWidth > 0 ? rowWidth - 24 - NAME_W - AMT_W - CHEV_W - 24 : 200
    const x = (cents: number) => ((cents - lo) / span) * 100

    const tone = totalCents < 0 ? toneColors.negative : toneColors.positive
    const settled = totalCents === 0
    const headline = settled
        ? 'All square'
        : totalCents < 0
          ? isYou
              ? 'You pay'
              : `${personName} pays`
          : isYou
            ? 'You get'
            : `${personName} gets`

    /** A bar on the track, from one running total to the next. Money that
     *  already moved is hatched green; what's still owed is a solid tint. */
    const bar = (from: number, to: number, paid: boolean) => {
        const l = x(Math.min(from, to))
        const r = x(Math.max(from, to))
        return (
            <Box
                sx={{
                    'position': 'absolute',
                    'top': 0,
                    'left': `${l}%`,
                    'width': `${r - l}%`,
                    'minWidth': 3,
                    'height': BAR_H,
                    'boxSizing': 'border-box',
                    'border': `1px solid ${paid ? toneColors.positive : colors.primaryBlack}`,
                    ...(paid
                        ? { backgroundImage: PAID_HATCH }
                        : { backgroundColor: to < from ? NEG_FILL : POS_FILL }),
                    'transition': MOVE,
                    '@media (prefers-reduced-motion: reduce)': {
                        transition: 'none',
                    },
                }}
            />
        )
    }

    // Direction key over the $0 line, in the header's spare space. It must
    // never touch the total: if the full label doesn't fit left of the line
    // it shortens, then becomes one compact label at the track's right end,
    // and if even that won't fit it steps aside.
    const oweFull = isYou ? 'You owe' : 'Owes'
    const oweShort = isYou ? 'Owe' : 'Owes'
    const trackLeftPx = 12 + NAME_W + 8
    const zeroPx = trackLeftPx + (x(0) / 100) * trackW
    const totalRightPx = 12 + (totalW || (settled ? 2 : 7) * 15.5)
    const clears = (leftPx: number) => leftPx >= totalRightPx + 6
    const keyMode: 'full' | 'short' | 'compact' | 'none' = clears(
        zeroPx - 5 - keyTextWidth(`← ${oweFull}`)
    )
        ? 'full'
        : clears(zeroPx - 5 - keyTextWidth(`← ${oweShort}`))
          ? 'short'
          : clears(
                  trackLeftPx + trackW - keyTextWidth(`← ${oweShort} · Owed →`)
              )
            ? 'compact'
            : 'none'
    const owe = keyMode === 'full' ? oweFull : oweShort
    const keyLabel = {
        position: 'absolute',
        bottom: 0,
        fontSize: 9.5,
        lineHeight: '14px',
        fontWeight: 800,
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
    } as const

    /** Every amount sits in one right-aligned column, like a ledger. */
    const amount = (text: string, color: string, bold = false) => (
        <Typography
            noWrap
            sx={{
                width: AMT_W,
                flexShrink: 0,
                textAlign: 'right',
                fontSize: bold ? 12.5 : 11.5,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color,
            }}>
            {text}
        </Typography>
    )

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

    /** Tappable rows end in a ⌄ that flips to ⌃ while open, like every fold
     *  in the app; the rest keep its space so bars align. */
    const chevron = (show: boolean, open = false) => (
        <Box
            sx={{
                width: CHEV_W,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'flex-end',
            }}>
            {show && (
                <IconChevronDown
                    size={CHEV_W}
                    stroke={2.2}
                    color={colors.primaryBrown}
                    style={{
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: `transform 160ms ${EASE}`,
                    }}
                />
            )}
        </Box>
    )

    return (
        <Box
            sx={{
                ...cardSx,
                border: `1.5px solid ${colors.primaryBlack}`,
                boxShadow: `3px 3px 0px ${colors.primaryBlack}`,
                overflow: 'hidden',
            }}>
            {/* Headline: the total this all adds up to */}
            <Box
                sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                    paddingX: 1.5,
                    paddingTop: 1.25,
                    paddingBottom: 1,
                }}>
                <Box>
                    <Typography
                        sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            color: settled ? toneColors.positive : tone,
                        }}>
                        {headline}
                    </Typography>
                    <Typography
                        ref={totalRef}
                        sx={{
                            display: 'inline-block',
                            fontFamily: 'var(--font-serif)',
                            fontSize: 28,
                            lineHeight: 1.1,
                            fontVariantNumeric: 'tabular-nums',
                            color: settled ? toneColors.positive : tone,
                        }}>
                        {settled ? (
                            '$0'
                        ) : (
                            <RollingCents cents={Math.abs(totalCents)} />
                        )}
                    </Typography>
                </Box>
                {onHowItWorks && (
                    // Round, yellow, maths icon — the page's ⓘ is white with an
                    // "i" and lives in the title row; same 30px size
                    <Box
                        component="button"
                        type="button"
                        aria-label="Show the math"
                        onClick={onHowItWorks}
                        sx={{
                            ...pressShadowSx,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 30,
                            height: 30,
                            padding: 0,
                            flexShrink: 0,
                            border: `1px solid ${colors.primaryBlack}`,
                            borderRadius: '50%',
                            boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                            backgroundColor: colors.primaryYellow,
                            color: colors.primaryBlack,
                            cursor: 'pointer',
                        }}>
                        <IconMathSymbols size={17} stroke={2} />
                    </Box>
                )}
                {/* The direction key, lined up with the rows' columns */}
                {steps.length > 0 && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            gap: 1,
                            paddingX: 1.5,
                            height: 14,
                            pointerEvents: 'none',
                        }}>
                        <Box sx={{ width: NAME_W, flexShrink: 0 }} />
                        <Box sx={{ position: 'relative', flex: 1 }}>
                            {keyMode === 'none' ? null : keyMode ===
                              'compact' ? (
                                <Typography sx={{ ...keyLabel, right: 0 }}>
                                    <span
                                        style={{ color: toneColors.negative }}>
                                        ← {owe}
                                    </span>
                                    {' · '}
                                    <span
                                        style={{ color: toneColors.positive }}>
                                        Owed →
                                    </span>
                                </Typography>
                            ) : (
                                <>
                                    <Typography
                                        sx={{
                                            ...keyLabel,
                                            right: `calc(${100 - x(0)}% + 5px)`,
                                            color: toneColors.negative,
                                        }}>
                                        ← {owe}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            ...keyLabel,
                                            left: `calc(${x(0)}% + 5px)`,
                                            color: toneColors.positive,
                                        }}>
                                        Owed →
                                    </Typography>
                                </>
                            )}
                            {/* The $0 line starts here and runs down the rows */}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top:
                                        keyMode === 'full' ||
                                        keyMode === 'short'
                                            ? 2
                                            : 12,
                                    bottom: 0,
                                    left: `${x(0)}%`,
                                    borderLeft: `1.5px solid ${colors.primaryBlack}`,
                                    transition: `left 180ms ${EASE}`,
                                }}
                            />
                        </Box>
                        <Box sx={{ width: AMT_W, flexShrink: 0 }} />
                        <Box sx={{ width: CHEV_W, flexShrink: 0 }} />
                    </Box>
                )}
            </Box>
            {/* Everything below the total eases to its new height when the
                person or plan changes, and the new rows fade in (as the
                Insights chart does) */}
            <AnimatedHeight>
                <Box
                    key={viewKey}
                    sx={{
                        'animation': 'viewIn 150ms ease-out',
                        '@keyframes viewIn': {
                            from: { opacity: 0, transform: 'translateY(4px)' },
                            to: { opacity: 1, transform: 'none' },
                        },
                        '@media (prefers-reduced-motion: reduce)': {
                            animation: 'none',
                        },
                    }}>
                    {/* Waterfall — list rows (faint dividers, chevrons) whose bars
                        chain across them */}
                    <Box ref={trackRef}>
                        {steps.length === 0 && (
                            <Typography
                                sx={{
                                    fontSize: 12.5,
                                    color: colors.primaryBrown,
                                    paddingX: 1.5,
                                    paddingBottom: 1.5,
                                }}>
                                {isYou ? 'You don’t' : `${personName} doesn’t`}{' '}
                                share any expenses with anyone yet.
                            </Typography>
                        )}
                        {steps.map((s, i) => {
                            const from = points[i]
                            const to = points[i + 1]
                            const isPaid = s.kind === 'paid'
                            const sel = !isPaid && selected === String(s.userId)
                            const dim =
                                selected !== null && selected !== 'all' && !sel
                            const name = isPaid
                                ? `${s.cents > 0 ? 'Paid' : 'From'} ${nameOf(s.userId)}`
                                : nameOf(s.userId)
                            const amountColor = isPaid
                                ? colors.primaryBrown
                                : s.cents < 0
                                  ? toneColors.negative
                                  : toneColors.positive
                            // Payments made start their own group: a heavier
                            // line, no label (the rows say Paid / From)
                            const firstPaid =
                                isPaid &&
                                (i === 0 || steps[i - 1].kind !== 'paid')
                            return (
                                // Direction in the key: "Paid X" and "From X"
                                // are separate rows for the same person
                                <Fragment key={`${s.kind}:${s.userId}:${s.cents > 0 ? 'out' : 'in'}`}>
                                    <Box
                                        onClick={
                                            isPaid
                                                ? undefined
                                                : () =>
                                                      onSelect(
                                                          sel
                                                              ? null
                                                              : String(s.userId)
                                                      )
                                        }
                                        sx={{
                                            ...toggleRowSx(sel),
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            paddingX: 1.5,
                                            paddingY: `${ROW_PAD}px`,
                                            borderTop:
                                                i === 0
                                                    ? 'none'
                                                    : firstPaid
                                                      ? `1.5px solid ${colors.primaryBlack}`
                                                      : RULE,
                                            cursor: isPaid
                                                ? 'default'
                                                : 'pointer',
                                            backgroundColor: sel
                                                ? SELECTED_BG
                                                : 'transparent',
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
                                                color: isPaid
                                                    ? colors.primaryBrown
                                                    : colors.primaryBlack,
                                            }}>
                                            {name}
                                        </Typography>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                flex: 1,
                                                height: BAR_H,
                                            }}>
                                            {zeroLine}
                                            {bar(from, to, isPaid)}
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
                                        {amount(signed(s.cents), amountColor)}
                                        {chevron(!isPaid, sel)}
                                    </Box>
                                </Fragment>
                            )
                        })}

                        {/* The result: the total, split into the plan's payments */}
                        {/* Tapping it lists every expense (selection 'all') */}
                        {steps.length > 0 && (
                            <Box
                                onClick={() =>
                                    onSelect(selected === 'all' ? null : 'all')
                                }
                                sx={{
                                    ...toggleRowSx(selected === 'all'),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    paddingX: 1.5,
                                    paddingY: 1,
                                    marginTop: 0.5,
                                    borderTop: `1px solid ${colors.primaryBlack}`,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    backgroundColor:
                                        selected === 'all'
                                            ? SELECTED_BG
                                            : 'transparent',
                                }}>
                                <Typography
                                    noWrap
                                    sx={{
                                        width: NAME_W,
                                        flexShrink: 0,
                                        fontSize: 12,
                                        fontWeight: 800,
                                    }}>
                                    {settled
                                        ? 'Settled'
                                        : totalCents < 0
                                          ? 'To pay'
                                          : 'To get'}
                                </Typography>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        flex: 1,
                                        height: RESULT_H,
                                    }}>
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: -4,
                                            bottom: -4,
                                            left: `${x(0)}%`,
                                            borderLeft: `1px solid ${GUIDE}`,
                                        }}
                                    />
                                    {settled ? (
                                        // The chain ends on $0: a check sits on the line
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 1,
                                                left: `${x(0)}%`,
                                                transform: 'translateX(-50%)',
                                                width: 20,
                                                height: 20,
                                                boxSizing: 'border-box',
                                                borderRadius: '50%',
                                                border: `1.5px solid ${toneColors.positive}`,
                                                backgroundColor:
                                                    toneColors.positiveBg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                            <IconCheck
                                                size={12}
                                                stroke={2.8}
                                                color={toneColors.positive}
                                            />
                                        </Box>
                                    ) : (
                                        <ResultSegments
                                            payments={payments}
                                            totalCents={totalCents}
                                            x={x}
                                            trackW={trackW}
                                        />
                                    )}
                                </Box>
                                {amount(
                                    money(totalCents),
                                    settled
                                        ? toneColors.positive
                                        : colors.primaryBlack,
                                    true
                                )}
                                {chevron(true, selected === 'all')}
                            </Box>
                        )}
                    </Box>
                </Box>
            </AnimatedHeight>
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
    const oneWay =
        payments.length > 0 &&
        payments.every((p) => p.outgoing === totalCents < 0)
    const sign = totalCents < 0 ? -1 : 1
    const segments = oneWay
        ? payments.map((p) => ({
              key: p.key,
              cents: p.cents,
              label: p.counterparty.firstName,
              initials:
                  p.counterparty.initials ??
                  p.counterparty.firstName.slice(0, 2).toUpperCase(),
          }))
        : [{ key: 'net', cents: Math.abs(totalCents), label: '', initials: '' }]
    const fills =
        totalCents < 0
            ? [colors.primaryYellow, `${colors.primaryYellow}80`]
            : [`${toneColors.positive}59`, `${toneColors.positive}2e`]
    // Where each segment starts: the sum of the ones before it
    const starts = segments.map((_, i) =>
        segments.slice(0, i).reduce((t, s) => t + s.cents, 0)
    )
    return (
        <>
            {segments.map((s, i) => {
                const a = sign * starts[i]
                const b = sign * (starts[i] + s.cents)
                const left = x(Math.min(a, b))
                const widthPct = Math.abs(x(b) - x(a))
                const width = (widthPct / 100) * trackW
                const text =
                    width > s.label.length * 6.5 + 10
                        ? s.label
                        : width > 24
                          ? s.initials
                          : ''
                return (
                    <Box
                        key={s.key}
                        sx={{
                            'position': 'absolute',
                            'top': 0,
                            'left': `${left}%`,
                            'width': `${widthPct}%`,
                            'minWidth': 3,
                            'height': RESULT_H,
                            'boxSizing': 'border-box',
                            'border': `1px solid ${colors.primaryBlack}`,
                            'marginLeft': i > 0 && sign > 0 ? '-1px' : 0,
                            'backgroundColor': fills[i % 2],
                            'display': 'flex',
                            'alignItems': 'center',
                            'justifyContent': 'center',
                            'overflow': 'hidden',
                            'transition': MOVE,
                            '@media (prefers-reduced-motion: reduce)': {
                                transition: 'none',
                            },
                        }}>
                        <Typography
                            noWrap
                            sx={{
                                fontSize: 10.5,
                                fontWeight: 800,
                                paddingX: 0.5,
                            }}>
                            {text}
                        </Typography>
                    </Box>
                )
            })}
        </>
    )
}

/** The total rolls to its new amount (switching person or plan). */
function RollingCents({ cents }: { cents: number }) {
    return <>{formatUsd(useTweenedNumber(cents / 100), 2)}</>
}
