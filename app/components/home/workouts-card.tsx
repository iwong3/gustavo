'use client'

/**
 * WorkoutsCard — the home page's workout launcher, in a departures-board
 * frame (BoardCard) whose pill counts overdue groups.
 *
 * Top: a + (opens a blank workout form) and your routines (workout presets)
 * — one tap logs today's workout from the routine, exactly like the chips on
 * the Health page, and styled like them. A red dot marks routines that train
 * an overdue group.
 * Below, the history strip: one row per muscle group in the Health page's
 * order (DAYS_SINCE_ORDER — fixed, never re-sorted), each with its last 14
 * days as tiny cells (filled = trained that day) and the days since, coloured
 * by the Health page's days-since scale.
 *
 * Presentational + gallery-importable: data and the apply handler come in via
 * props (the page owns the mutation + Undo toast); `today` pins the strip.
 */
import { Box, Typography } from '@mui/material'
import { IconBarbell, IconPlus } from '@tabler/icons-react'
import Link from 'next/link'
import { useMemo } from 'react'

import { colors, healthColors, pressShadowSx } from '@/lib/colors'
import type { DaysSince, Workout, WorkoutPreset } from '@/lib/health-types'
import {
    OVERDUE_DAYS,
    getDaysSinceColor,
    recommendPreset,
    trainedDatesByGroup,
    windowDates,
} from '@/lib/health/days-since'
import {
    DAYS_SINCE_ORDER,
    getParents,
    isGroup,
} from '@/lib/health/muscle-groups'
import BoardCard from './board-card'
import { FROM_HOME } from './home-utils'

const CONTROL_H = 30
/** Days in the history strip. */
const STRIP_DAYS = 14

/**
 * Row colours: one warm ramp (cream → peach → coral) rather than the Health
 * page's green/orange/red, so the card stays in one colour family under its
 * orange header — the darker the row, the more it needs you. The status dot
 * keeps the Health page's colours. Day-count text is darkened per band.
 */
function rowTone(days: number | null) {
    if (days === null) return { bg: '#faf6ee', text: '#9a8d78' }
    if (days <= 3) return { bg: '#fff4e3', text: '#5f6b2a' }
    if (days < OVERDUE_DAYS) return { bg: '#ffd9a8', text: '#8a4b12' }
    return { bg: '#ffab91', text: '#8c1d0e' }
}

/** Groups a routine trains — targets (Lats) roll up to their group (Upper Back). */
function presetGroups(preset: WorkoutPreset): string[] {
    return preset.muscleGroups.flatMap((mg) =>
        isGroup(mg.name) ? [mg.name] : getParents(mg.name)
    )
}

