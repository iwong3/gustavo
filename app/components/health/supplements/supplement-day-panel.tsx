'use client'

import { Box, Typography } from '@mui/material'
import { IconPlus } from '@tabler/icons-react'

import { colors, pressRowSx, pressShadowSx, supplementColors } from '@/lib/colors'
import type { DayChange, DayRow, DaySummary } from '@/lib/health/supplement-calendar'
import { Capsules } from './capsules'

const RULE = 'rgba(0, 0, 0, 0.12)'
const BADGE = { add: '+', remove: '−', change: '±' } as const

export const dayLabel = (date: string) =>
    new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })

/**
 * One day, opened from the calendar: what changed in the stack that day,
 * then what was due with its capsules — editable, so fixing a missed dose is
 * one tap (same tap rules as the tiles). Day counts are as of that day.
 * Anything else you might have taken (as-needed, or a stack supplement on a
 * break then) sits in one quiet "Also took" row at the end.
 * Presentational — rows/changes come from supplement-calendar.ts.
 */
export function SupplementDayPanel({
    date,
    isPast,
    summary,
    changes,
    rows,
    extras,
    onTapRow,
    onLogExtra,
}: {
    date: string
    /** Before today — a due dose not taken reads "missed". */
    isPast: boolean
    summary: DaySummary
    changes: DayChange[]
    rows: DayRow[]
    /** "Also took" chips: as-needed, or stack ones not due that day. */
    extras: { supplementId: number; name: string }[]
    onTapRow: (row: DayRow) => void
    onLogExtra: (item: { supplementId: number; name: string }) => void
}) {
    return (
        <Box sx={{ backgroundColor: colors.secondaryYellow }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    paddingX: 1.5,
                    paddingTop: 1.25,
                    paddingBottom: 0.75,
                }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {dayLabel(date)}
                </Typography>
                {summary.due > 0 && (
                    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        <Box component="span" sx={{ color: supplementColors.deep, fontSize: 12.5 }}>
                            {summary.taken}
                        </Box>
                        <Box component="span" sx={{ color: '#a8865a', marginX: '4px' }}>
                            /
                        </Box>
                        {summary.due} doses
                    </Typography>
                )}
            </Box>

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

            {extras.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        paddingX: 1.5,
                        paddingY: 1,
                        borderTop: `1px solid ${RULE}`,
                    }}>
                    <Typography sx={{ fontSize: 12, color: colors.primaryBrown, marginRight: 0.25 }}>
                        Also took
                    </Typography>
                    {extras.map((a) => (
                        <Box
                            key={a.supplementId}
                            component="button"
                            type="button"
                            onClick={() => onLogExtra(a)}
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                height: 30,
                                paddingX: 1,
                                font: 'inherit',
                                fontSize: 12.5,
                                fontWeight: 500,
                                cursor: 'pointer',
                                color: colors.primaryBlack,
                                backgroundColor: colors.primaryWhite,
                                border: `1px solid ${colors.primaryBlack}`,
                                borderRadius: '4px',
                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                ...pressShadowSx,
                            }}>
                            <IconPlus size={13} stroke={2.4} />
                            {a.name}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    )
}
