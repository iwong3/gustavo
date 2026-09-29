'use client'

/**
 * The Workouts page's two blocks (presentational + gallery-importable):
 *
 *  - RotationTiles: one tile per routine, its name only; days since you
 *    last did it sit in a corner badge (the date blocks' badge, rimmed in Home's
 *    green / orange / red). Tap = log it today (the page owns the mutation +
 *    Undo toast). Done today → the workouts tint + a ✓ badge.
 *  - WorkoutWeeks: Sunday-start weeks, newest first. Each header has the
 *    range, a 7-day dot strip and the days trained; its card has one row per
 *    day: the date (with a days-since-last-workout badge after a rest), then a
 *    chip per routine and a dashed chip per extra group. Tap a row → detail, swipe →
 *    edit / delete. A run of empty weeks collapses to one "N weeks off" line.
 *
 * Model: lib/health/workout-days.ts. Ids arrive as strings at runtime.
 */
import { Box, Typography } from '@mui/material'
import { IconChevronRight } from '@tabler/icons-react'
import { Fragment } from 'react'

import { cardSx, colors, healthColors, pressRowSx, pressShadowSx, workoutColors } from '@/lib/colors'
import type { WorkoutPreset } from '@/lib/health-types'
import { getDaysSinceTextColor } from '@/lib/health/days-since'
import { addDaysIso, type WorkoutDay, type WorkoutWeek } from '@/lib/health/workout-days'
import { PrefetchOnVisible } from 'components/prefetch-on-visible'
import { SwipeableRow } from 'components/receipts/swipeable-row'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const parse = (iso: string) => new Date(iso + 'T00:00:00')

export const captionSx = {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.primaryBrown,
    lineHeight: 1.2,
} as const

const numSx = { fontVariantNumeric: 'tabular-nums' } as const

// ── Rotation tiles ───────────────────────────────────────────────────────────

