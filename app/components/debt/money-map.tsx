'use client'

import { Box } from '@mui/material'
import { useState } from 'react'

import { cardSx, colors } from '@/lib/colors'
import type { Settlement } from '@/lib/debt'
import type { UserSummary } from '@/lib/types'

const DEFAULT_ICON_COLOR = '#FBBC04'

const formatUsd = (n: number | null | undefined) =>
    Number.isFinite(n)
        ? n!.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
          })
        : '—'

const initialsOf = (p: UserSummary | undefined) =>
    p?.initials ?? (p?.firstName ?? '?').slice(0, 2).toUpperCase()

// Geometry constants — sized for the 390px content column
const W = 340
const NODE_W = 8
const LEFT_X = 68
const RIGHT_X = W - 68
// All ribbons together share this many px of thickness, so the map stays the
// same height whether the trip owes $200 or $20,000
const RIBBON_BUDGET = 170
const NODE_GAP = 36 // ribbon stack gap + label clearance
const MIN_RIBBON = 13
const TOP_PAD = 44 // clearance below the PAYS / GETS headers

/** A flow drawn on the map: an outstanding payment or an already-settled one. */
type Flow = Settlement & { settled: boolean }

/**
 * The settle-up plan drawn as a flow: debtors on the left, creditors on the
 * right, ribbon thickness proportional to the amount moving. Ribbons that
 * don't involve `youId` render at half strength. Settled flows stay on the
 * map — faded, dash-outlined, with a green ✓ pill — so paying a debt never
 * makes its ribbon vanish. Tapping a ribbon highlights it (tap again to
 * clear); the settle-up rows below are the way into detail.
 */
