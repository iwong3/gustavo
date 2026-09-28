'use client'

import { Box, Collapse, Typography } from '@mui/material'
import { IconChevronRight, IconMinus, IconPlus } from '@tabler/icons-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { colors, healthColors, pressRowSx, pressShadowSx, supplementColors } from '@/lib/colors'
import { MAX_DAILY_DOSES } from '@/lib/health/supplement-stack'
import { STRIP_H, stripNumSx, stripWordSx } from 'components/home/board-card'
import { SwipeableRow } from 'components/receipts/swipeable-row'

export type StackRow = {
    supplementId: number
    name: string
    dosage: string | null
    /** Doses/day in the daily stack; null = off the stack (as needed / stopped). */
    dailyDoses: number | null
    /** Day X of the current run (daily stack only). */
    dayOfRun: number | null
    /** First day of the current run, ISO. */
    since: string | null
    /** Last day with a dose, ISO. */
    lastTaken: string | null
}

const RULE = 'rgba(0, 0, 0, 0.12)'
/** A row moving between boards: collapse out / grow in, boards ease. */
const MOVE_MS = 260
/** Stepper edits settle this long before saving, so 1× → 3× is one change. */
const COMMIT_MS = 700

/** "Mar 20" (+ year if not this one's). */
export function shortDate(date: string, today: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(date.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}),
    })
}

/** "today", "yesterday", "Sat" within a week, else shortDate. */
export function relativeDay(date: string, today: string): string {
    const d = new Date(date + 'T00:00:00')
    const days = Math.round((new Date(today + 'T00:00:00').getTime() - d.getTime()) / 86_400_000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days > 1 && days < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
    return shortDate(date, today)
}

/**
 * Every supplement in two boards: the daily stack (with its doses a day)
 * and "Off the stack" (0× — as needed or stopped, with when you last took
 * it). Tap a row to edit it; swipe to delete. A daily row's 2× tag widens
 * into − 2× + in place (tap the count again to close); the change saves once
 * you stop tapping, and stepping to 0 moves it off the stack. An off-the-stack
 * row's + puts it back at 1×. The page offers Undo for both moves.
 * Presentational: rows and callbacks come in via props.
 */
export function YourStack({
    rows,
    today,
    onOpen,
    onDelete,
    onSetDoses,
}: {
    rows: StackRow[]
    today: string
    onOpen: (supplementId: number) => void
    onDelete: (supplementId: number) => void
    onSetDoses: (row: StackRow, dailyDoses: number | null) => void
}) {
    const [expanded, setExpanded] = useState<number | null>(null)

    // A row that changes boards collapses out of the old one while it grows
    // into the new one (a "ghost" copy stays behind in the old board just
    // long enough to animate out), so both boards ease to their new heights
    // together. The arriving row flashes briefly.
    const [seen, setSeen] = useState(rows)
    const [ghosts, setGhosts] = useState<StackRow[]>([])
    const [arrived, setArrived] = useState<ReadonlySet<number>>(() => new Set())
    if (seen !== rows) {
        // Adjusting state while rendering (not in an effect), so the arriving
        // row mounts already knowing to animate in
        const before = new Map(seen.map((r) => [r.supplementId, r]))
        const moved = rows.filter((r) => {
            const was = before.get(r.supplementId)
            return was && (was.dailyDoses === null) !== (r.dailyDoses === null)
        })
        setSeen(rows)
        if (moved.length > 0) {
            const ids = new Set(moved.map((r) => r.supplementId))
            setGhosts((g) => [
                ...g.filter((x) => !ids.has(x.supplementId)),
                ...moved.map((r) => before.get(r.supplementId) as StackRow),
            ])
            setArrived((a) => new Set([...Array.from(a), ...Array.from(ids)]))
        }
    }
    // Ghosts and the arrival flash clear once the moves have played out
    useEffect(() => {
        if (ghosts.length === 0 && arrived.size === 0) return
        const t = setTimeout(() => {
            setGhosts([])
            setArrived(new Set())
        }, MOVE_MS + 700)
        return () => clearTimeout(t)
    }, [ghosts, arrived])

    const daily = rows.filter((r) => r.dailyDoses !== null)
    const off = rows.filter((r) => r.dailyDoses === null)
    const perDay = daily.reduce((n, r) => n + (r.dailyDoses ?? 0), 0)

    const board = (
        side: 'daily' | 'off',
        title: string,
        list: StackRow[],
        strip: React.ReactNode,
        bg: string
    ) => {
        // Live rows + ghosts leaving this board, in name order so a leaving
        // row collapses where it was
        const leaving = ghosts.filter((g) => (g.dailyDoses !== null) === (side === 'daily'))
        const items = [
            ...list.map((row) => ({ row, ghost: false })),
            ...leaving
                .filter((g) => !list.some((r) => r.supplementId === g.supplementId))
                .map((row) => ({ row, ghost: true })),
        ].sort((a, b) => a.row.name.localeCompare(b.row.name))
        const lastLive = [...items].reverse().find((i) => !i.ghost)?.row.supplementId
        return (
            // The whole board eases in/out when its first row arrives or its
            // last one leaves
            <Collapse in={list.length > 0} timeout={MOVE_MS} appear={false} unmountOnExit>
                <Box
                    sx={{
                        border: `1px solid ${colors.primaryBlack}`,
                        borderRadius: '8px',
                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        backgroundColor: colors.primaryWhite,
                        overflow: 'hidden',
                        // Keeps the gap to the other board inside the collapse
                        marginBottom: side === 'daily' ? 2 : 0,
                    }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            minHeight: STRIP_H,
                            paddingX: 1.75,
                            backgroundColor: bg,
                            borderBottom: `1px solid ${colors.primaryBlack}`,
                        }}>
                        <Typography
                            sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                            {title}
                        </Typography>
                        {strip}
                    </Box>
                    {items.map(({ row, ghost }) => (
                        <Collapse
                            key={`${side}-${row.supplementId}`}
                            in={!ghost}
                            timeout={MOVE_MS}
                            appear={arrived.has(row.supplementId)}>
                            <Row
                                row={row}
                                today={today}
                                last={row.supplementId === lastLive}
                                arrived={!ghost && arrived.has(row.supplementId)}
                                expanded={!ghost && expanded === row.supplementId}
                                onToggle={setExpanded}
                                onOpen={onOpen}
                                onDelete={onDelete}
                                onSetDoses={onSetDoses}
                            />
                        </Collapse>
                    ))}
                </Box>
            </Collapse>
        )
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {board(
                'daily',
                'Daily stack',
                daily,
                <Typography component="span" sx={{ display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1 }}>
                    <Box component="span" sx={{ ...stripNumSx, color: supplementColors.deep }}>
                        {perDay}
                    </Box>
                    <Box component="span" sx={stripWordSx}>
                        DOSES / DAY
                    </Box>
                </Typography>,
                healthColors.supplements
            )}
            {board('off', 'Off the stack', off, null, supplementColors.fillLight)}
        </Box>
    )
}

