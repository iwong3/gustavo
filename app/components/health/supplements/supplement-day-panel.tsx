'use client'

import { Box, Typography } from '@mui/material'
import { IconPencil } from '@tabler/icons-react'

import { colors, pressRowSx, pressShadowSx, supplementColors } from '@/lib/colors'
import type { DayChange, DayRow, DaySummary } from '@/lib/health/supplement-calendar'
import { Capsules } from './capsules'
import { weekdayColumn } from './supplement-calendar'

const BG = supplementColors.fillLight
/** Row dividers on lavender: the deep purple, faint. */
const RULE = 'rgba(111, 92, 141, 0.25)'
const BADGE = { add: '+', remove: '−', change: '±' } as const
/** The calendar grid's side padding (12px) — the tab lines up with its columns. */
const GRID_INSET = 12

export const dayLabel = (date: string) =>
    new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })

/**
 * One day, opened from the calendar just above: a lavender panel whose tab
 * points up at that day. What was due, with its capsules — tap a row to fix
 * it (same rules as the tiles) — then what changed in the stack that day. The
 * pencil opens the day's log form for anything else (as-needed supplements,
 * one taken during a break). Day counts are as of that day. Presentational —
 * rows/changes come from supplement-calendar.ts.
 */
export function SupplementDayPanel({
    date,
    isPast,
    summary,
    changes,
    rows,
    onTapRow,
    onEdit,
}: {
    date: string
    /** Before today — a due dose not taken reads "missed". */
    isPast: boolean
    summary: DaySummary
    changes: DayChange[]
    rows: DayRow[]
    onTapRow: (row: DayRow) => void
    onEdit: () => void
}) {
    const col = weekdayColumn(date)
    return (
        <Box sx={{ position: 'relative', backgroundColor: BG, borderTop: `1px solid ${colors.primaryBlack}` }}>
            {/* The tab: a rotated square whose top corner pokes up through
                the border, over the selected day's column */}
            <Box
                aria-hidden="true"
                sx={{
                    position: 'absolute',
                    top: -8,
                    left: `calc(${GRID_INSET}px + (100% - ${GRID_INSET * 2}px) * ${(col + 0.5) / 7})`,
                    width: 14,
                    height: 14,
                    backgroundColor: BG,
                    borderLeft: `1px solid ${colors.primaryBlack}`,
                    borderTop: `1px solid ${colors.primaryBlack}`,
                    transform: 'translateX(-50%) rotate(45deg)',
                }}
            />
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    paddingLeft: 1.5,
                    paddingRight: 1,
                    paddingY: 0.75,
                    minHeight: 44,
                }}>
                <Typography sx={headSx}>{dayLabel(date)}</Typography>
                {summary.due > 0 && (
                    <Typography aria-hidden="true" sx={{ ...headSx, color: '#a8865a' }}>
                        ·
                    </Typography>
                )}
                {summary.due > 0 && (
                    <Typography sx={headSx}>
                        <Box component="span" sx={{ color: supplementColors.deep, fontSize: 12.5 }}>
                            {summary.taken}
                        </Box>
                        <Box component="span" sx={{ color: '#a8865a', marginX: '4px' }}>
                            /
                        </Box>
                        {summary.due} doses
                    </Typography>
                )}
                <Box
                    component="button"
                    type="button"
                    aria-label={`Edit ${dayLabel(date)}`}
                    onClick={onEdit}
                    sx={{
                        marginLeft: 'auto',
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
                    <IconPencil size={15} stroke={2.2} />
                </Box>
            </Box>

            {rows.map((row) => {
                const done = row.taken >= row.dosesPerDay
                const missed = isPast && row.due > 0 && row.taken < row.due
                const sub = [missed ? 'missed' : null, row.dayOfRun !== null ? `day ${row.dayOfRun}` : null]
                    .filter(Boolean)
                    .join(' · ')
                return (
                    <Box
                        key={row.supplementId}
                        component="button"
                        type="button"
                        onClick={() => onTapRow(row)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            width: '100%',
                            minHeight: 46,
                            paddingX: 1.5,
                            paddingY: 0.75,
                            font: 'inherit',
                            textAlign: 'left',
                            cursor: 'pointer',
                            border: 'none',
                            borderTop: `1px solid ${RULE}`,
                            backgroundColor: 'transparent',
                            color: done ? colors.primaryBrown : colors.primaryBlack,
                            ...pressRowSx,
                        }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 500, color: 'inherit', lineHeight: 1.25 }}>
                                {row.name}
                            </Typography>
                            {sub && (
                                <Typography sx={{ fontSize: 11.5, color: colors.primaryBrown, lineHeight: 1.3 }}>
                                    {sub}
                                </Typography>
                            )}
                        </Box>
                        <Capsules taken={row.taken} dosesPerDay={row.dosesPerDay} />
                    </Box>
                )
            })}

            {changes.map((c, i) => (
                <Box
                    key={i}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        paddingX: 1.5,
                        paddingY: 0.75,
                        borderTop: `1px solid ${RULE}`,
                        fontSize: 13,
                    }}>
                    <Box
                        component="span"
                        sx={{
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 11,
                            fontWeight: 800,
                            lineHeight: 1,
                            backgroundColor: c.kind === 'remove' ? colors.primaryWhite : colors.primaryYellow,
                            border: `1.2px solid ${colors.primaryBlack}`,
                        }}>
                        {BADGE[c.kind]}
                    </Box>
                    <span>{c.text}</span>
                </Box>
            ))}

            {rows.length === 0 && changes.length === 0 && (
                <Typography sx={{ fontSize: 12.5, color: colors.primaryBrown, paddingX: 1.5, paddingBottom: 1.25 }}>
                    Nothing was due. Tap the pencil to log something.
                </Typography>
            )}
        </Box>
    )
}

/** Date + dose count: the strip's mono caps, like the Home card. */
const headSx = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.primaryBlack,
    whiteSpace: 'nowrap',
} as const