export default function WorkoutsCard({
    daysSince,
    workouts,
    today,
    presets,
    applyingId,
    appliedId,
    onApplyPreset,
}: {
    daysSince: DaysSince[]
    /** Recent workouts — at least the last STRIP_DAYS days. */
    workouts: Workout[]
    /** Local YYYY-MM-DD; the strip's last cell. */
    today: string
    presets: WorkoutPreset[]
    /** Routine whose log request is in flight. */
    applyingId: number | null
    /** Routine logged from here this session — its chip turns green. */
    appliedId: number | null
    onApplyPreset: (preset: WorkoutPreset) => void
}) {
    const daysByGroup = useMemo(
        () => new Map(daysSince.map((d) => [d.muscleGroup, d.daysSince])),
        [daysSince]
    )
    const overdue = useMemo(
        () =>
            new Set(
                daysSince
                    .filter(
                        (d) =>
                            d.daysSince !== null && d.daysSince >= OVERDUE_DAYS
                    )
                    .map((d) => d.muscleGroup)
            ),
        [daysSince]
    )
    const dates = useMemo(() => windowDates(today, STRIP_DAYS), [today])
    const trained = useMemo(() => trainedDatesByGroup(workouts), [workouts])
    const busy = applyingId !== null
    const next = useMemo(() => recommendPreset(presets, daysSince), [presets, daysSince])

    return (
        <BoardCard
            href="/gustavo/health/exercise"
            headerBg={healthColors.workouts}
            icon={<IconBarbell size={14} stroke={2.3} />}
            title="Workouts"
            pill={
                // Suggest the routine that hits your most neglected group;
                // without routines, fall back to the overdue count
                next
                    ? { label: `Next: ${next.preset.name}`, tone: next.days >= OVERDUE_DAYS ? 'alert' : 'neutral' }
                    : presets.length === 0 && overdue.size > 0
                      ? { label: `${overdue.size} overdue`, tone: 'alert' }
                      : { label: 'On track', tone: 'good' }
            }>
            {/* Log row: + opens a blank workout; each routine logs today's
                workout from it in one tap. Styled like the Health page's row. */}
            <Box
                sx={{
                    'display': 'flex',
                    'alignItems': 'center',
                    'gap': 1,
                    'overflowX': 'auto',
                    // Bleed to the card edge so chips scroll under it; leave
                    // room for their hard shadows
                    'marginX': -1.5,
                    'paddingX': 1.5,
                    'paddingBottom': 0.5,
                    'scrollbarWidth': 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}>
                <Box
                    component={Link}
                    href={`/gustavo/health/exercise/new?${FROM_HOME}`}
                    aria-label="Log a workout"
                    sx={{
                        // No routines: the + would sit alone, so it grows a label
                        ...(presets.length === 0
                            ? {
                                  gap: 0.5,
                                  paddingX: 1.5,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  textDecoration: 'none',
                              }
                            : { width: CONTROL_H }),
                        height: CONTROL_H,
                        flexShrink: 0,
                        borderRadius: 999,
                        backgroundColor: colors.primaryYellow,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.primaryBlack,
                        ...pressShadowSx,
                    }}>
                    <IconPlus size={16} stroke={2.6} />
                    {presets.length === 0 && 'Log workout'}
                </Box>
                {presets.map((preset) => {
                    const due = presetGroups(preset).some((g) => overdue.has(g))
                    return (
                        <Box
                            key={preset.id}
                            component="button"
                            type="button"
                            disabled={busy}
                            onClick={() => onApplyPreset(preset)}
                            sx={{
                                'display': 'flex',
                                'alignItems': 'center',
                                'gap': 0.75,
                                'height': 28,
                                'flexShrink': 0,
                                'paddingX': 1.25,
                                'font': 'inherit',
                                'fontSize': 12,
                                'fontWeight': 600,
                                'whiteSpace': 'nowrap',
                                'color': colors.primaryBlack,
                                'border': `1.5px solid ${colors.primaryBlack}`,
                                'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                'borderRadius': '4px',
                                'backgroundColor':
                                    applyingId === preset.id
                                        ? colors.primaryYellow
                                        : appliedId === preset.id
                                          ? '#c8e6c9'
                                          : colors.primaryWhite,
                                'opacity':
                                    busy && applyingId !== preset.id ? 0.5 : 1,
                                'cursor': busy ? 'default' : 'pointer',
                                'transition': 'all 0.15s',
                                '&:active': {
                                    boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                    transform: 'translate(1px, 1px)',
                                },
                            }}>
                            {due && (
                                <Box
                                    aria-label="trains an overdue group"
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        backgroundColor:
                                            getDaysSinceColor(OVERDUE_DAYS),
                                        border: `1px solid ${colors.primaryBlack}`,
                                    }}
                                />
                            )}
                            {preset.name}
                        </Box>
                    )
                })}
            </Box>

            {/* History strip — fixed Health-page order; each row tinted edge to
                edge by its status (green / orange / red / grey) so the state
                reads at a glance. Bleeds out of the body padding to the card's
                sides and bottom; 2px of card white separates the bands. */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    marginX: -1.5,
                    marginBottom: -1.5,
                }}>
                {DAYS_SINCE_ORDER.map((group) => {
                    const days = daysByGroup.get(group) ?? null
                    const overdueRow = days !== null && days >= OVERDUE_DAYS
                    const tone = rowTone(days)
                    const hit = trained.get(group)
                    return (
                        <Box
                            key={group}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                height: 32,
                                paddingX: 1.75,
                                backgroundColor: tone.bg,
                            }}>
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: getDaysSinceColor(days),
                                    border: `1px solid ${colors.primaryBlack}`,
                                    flexShrink: 0,
                                }}
                            />
                            <Typography
                                sx={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: 13.5,
                                    fontWeight: overdueRow ? 600 : 400,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                {group}
                            </Typography>
                            <Box
                                aria-label={`${group}: trained ${hit?.size ?? 0} of the last ${STRIP_DAYS} days`}
                                sx={{
                                    display: 'flex',
                                    gap: '2px',
                                    flexShrink: 0,
                                }}>
                                {dates.map((date, i) => (
                                    <Box
                                        key={date}
                                        sx={{
                                            width: 6,
                                            height: 12,
                                            borderRadius: '1.5px',
                                            // Empty cells: a see-through wash so they sit on any row tint
                                            backgroundColor: hit?.has(date)
                                                ? colors.primaryBrown
                                                : 'rgba(83, 59, 35, 0.13)',
                                            ...(i === dates.length - 1 && {
                                                outline: `1px solid ${colors.primaryBlack}`,
                                            }),
                                        }}
                                    />
                                ))}
                            </Box>
                            <Typography
                                sx={{
                                    width: 30,
                                    flexShrink: 0,
                                    textAlign: 'right',
                                    fontFamily: 'var(--font-mono, monospace)',
                                    fontSize: 12,
                                    fontWeight: overdueRow ? 700 : 500,
                                    color: tone.text,
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                {days === null ? '—' : `${days}d`}
                            </Typography>
                        </Box>
                    )
                })}
            </Box>
        </BoardCard>
    )
}