const Row = memo(function Row({
    row,
    today,
    last,
    arrived,
    expanded,
    onToggle,
    onOpen,
    onDelete,
    onSetDoses,
}: {
    row: StackRow
    today: string
    last: boolean
    /** Just moved into this board — flashes once. */
    arrived: boolean
    expanded: boolean
    onToggle: (id: number | null) => void
    onOpen: (id: number) => void
    onDelete: (id: number) => void
    onSetDoses: (row: StackRow, dailyDoses: number | null) => void
}) {
    const onStack = row.dailyDoses !== null
    // The stepper edits a draft; it saves once you stop tapping (or close it)
    const [draft, setDraft] = useState<number | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const value = draft ?? row.dailyDoses ?? 0

    const commit = useCallback(
        (n: number) => {
            if (timer.current) clearTimeout(timer.current)
            timer.current = null
            setDraft(null)
            if (n !== (row.dailyDoses ?? 0)) {
                onSetDoses(row, n === 0 ? null : n)
                // Crossing on/off the stack moves the row; close it behind
                if ((n === 0) !== !onStack) onToggle(null)
            }
        },
        [row, onStack, onSetDoses, onToggle]
    )
    const step = (d: number) => {
        const n = Math.min(MAX_DAILY_DOSES, Math.max(0, value + d))
        setDraft(n)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => commit(n), COMMIT_MS)
    }
    // Closing the stepper saves right away
    const toggle = () => {
        if (expanded && draft !== null) commit(draft)
        onToggle(expanded ? null : row.supplementId)
    }
    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current)
    }, [])

    const sub = onStack
        ? [
              row.dosage,
              row.dayOfRun !== null ? `Day ${row.dayOfRun}` : null,
              row.since ? `since ${shortDate(row.since, today)}` : null,
          ]
        : [row.dosage, row.lastTaken ? `last taken ${relativeDay(row.lastTaken, today)}` : 'not taken yet']

    return (
        <SwipeableRow
            canEdit
            canDelete
            onEdit={() => onOpen(row.supplementId)}
            onDelete={() => onDelete(row.supplementId)}
            backgroundColor={colors.primaryWhite}
            showBottomBorder={!last}
            borderColor={RULE}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: 52,
                    ...(arrived && {
                        '@keyframes stackArrive': {
                            from: { backgroundColor: `${colors.primaryYellow}8c` },
                            to: { backgroundColor: 'transparent' },
                        },
                        'animation': 'stackArrive 0.9s ease-out',
                        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    }),
                }}>
                <Box
                    component="button"
                    type="button"
                    onClick={() => onOpen(row.supplementId)}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        alignSelf: 'stretch',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        paddingLeft: 1.75,
                        paddingRight: 1,
                        paddingY: 0.75,
                        font: 'inherit',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: onStack ? colors.primaryBlack : colors.primaryBrown,
                        ...pressRowSx,
                    }}>
                    <Typography noWrap sx={{ fontSize: 14, fontWeight: 500, lineHeight: 1.25, color: 'inherit' }}>
                        {row.name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 11.5, lineHeight: 1.35, color: colors.primaryBrown }}>
                        {sub.filter(Boolean).map((part, i) => (
                            <span key={i}>
                                {i > 0 && ' · '}
                                {part?.startsWith('Day ') ? (
                                    <Box component="span" sx={{ fontWeight: 700, color: supplementColors.deep }}>
                                        {part}
                                    </Box>
                                ) : (
                                    part
                                )}
                            </span>
                        ))}
                    </Typography>
                </Box>

                {onStack ? (
                    // The count tag; tapped, it widens into − 2× + in place
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'stretch',
                            height: 28,
                            flexShrink: 0,
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: `1px solid ${supplementColors.deep}`,
                            backgroundColor: expanded ? colors.primaryWhite : supplementColors.fillLight,
                            boxShadow: expanded ? `1.5px 1.5px 0px ${colors.primaryBlack}` : 'none',
                            transition: 'box-shadow 0.15s, background-color 0.15s',
                        }}>
                        {expanded && (
                            <StepButton label="Fewer doses" onClick={() => step(-1)}>
                                <IconMinus size={13} stroke={2.6} />
                            </StepButton>
                        )}
                        <Box
                            component="button"
                            type="button"
                            aria-expanded={expanded}
                            aria-label={
                                expanded
                                    ? `Done changing ${row.name}`
                                    : `${row.name}: ${row.dailyDoses}× a day — change`
                            }
                            onClick={toggle}
                            sx={{
                                minWidth: 36,
                                paddingX: 0.75,
                                cursor: 'pointer',
                                font: 'inherit',
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: 11.5,
                                fontWeight: 700,
                                border: 'none',
                                borderLeft: expanded ? `1px solid ${supplementColors.deep}` : 'none',
                                borderRight: expanded ? `1px solid ${supplementColors.deep}` : 'none',
                                color: supplementColors.deep,
                                backgroundColor: expanded ? colors.primaryYellow : 'transparent',
                                ...pressRowSx,
                            }}>
                            {value === 0 ? 'Off' : `${value}×`}
                        </Box>
                        {expanded && (
                            <StepButton
                                label="More doses"
                                disabled={value === MAX_DAILY_DOSES}
                                onClick={() => step(1)}>
                                <IconPlus size={13} stroke={2.6} />
                            </StepButton>
                        )}
                    </Box>
                ) : (
                    // Off the stack: one tap puts it back at 1× (Undo toast)
                    <Box
                        component="button"
                        type="button"
                        aria-label={`Add ${row.name} to the daily stack`}
                        onClick={() => onSetDoses(row, 1)}
                        sx={{
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                            padding: 0,
                            cursor: 'pointer',
                            color: colors.primaryBlack,
                            backgroundColor: colors.primaryWhite,
                            border: `1px solid ${colors.primaryBlack}`,
                            borderRadius: '4px',
                            boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                            ...pressShadowSx,
                        }}>
                        <IconPlus size={15} stroke={2.4} />
                    </Box>
                )}

                <Box
                    component="button"
                    type="button"
                    aria-label={`Edit ${row.name}`}
                    onClick={() => onOpen(row.supplementId)}
                    sx={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 36,
                        alignSelf: 'stretch',
                        padding: 0,
                        border: 'none',
                        cursor: 'pointer',
                        color: colors.primaryBrown,
                        backgroundColor: 'transparent',
                        ...pressRowSx,
                    }}>
                    <IconChevronRight size={16} stroke={2} />
                </Box>
            </Box>
        </SwipeableRow>
    )
})

function StepButton({
    label,
    disabled = false,
    onClick,
    children,
}: {
    label: string
    disabled?: boolean
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <Box
            component="button"
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            sx={{
                width: 30,
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                border: 'none',
                cursor: disabled ? 'default' : 'pointer',
                color: colors.primaryBlack,
                backgroundColor: 'transparent',
                opacity: disabled ? 0.3 : 1,
                ...(disabled ? {} : pressRowSx),
            }}>
            {children}
        </Box>
    )
}