export function MoneyMap({
    settlements,
    settledFlows = [],
    participantById,
    youId,
}: {
    settlements: Settlement[]
    /** Recorded payments, pre-aggregated per debtor→creditor pair. */
    settledFlows?: Settlement[]
    participantById: Map<number, UserSummary>
    youId: number
}) {
    // A tap highlights either one ribbon or one person (all their flows)
    const [selection, setSelection] = useState<
        { kind: 'ribbon'; key: string } | { kind: 'user'; id: number } | null
    >(null)
    // Outstanding first, then settled, so paid flows stack below live ones
    const allFlows: Flow[] = [
        ...settlements.map((s) => ({ ...s, settled: false })),
        ...settledFlows.map((s) => ({ ...s, settled: true })),
    ]
    const ribbonKey = (s: Flow) =>
        `${s.settled ? 'settled-' : ''}${s.debtorId}-${s.creditorId}`
    const isHighlighted = (s: Flow) =>
        selection === null
            ? null // no active selection → default (you-based) styling
            : selection.kind === 'ribbon'
              ? ribbonKey(s) === selection.key
              : s.debtorId === selection.id || s.creditorId === selection.id
    const totalAmount = allFlows.reduce((t, s) => t + s.amount, 0)
    const pxPerDollar = totalAmount > 0 ? RIBBON_BUDGET / totalAmount : 0
    const ribbonH = (amount: number) =>
        Math.max(amount * pxPerDollar, MIN_RIBBON)

    const debtors = Array.from(new Set(allFlows.map((s) => s.debtorId)))
    const creditors = Array.from(new Set(allFlows.map((s) => s.creditorId)))
    // Node totals only count what's still owed — settled ribbons are history
    const owesTotal = (id: number) =>
        settlements
            .filter((s) => s.debtorId === id)
            .reduce((t, s) => t + s.amount, 0)
    const owedTotal = (id: number) =>
        settlements
            .filter((s) => s.creditorId === id)
            .reduce((t, s) => t + s.amount, 0)

    // Stack each side's ribbons top-to-bottom
    type NodePos = { y0: number; h: number }
    const layoutSide = (ids: number[], flowsOf: (id: number) => Flow[]) => {
        const pos = new Map<number, NodePos>()
        const cursor = new Map<number, number>()
        let y = TOP_PAD
        for (const id of ids) {
            const h = flowsOf(id).reduce((t, s) => t + ribbonH(s.amount), 0)
            pos.set(id, { y0: y, h })
            cursor.set(id, y)
            y += h + NODE_GAP
        }
        return { pos, cursor, end: y }
    }
    const left = layoutSide(debtors, (id) =>
        allFlows.filter((s) => s.debtorId === id)
    )
    const right = layoutSide(creditors, (id) =>
        allFlows.filter((s) => s.creditorId === id)
    )
    const H = Math.max(left.end, right.end) - NODE_GAP + 32

    // Users touched by a highlighted ribbon — used to keep their nodes lit
    const activeUserIds = new Set<number>()
    if (selection) {
        for (const s of allFlows) {
            if (isHighlighted(s)) {
                activeUserIds.add(s.debtorId)
                activeUserIds.add(s.creditorId)
            }
        }
    }

    const selectRibbon = (key: string) =>
        setSelection(
            selection?.kind === 'ribbon' && selection.key === key
                ? null
                : { kind: 'ribbon', key }
        )

    // Precompute geometry so ribbon fills and amount pills can render in
    // separate layers — pills sit on top so their values stay legible even
    // over a neighbouring ribbon.
    const flows = allFlows.map((s) => {
        const key = ribbonKey(s)
        const highlighted = isHighlighted(s)
        const th = ribbonH(s.amount)
        const y1 = left.cursor.get(s.debtorId)!
        left.cursor.set(s.debtorId, y1 + th)
        const y2 = right.cursor.get(s.creditorId)!
        right.cursor.set(s.creditorId, y2 + th)
        const x1 = LEFT_X + NODE_W
        const x2 = RIGHT_X - NODE_W
        const cx = (x1 + x2) / 2
        const debtor = participantById.get(s.debtorId)
        const involvesYou = s.debtorId === youId || s.creditorId === youId
        const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}
                      L ${x2} ${y2 + th} C ${cx} ${y2 + th}, ${cx} ${y1 + th}, ${x1} ${y1 + th} Z`
        const midY = (y1 + y2 + th) / 2
        // Ribbon fill fades when it's not the focus; the amount pill stays
        // readable at rest and only dims when another flow is selected.
        // Settled ribbons are always ghosted — they're history, not a todo.
        const pathOpacity = s.settled
            ? highlighted
                ? 0.5
                : 0.18
            : highlighted === null
              ? involvesYou
                  ? 1
                  : 0.45
              : highlighted
                ? 1
                : 0.15
        const pillOpacity =
            highlighted === null ? 1 : highlighted ? 1 : 0.3
        return {
            key,
            highlighted,
            settled: s.settled,
            path,
            cx,
            midY,
            amount: s.amount,
            color: debtor?.iconColor ?? DEFAULT_ICON_COLOR,
            pathOpacity,
            pillOpacity,
        }
    })
    // Highlighted flows render last within each layer so they sit on top
    const ordered = [
        ...flows.filter((f) => !f.highlighted),
        ...flows.filter((f) => f.highlighted),
    ]

    const ribbonPaths = ordered.map((f) => (
        <path
            key={f.key}
            d={f.path}
            fill={f.color}
            stroke={f.settled ? '#2e7d32' : colors.primaryBlack}
            strokeWidth={f.highlighted ? 2.5 : 1.5}
            strokeDasharray={f.settled ? '5 4' : undefined}
            opacity={f.pathOpacity}
            onClick={(e) => {
                e.stopPropagation()
                selectRibbon(f.key)
            }}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
        />
    ))

    const ribbonPills = ordered.map((f) => (
        <g
            key={f.key}
            opacity={f.pillOpacity}
            onClick={(e) => {
                e.stopPropagation()
                selectRibbon(f.key)
            }}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}>
            <rect
                x={f.cx - (f.settled ? 32 : 27)}
                y={f.midY - 10}
                width={f.settled ? 64 : 54}
                height={20}
                rx={10}
                fill={f.highlighted ? colors.primaryYellow : colors.primaryWhite}
                stroke={f.settled ? '#2e7d32' : colors.primaryBlack}
                strokeWidth={f.highlighted ? 1.5 : 1}
            />
            <text
                x={f.cx}
                y={f.midY + 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={800}
                fill={f.settled ? '#2e7d32' : colors.primaryBlack}>
                {f.settled ? `✓ ${formatUsd(f.amount)}` : formatUsd(f.amount)}
            </text>
        </g>
    ))

    const node = (id: number, pos: NodePos, side: 'left' | 'right') => {
        const p = participantById.get(id)
        const cx = side === 'left' ? LEFT_X - 26 : RIGHT_X + 26
        const rectX = side === 'left' ? LEFT_X : RIGHT_X - NODE_W
        const isYou = id === youId
        const isSelectedUser =
            selection?.kind === 'user' && selection.id === id
        // Fade nodes not connected to a highlighted ribbon
        const dimmed = selection !== null && !activeUserIds.has(id)
        const amount = side === 'left' ? owesTotal(id) : owedTotal(id)
        const color = p?.iconColor ?? DEFAULT_ICON_COLOR
        return (
            <g
                key={`${side}-${id}`}
                onClick={(e) => {
                    e.stopPropagation()
                    setSelection(isSelectedUser ? null : { kind: 'user', id })
                }}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                opacity={dimmed ? 0.2 : 1}>
                <rect
                    x={rectX}
                    y={pos.y0}
                    width={NODE_W}
                    height={pos.h}
                    fill={color}
                    stroke={colors.primaryBlack}
                    strokeWidth={1.5}
                    rx={2}
                />
                {isYou && (
                    <circle
                        cx={cx}
                        cy={pos.y0 + pos.h / 2 - 8}
                        r={17}
                        fill="none"
                        stroke={colors.primaryYellow}
                        strokeWidth={4}
                    />
                )}
                <circle
                    cx={cx}
                    cy={pos.y0 + pos.h / 2 - 8}
                    r={14}
                    fill={color}
                    stroke={colors.primaryBlack}
                    strokeWidth={isSelectedUser ? 3 : 1.2}
                />
                <text
                    x={cx}
                    y={pos.y0 + pos.h / 2 - 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}>
                    {initialsOf(p)}
                </text>
                {amount > 0.005 ? (
                    <text
                        x={cx}
                        y={pos.y0 + pos.h / 2 + 22}
                        textAnchor="middle"
                        fontSize={10.5}
                        fontWeight={800}
                        fill={side === 'left' ? '#c0392b' : '#2e7d32'}>
                        {side === 'left' ? '−' : '+'}
                        {formatUsd(amount)}
                    </text>
                ) : (
                    // Nothing outstanding on this side — only settled history
                    <text
                        x={cx}
                        y={pos.y0 + pos.h / 2 + 22}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontWeight={800}
                        fill="#2e7d32">
                        ✓ settled
                    </text>
                )}
            </g>
        )
    }

    return (
        <Box
            sx={{
                ...cardSx,
                width: '100%',
                paddingY: 1.5,
                paddingX: 1,
            }}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                onClick={() => setSelection(null)}
                style={{ display: 'block', width: '100%' }}>
                <text
                    x={LEFT_X - 26}
                    y={14}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={colors.primaryBrown}>
                    PAYS
                </text>
                <text
                    x={RIGHT_X + 26}
                    y={14}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={colors.primaryBrown}>
                    GETS
                </text>
                {ribbonPaths}
                {debtors.map((d) => node(d, left.pos.get(d)!, 'left'))}
                {creditors.map((c) => node(c, right.pos.get(c)!, 'right'))}
                {ribbonPills}
            </svg>
        </Box>
    )
}