export function RotationTiles({
    presets,
    recency,
    applyingId,
    onApply,
}: {
    presets: WorkoutPreset[]
    /** Days since each routine (by String(id)); null = never. */
    recency: Map<string, number | null>
    applyingId: number | string | null
    onApply: (preset: WorkoutPreset) => void
}) {
    const busy = applyingId != null
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography sx={captionSx}>Rotation</Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(Math.max(presets.length, 1), 5)}, minmax(0, 1fr))`,
                    gap: 1,
                    // Room for the corner badges
                    paddingRight: '6px',
                    paddingBottom: '6px',
                }}>
                {presets.map((p) => {
                    const days = recency.get(String(p.id)) ?? null
                    const applying = busy && String(applyingId) === String(p.id)
                    const done = days === 0
                    return (
                        <Box
                            key={p.id}
                            component="button"
                            type="button"
                            disabled={busy}
                            aria-label={`Log ${p.name} today${days === null ? '' : done ? ' (done today)' : `, last done ${days} days ago`}`}
                            onClick={() => onApply(p)}
                            sx={{
                                position: 'relative',
                                height: 38,
                                minWidth: 0,
                                padding: '0 4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                font: 'inherit',
                                color: colors.primaryBlack,
                                cursor: busy ? 'default' : 'pointer',
                                backgroundColor: applying
                                    ? colors.primaryYellow
                                    : done
                                      ? healthColors.workouts
                                      : colors.primaryWhite,
                                border: `1px solid ${colors.primaryBlack}`,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                borderRadius: '4px',
                                opacity: busy && !applying ? 0.5 : 1,
                                transition: 'opacity 0.15s, background-color 0.15s',
                                ...(!busy && pressShadowSx),
                            }}>
                            <Typography
                                sx={{
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    lineHeight: 1.15,
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                {p.name}
                            </Typography>
                            {days !== null && (
                                // Same corner badge as the rows' date blocks; the rim + number
                                // carry Home's green / orange / red
                                <Box
                                    component="span"
                                    sx={{
                                        ...numSx,
                                        position: 'absolute',
                                        right: -7,
                                        bottom: -7,
                                        minWidth: 20,
                                        height: 17,
                                        px: '4px',
                                        borderRadius: '9px',
                                        backgroundColor: done ? healthColors.workouts : colors.primaryWhite,
                                        border: `1.5px solid ${done ? workoutColors.deep : getDaysSinceTextColor(days)}`,
                                        color: done ? workoutColors.deep : getDaysSinceTextColor(days),
                                        fontSize: 10,
                                        fontWeight: 800,
                                        lineHeight: '14px',
                                        textAlign: 'center',
                                    }}>
                                    {done ? '✓' : days}
                                </Box>
                            )}
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}

// ── Weeks ────────────────────────────────────────────────────────────────────

function weekLabel(start: string, today: string, index: number) {
    const s = parse(start)
    const e = parse(addDaysIso(start, 6))
    const range =
        s.getMonth() === e.getMonth()
            ? `${MON[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`
            : `${MON[s.getMonth()]} ${s.getDate()} – ${MON[e.getMonth()]} ${e.getDate()}`
    const year = e.getFullYear() !== parse(today).getFullYear() ? `, ${e.getFullYear()}` : ''
    const title = index === 0 ? 'This week' : index === 1 ? 'Last week' : null
    return { title, range: range + year }
}

function WeekDots({ start, days, today }: { start: string; days: WorkoutDay[]; today: string }) {
    const byDate = new Map(days.map((d) => [d.date, d]))
    return (
        <Box sx={{ display: 'inline-grid', gridTemplateColumns: 'repeat(7, 9px)', gap: '2.5px' }}>
            {Array.from({ length: 7 }, (_, i) => {
                const date = addDaysIso(start, i)
                const day = byDate.get(date)
                const future = date > today
                const cardio = day?.groups.every((g) => g === 'Cardio')
                return (
                    <Box
                        key={date}
                        sx={{
                            height: 9,
                            borderRadius: '2px',
                            backgroundColor: day
                                ? cardio
                                    ? healthColors.workouts
                                    : workoutColors.fill
                                : future
                                  ? 'transparent'
                                  : workoutColors.light,
                            boxShadow: `inset 0 0 0 1px ${day ? workoutColors.deep : workoutColors.emptyEdge}`,
                            ...(date === today && {
                                outline: `1.5px solid ${colors.primaryBlack}`,
                                outlineOffset: '1px',
                            }),
                        }}
                    />
                )
            })}
        </Box>
    )
}

/** Days since the previous workout, on the date block's corner — shown
 *  after at least one rest day, on Home's scale (2–3 green, 4–6 orange, 7+
 *  red = the old timeline's 1–2 / 3–5 / 6+ rest days). */
function GapBadge({ gap }: { gap: number | null }) {
    if (gap == null || gap < 2) return null
    const tone = getDaysSinceTextColor(gap)
    return (
        <Box
            component="span"
            aria-label={`${gap} days since the last workout`}
            sx={{
                ...numSx,
                position: 'absolute',
                right: -8,
                bottom: 3,
                zIndex: 1,
                minWidth: 18,
                height: 16,
                px: '3px',
                borderRadius: '8px',
                backgroundColor: colors.primaryWhite,
                border: `1.5px solid ${tone}`,
                fontSize: 9.5,
                fontWeight: 800,
                lineHeight: '13px',
                textAlign: 'center',
                color: tone,
            }}>
            {gap}
        </Box>
    )
}

function LabelChip({ label, extra }: { label: string; extra?: boolean }) {
    return (
        <Box
            component="span"
            sx={{
                position: 'relative',
                height: 24,
                display: 'inline-flex',
                alignItems: 'center',
                px: 1,
                borderRadius: '3px',
                fontSize: extra ? 11.5 : 12.5,
                fontWeight: extra ? 600 : 700,
                whiteSpace: 'nowrap',
                ...(extra
                    ? {
                          backgroundColor: colors.primaryWhite,
                          border: `1px dashed ${workoutColors.deep}`,
                          color: colors.primaryBrown,
                      }
                    : {
                          backgroundColor: healthColors.workouts,
                          border: `1px solid ${workoutColors.deep}`,
                          boxShadow: `1px 1px 0px ${workoutColors.deep}`,
                          color: colors.primaryBlack,
                      }),
            }}>
            {label}
        </Box>
    )
}

function DayRow({
    day,
    onOpen,
    onEdit,
    onDelete,
}: {
    day: WorkoutDay<WorkoutPreset>
    onOpen: (day: WorkoutDay<WorkoutPreset>) => void
    onEdit: (day: WorkoutDay<WorkoutPreset>) => void
    onDelete: (day: WorkoutDay<WorkoutPreset>) => void
}) {
    const d = parse(day.date)
    // No routine matched → the groups themselves are the label (no dashes)
    const plain = day.routines.length === 0
    return (
        <SwipeableRow
            canEdit
            canDelete
            onEdit={() => onEdit(day)}
            onDelete={() => onDelete(day)}
            backgroundColor={colors.primaryWhite}
            borderColor={colors.primaryBlack}>
            <Box
                onClick={() => onOpen(day)}
                sx={{
                    display: 'flex',
                    alignItems: 'stretch',
                    minHeight: 48,
                    cursor: 'pointer',
                    backgroundColor: colors.primaryWhite,
                    ...pressRowSx,
                }}>
                <Box
                    sx={{
                        position: 'relative',
                        width: 40,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: workoutColors.light,
                        borderRight: `1px solid ${colors.primaryBlack}1f`,
                    }}>
                    <Typography sx={{ ...captionSx, fontSize: 9, color: colors.primaryBrown }}>
                        {WD[d.getDay()]}
                    </Typography>
                    <Typography sx={{ ...numSx, fontSize: 16, fontWeight: 800, lineHeight: 1.1 }}>
                        {d.getDate()}
                    </Typography>
                    <GapBadge gap={day.gap} />
                </Box>
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 0.75,
                        py: '8px',
                        pl: 1.75,
                        pr: 0.5,
                    }}>
                    {day.routines.map((r) => (
                        <LabelChip key={r.id} label={r.name} />
                    ))}
                    {day.extras.map((g) => (
                        <LabelChip key={g} label={g} extra={!plain} />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
                    <IconChevronRight size={16} stroke={2} color={colors.primaryBrown} />
                </Box>
            </Box>
        </SwipeableRow>
    )
}

type Block =
    | { kind: 'week'; week: WorkoutWeek<WorkoutPreset>; index: number }
    | { kind: 'off'; from: string; to: string; weeks: number }

/** Weeks, with runs of empty weeks (other than this one) folded together. */
function toBlocks(weeks: WorkoutWeek<WorkoutPreset>[]): Block[] {
    const blocks: Block[] = []
    weeks.forEach((week, index) => {
        if (week.days.length > 0 || index === 0) {
            blocks.push({ kind: 'week', week, index })
            return
        }
        const prev = blocks[blocks.length - 1]
        // Weeks run newest → oldest, so an extended run moves its start back
        if (prev?.kind === 'off') {
            prev.from = week.start
            prev.weeks++
        } else blocks.push({ kind: 'off', from: week.start, to: addDaysIso(week.start, 6), weeks: 1 })
    })
    return blocks
}

export function WorkoutWeeks({
    weeks,
    today,
    hrefFor,
    onOpen,
    onEdit,
    onDelete,
}: {
    weeks: WorkoutWeek<WorkoutPreset>[]
    today: string
    /** Detail route for a day, prefetched as its row scrolls into view. */
    hrefFor: (day: WorkoutDay<WorkoutPreset>) => string
    onOpen: (day: WorkoutDay<WorkoutPreset>) => void
    onEdit: (day: WorkoutDay<WorkoutPreset>) => void
    onDelete: (day: WorkoutDay<WorkoutPreset>) => void
}) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            {toBlocks(weeks).map((b) => {
                if (b.kind === 'off') {
                    const f = parse(b.from)
                    const t = parse(b.to)
                    return (
                        <Box
                            key={b.from}
                            sx={{
                                height: 34,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.75,
                                border: `1px dashed ${workoutColors.emptyEdge}`,
                                borderRadius: '4px',
                                backgroundColor: colors.primaryWhite,
                            }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryBrown }}>
                                {b.weeks === 1 ? 'No workouts' : `${b.weeks} weeks off`}
                                <Box component="span" sx={{ fontWeight: 400 }}>
                                    {' · '}
                                    {MON[f.getMonth()]} {f.getDate()} – {f.getMonth() === t.getMonth() ? '' : `${MON[t.getMonth()]} `}
                                    {t.getDate()}
                                </Box>
                            </Typography>
                        </Box>
                    )
                }
                const { week, index } = b
                const { title, range } = weekLabel(week.start, today, index)
                return (
                    <Box key={week.start} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 22 }}>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    {title ?? range}
                                </Typography>
                                {title && (
                                    <Typography sx={{ ...numSx, fontSize: 11, fontWeight: 600, color: colors.primaryBrown, whiteSpace: 'nowrap' }}>
                                        {range}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ marginLeft: 'auto', display: 'flex' }}>
                                <WeekDots start={week.start} days={week.days} today={today} />
                            </Box>
                            <Typography sx={{ ...numSx, fontSize: 13, fontWeight: 800, minWidth: 12, textAlign: 'right' }}>
                                {week.days.length}
                            </Typography>
                        </Box>
                        {week.days.length > 0 ? (
                            <Box sx={{ ...cardSx, borderRadius: '4px', overflow: 'hidden' }}>
                                {week.days.map((day, i) => (
                                    <Fragment key={day.date}>
                                        {i > 0 && <Box sx={{ height: '1px', backgroundColor: `${colors.primaryBlack}1f` }} />}
                                        <PrefetchOnVisible href={hrefFor(day)}>
                                            <DayRow day={day} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
                                        </PrefetchOnVisible>
                                    </Fragment>
                                ))}
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    height: 34,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `1px dashed ${workoutColors.emptyEdge}`,
                                    borderRadius: '4px',
                                    backgroundColor: colors.primaryWhite,
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryBrown }}>
                                    Nothing yet this week
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )
            })}
        </Box>
    )
}
