'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Workout, WorkoutExercise } from '@/lib/health-types'
import { isTarget } from '@/lib/health/muscle-groups'
import { Box, Chip, Typography } from '@mui/material'
import { IconBarbell, IconCopy, IconNotes, IconPencil, IconTrash } from '@tabler/icons-react'
import { curveMonotoneX } from '@visx/curve'
import { scaleLinear } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { useEffect, useMemo, useRef, useState } from 'react'

import FormDrawer from 'components/form-drawer'

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkoutDetailDrawerProps {
    workout: Workout | null
    open: boolean
    onClose: () => void
    onEdit: (workout: Workout) => void
    onDuplicate: (workout: Workout) => void
    onDelete: (id: number) => void
    allWorkouts: Workout[] // for history lookup
}

type HistoryEntry = {
    date: string
    weightLbs: number | null
    sets: { setNumber: number; reps: number | null }[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDrawerTitle(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatShortDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
}

function formatSets(sets: { setNumber: number; reps: number | null }[]): string {
    if (sets.length === 0) return ''
    const repsList = sets.map((s) => s.reps ?? '?')
    const allSame = repsList.every((r) => r === repsList[0])
    if (allSame && sets.length > 1) return `${sets.length}×${repsList[0]}`
    return repsList.join(', ')
}

/** Get the last N times an exercise was performed, before the current workout */
function getExerciseHistory(
    exerciseId: number,
    currentWorkoutDate: string,
    currentWorkoutId: number,
    allWorkouts: Workout[],
    limit = 3
): HistoryEntry[] {
    const history: HistoryEntry[] = []
    for (const w of allWorkouts) {
        if (w.id === currentWorkoutId) continue
        if (w.date >= currentWorkoutDate) continue
        for (const we of w.exercises) {
            if (we.exercise.id === exerciseId) {
                history.push({ date: w.date, weightLbs: we.weightLbs, sets: we.sets })
                break
            }
        }
        if (history.length >= limit) break
    }
    return history
}

/** Get all weight data points for an exercise within 90 days, for sparkline */
function getExerciseWeightHistory(
    exerciseId: number,
    currentWorkoutDate: string,
    currentWorkoutWeight: number | null,
    allWorkouts: Workout[],
): { date: string; weight: number }[] {
    const cutoff = new Date(currentWorkoutDate + 'T00:00:00').getTime() - 90 * 86400000
    const points: { date: string; weight: number }[] = []

    // Add current workout
    if (currentWorkoutWeight != null) {
        points.push({ date: currentWorkoutDate, weight: currentWorkoutWeight })
    }

    for (const w of allWorkouts) {
        if (w.date >= currentWorkoutDate) continue
        if (new Date(w.date + 'T00:00:00').getTime() < cutoff) continue
        for (const we of w.exercises) {
            if (we.exercise.id === exerciseId && we.weightLbs != null) {
                points.push({ date: w.date, weight: we.weightLbs })
                break
            }
        }
    }

    // Sort oldest → newest for the line chart
    return points.sort((a, b) => a.date.localeCompare(b.date))
}

// ── Subcomponents ────────────────────────────────────────────────────────────

const SectionDivider = () => (
    <Box sx={{ mx: 2.5, my: 1.5, borderBottom: '1px solid', borderColor: 'divider' }} />
)

const selectedBg = '#fff8e1'
const selectedBorder = '#b57b00'

/** Compute stats for a muscle group relative to the current workout */
function getMuscleGroupStats(
    groupName: string,
    workoutDate: string,
    allWorkouts: Workout[],
): { daysSinceLast: number | null; lastDate: string | null; avgDaysBetween: number | null } {
    const workoutTs = new Date(workoutDate + 'T00:00:00').getTime()
    const ninetyDaysAgo = workoutTs - 90 * 86400000

    // Collect all dates for this muscle group within 90 days (including current workout)
    const dates: number[] = [workoutTs]
    let lastDate: string | null = null

    for (const w of allWorkouts) {
        const wTs = new Date(w.date + 'T00:00:00').getTime()
        if (wTs >= workoutTs) continue
        const hasGroup = w.muscleGroups.some((mg) => !isTarget(mg.name) && mg.name === groupName)
        if (!hasGroup) continue
        if (!lastDate) lastDate = w.date
        if (wTs >= ninetyDaysAgo) dates.push(wTs)
    }

    const daysSinceLast = lastDate
        ? Math.round((workoutTs - new Date(lastDate + 'T00:00:00').getTime()) / 86400000)
        : null

    // Average gap between consecutive workouts (sorted chronologically)
    let avgDaysBetween: number | null = null
    if (dates.length >= 2) {
        dates.sort((a, b) => a - b)
        let totalGap = 0
        for (let i = 1; i < dates.length; i++) {
            totalGap += dates[i] - dates[i - 1]
        }
        avgDaysBetween = Math.round(totalGap / (dates.length - 1) / 86400000)
    }

    return { daysSinceLast, lastDate, avgDaysBetween }
}

/** Stat card for a muscle group — last workout + avg frequency */
function MuscleGroupStatCard({ groupName, workout, allWorkouts }: {
    groupName: string
    workout: Workout
    allWorkouts: Workout[]
}) {
    const stats = useMemo(
        () => getMuscleGroupStats(groupName, workout.date, allWorkouts),
        [groupName, workout.date, allWorkouts]
    )

    const sectionSx = {
        border: `1px solid ${colors.primaryBlack}`,
        boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
        borderRadius: '4px',
        backgroundColor: colors.secondaryYellow,
        p: 1,
    }

    const chipSx = {
        'height': 22,
        'fontSize': 11,
        'fontWeight': 700,
        'backgroundColor': selectedBg,
        'border': `1px solid ${selectedBorder}`,
        'boxShadow': `1px 1px 0px ${selectedBorder}`,
        'borderRadius': '3px',
        '& .MuiChip-label': { px: 0.75 },
    }

    return (
        <Box sx={sectionSx}>
            <Chip label={groupName} size="small" sx={{ ...chipSx, mb: 0.75 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
                        {stats.daysSinceLast !== null ? stats.daysSinceLast : '–'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: colors.primaryBrown, lineHeight: 1 }}>
                        {stats.daysSinceLast === 1 ? 'day since last workout' : 'days since last workout'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
                        {stats.avgDaysBetween !== null ? `${stats.avgDaysBetween}` : '–'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: colors.primaryBrown, lineHeight: 1 }}>
                        {stats.avgDaysBetween === 1 ? 'day avg between workouts' : 'days avg between workouts'}
                    </Typography>
                </Box>
            </Box>
        </Box>
    )
}

const SPARK_PAD = { top: 14, bottom: 6, left: 8, right: 4 }

/** Background sparkline — positioned to fill the whitespace area of the card */
function WeightSparkline({ points, titleRef, rightColRef }: {
    points: { date: string; weight: number }[]
    titleRef: React.RefObject<HTMLDivElement | null>
    rightColRef: React.RefObject<HTMLDivElement | null>
}) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [dims, setDims] = useState<{ top: number; width: number; height: number } | null>(null)

    useEffect(() => {
        const card = cardRef.current?.closest('[data-sparkline-card]') as HTMLElement | null
        const title = titleRef.current
        const rightCol = rightColRef.current
        if (!card || !title || !rightCol) return

        const cardRect = card.getBoundingClientRect()
        const titleRect = title.getBoundingClientRect()
        const rightRect = rightCol.getBoundingClientRect()

        const top = titleRect.top - cardRect.top
        const rightEdge = rightRect.left - cardRect.left - 8 // gap before weight text
        const height = cardRect.bottom - titleRect.top - 12 // card padding

        if (rightEdge > 0 && height > 0) {
            setDims({ top, width: rightEdge, height })
        }
    }, [titleRef, rightColRef])

    if (points.length < 2 || !dims) {
        return <Box ref={cardRef} sx={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }} />
    }

    const { top, width, height } = dims
    const timestamps = points.map((p) => new Date(p.date + 'T00:00:00').getTime())
    const weights = points.map((p) => p.weight)
    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)
    const wRange = maxW - minW || 1

    const xScale = scaleLinear<number>({
        domain: [Math.min(...timestamps), Math.max(...timestamps)],
        range: [SPARK_PAD.left, width - SPARK_PAD.right],
    })
    const yScale = scaleLinear<number>({
        domain: [minW - wRange * 0.15, maxW],
        range: [height - SPARK_PAD.bottom, SPARK_PAD.top],
    })

    return (
        <Box ref={cardRef} sx={{ position: 'absolute', left: 0, top, width, height, overflow: 'hidden' }}>
            <svg width={width} height={height} style={{ display: 'block' }}>
                {/* Line segments — green for increase, red for decrease */}
                {points.slice(1).map((d, i) => {
                    const prev = points[i]
                    const x1 = xScale(new Date(prev.date + 'T00:00:00').getTime())
                    const y1 = yScale(prev.weight)
                    const x2 = xScale(new Date(d.date + 'T00:00:00').getTime())
                    const y2 = yScale(d.weight)
                    const isUp = d.weight >= prev.weight
                    return (
                        <line
                            key={i}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={isUp ? '#4caf50' : colors.primaryRed}
                            strokeWidth={1.5}
                            strokeOpacity={0.45}
                        />
                    )
                })}
                {/* Dots + weight labels (only highest and earliest lowest) */}
                {(() => {
                    // Find highest point (last occurrence) and earliest lowest point
                    let maxIdx = 0
                    let minIdx = 0
                    for (let i = 1; i < points.length; i++) {
                        if (points[i].weight >= points[maxIdx].weight) maxIdx = i
                        if (points[i].weight < points[minIdx].weight) minIdx = i
                    }
                    const labelIndices = new Set(maxIdx === minIdx ? [maxIdx] : [maxIdx, minIdx])

                    return points.map((d, i) => {
                        const cx = xScale(new Date(d.date + 'T00:00:00').getTime())
                        const cy = yScale(d.weight)
                        const showLabel = labelIndices.has(i)
                        return (
                            <g key={i}>
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={2.5}
                                    fill={`${colors.primaryBlack}20`}
                                    stroke={colors.primaryBlack}
                                    strokeWidth={0.75}
                                    strokeOpacity={0.2}
                                />
                                {showLabel && (
                                    <text
                                        x={cx}
                                        y={i === maxIdx ? cy - 5 : cy + 11}
                                        textAnchor="middle"
                                        fontSize={8}
                                        fontWeight={600}
                                        fill={colors.primaryBlack}
                                        fillOpacity={0.3}
                                    >
                                        {d.weight}
                                    </text>
                                )}
                            </g>
                        )
                    })
                })()}
            </svg>
        </Box>
    )
}

/** Exercise card — weight-focused with history + deltas */
function ExerciseCard({ we, workout, allWorkouts }: {
    we: WorkoutExercise
    workout: Workout
    allWorkouts: Workout[]
}) {
    const history = useMemo(
        () => getExerciseHistory(we.exercise.id, workout.date, workout.id, allWorkouts, 3),
        [we.exercise.id, workout.date, workout.id, allWorkouts]
    )

    const weightPoints = useMemo(
        () => we.exercise.isBodyweight ? [] : getExerciseWeightHistory(we.exercise.id, workout.date, we.weightLbs, allWorkouts),
        [we.exercise.id, workout.date, we.weightLbs, we.exercise.isBodyweight, allWorkouts]
    )

    const setsLabel = formatSets(we.sets)

    // Format weight consistently for alignment
    const weightStr = we.exercise.isBodyweight
        ? 'BW'
        : we.weightLbs
            ? `${we.weightLbs} lbs`
            : null

    // Build unified rows: current workout + history, each with delta vs previous
    const rows: { date: string | null; label: string; sets: string; weight: string | null; delta: number | null; isCurrent: boolean }[] = []

    // Current workout row — delta vs most recent history entry
    const currentDelta = (!we.exercise.isBodyweight && we.weightLbs && history.length > 0 && history[0].weightLbs)
        ? we.weightLbs - history[0].weightLbs
        : null
    rows.push({
        date: null,
        label: we.exercise.name,
        sets: setsLabel,
        weight: weightStr,
        delta: currentDelta,
        isCurrent: true,
    })

    // History rows — delta vs the row below (older entry)
    history.forEach((h, i) => {
        const hWeight = we.exercise.isBodyweight ? 'BW' : h.weightLbs ? `${h.weightLbs} lbs` : null
        const nextEntry = history[i + 1]
        const delta = (!we.exercise.isBodyweight && h.weightLbs && nextEntry?.weightLbs)
            ? h.weightLbs - nextEntry.weightLbs
            : null
        rows.push({
            date: h.date,
            label: '',
            sets: formatSets(h.sets),
            weight: hWeight,
            delta,
            isCurrent: false,
        })
    })

    const deltaCardSx = (d: number) => ({
        px: 0.5,
        py: 0.25,
        border: `1px solid ${d > 0 ? '#4caf50' : colors.primaryRed}`,
        boxShadow: `1px 1px 0px ${d > 0 ? '#4caf50' : colors.primaryRed}`,
        borderRadius: '3px',
        backgroundColor: d > 0 ? '#e8f5e9' : '#fbe9e7',
    })

    // Compute max character widths for dynamic column sizing
    const deltaStrings = rows.map((r) =>
        r.delta !== null && r.delta !== 0 ? `${r.delta > 0 ? '+' : ''}${r.delta}` : ''
    )
    const maxDeltaLen = Math.max(...deltaStrings.map((s) => s.length), 0)
    // ~7px per char at fontSize 10, plus padding for card borders
    const deltaColW = maxDeltaLen > 0 ? maxDeltaLen * 7 + 14 : 0

    const titleRef = useRef<HTMLDivElement>(null)
    const rightColRef = useRef<HTMLDivElement>(null)

    return (
        <Box data-sparkline-card sx={{ ...cardSx, p: 1.5, backgroundColor: colors.secondaryYellow, position: 'relative', overflow: 'hidden' }}>
            {/* Background sparkline — fills whitespace between title and right columns */}
            {weightPoints.length >= 2 && (
                <WeightSparkline points={weightPoints} titleRef={titleRef} rightColRef={rightColRef} />
            )}

            {/* Content — sits on top of sparkline */}
            {rows.map((row, i) => {
                const deltaStr = deltaStrings[i]
                return (
                    <Box key={i} sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative',
                        zIndex: 1,
                        ...(i === 0 ? { pb: 0.5 } : {}),
                        ...(i === 1 ? { pt: 0.75 } : {}),
                        ...(i > 0 ? { py: 0.4 } : {}),
                    }}>
                        {/* Left side */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {row.isCurrent ? (
                                <>
                                    <Typography ref={i === 0 ? titleRef : undefined} sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                                        {row.label}
                                    </Typography>
                                    {row.sets && (
                                        <Typography sx={{ fontSize: 11, color: colors.primaryBrown, mt: 0.25 }}>
                                            {row.sets} reps
                                        </Typography>
                                    )}
                                </>
                            ) : (
                                row.sets ? (
                                    <Typography sx={{ fontSize: 11, color: colors.primaryBrown }}>
                                        {row.sets} reps
                                    </Typography>
                                ) : <Box />
                            )}
                        </Box>

                        {/* Right: date | delta card | weight — dynamic columns */}
                        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            {/* Date column */}
                            {row.date && (
                                <Box sx={{
                                    px: 0.75,
                                    py: 0.25,
                                    mr: 0.5,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                    borderRadius: '3px',
                                    backgroundColor: colors.primaryWhite,
                                }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                                        {formatShortDate(row.date)}
                                    </Typography>
                                </Box>
                            )}
                            {/* Delta column — fixed width based on widest delta */}
                            {deltaColW > 0 && (
                                <Box sx={{ width: deltaColW, display: 'flex', justifyContent: 'center', mr: 0.5 }}>
                                    {deltaStr && (
                                        <Box sx={deltaCardSx(row.delta!)}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', color: row.delta! > 0 ? '#2e7d32' : '#c62828' }}>
                                                {deltaStr}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                            {/* Weight */}
                            <Typography ref={i === 1 ? rightColRef : undefined} sx={{
                                fontSize: 14,
                                fontWeight: 700,
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                                color: colors.primaryBlack,
                            }}>
                                {row.weight ?? ''}
                            </Typography>
                        </Box>
                    </Box>
                )
            })}
        </Box>
    )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function WorkoutDetailDrawer({
    workout,
    open,
    onClose,
    onEdit,
    onDuplicate,
    onDelete,
    allWorkouts,
}: WorkoutDetailDrawerProps) {
    const [confirmDelete, setConfirmDelete] = useState(false)

    if (!workout) return null

    const parentGroups = workout.muscleGroups.filter((mg) => !isTarget(mg.name))

    return (
        <FormDrawer open={open} onClose={onClose}>
            {/* Scrollable content */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    pb: 'calc(24px + env(safe-area-inset-bottom, 0px))',
                }}>
                {/* ── Header ─────────────────────────────────────── */}
                <Box sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Typography sx={{
                            fontSize: 20,
                            fontWeight: 800,
                            fontFamily: 'var(--font-serif)',
                            lineHeight: 1.2,
                        }}>
                            {formatDrawerTitle(workout.date)}
                        </Typography>

                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, mt: 0.5 }}>
                            <Box
                                onClick={() => { onEdit(workout); onClose() }}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'justifyContent': 'center',
                                    'width': 34,
                                    'height': 34,
                                    'borderRadius': '50%',
                                    'border': `1px solid ${colors.primaryBlack}`,
                                    'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                    'backgroundColor': colors.primaryYellow,
                                    'cursor': 'pointer',
                                    '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                                }}>
                                <IconPencil size={16} stroke={2} />
                            </Box>
                            <Box
                                onClick={() => { onDuplicate(workout); onClose() }}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'justifyContent': 'center',
                                    'width': 34,
                                    'height': 34,
                                    'borderRadius': '50%',
                                    'border': `1px solid ${colors.primaryBlack}`,
                                    'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                    'backgroundColor': colors.primaryWhite,
                                    'cursor': 'pointer',
                                    '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                                }}>
                                <IconCopy size={16} stroke={2} color={colors.primaryBrown} />
                            </Box>
                            <Box
                                onClick={() => setConfirmDelete(true)}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'justifyContent': 'center',
                                    'width': 34,
                                    'height': 34,
                                    'borderRadius': '50%',
                                    'border': `1px solid ${colors.primaryBlack}`,
                                    'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                    'backgroundColor': colors.primaryWhite,
                                    'cursor': 'pointer',
                                    '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                                }}>
                                <IconTrash size={16} stroke={2} color={colors.primaryRed} />
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* ── Notes ──────────────────────────────────────── */}
                {workout.notes && (
                    <>
                        <SectionDivider />
                        <Box sx={{ px: 2.5, py: 0.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <IconNotes size={16} color={colors.primaryBrown} style={{ marginTop: 2, flexShrink: 0 }} />
                            <Typography sx={{
                                fontSize: 13,
                                color: colors.primaryBrown,
                                fontStyle: 'italic',
                                lineHeight: 1.5,
                            }}>
                                {workout.notes}
                            </Typography>
                        </Box>
                    </>
                )}

                {/* ── Muscle Groups with Timelines ────────────────── */}
                <SectionDivider />
                <Box sx={{ px: 2.5, pb: 1 }}>
                    <Typography sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: colors.primaryBrown,
                        mb: 1,
                    }}>
                        Muscle Groups
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        {parentGroups.map((mg) => (
                            <MuscleGroupStatCard
                                key={mg.id}
                                groupName={mg.name}
                                workout={workout}
                                allWorkouts={allWorkouts}
                            />
                        ))}
                    </Box>
                </Box>

                {/* ── Exercises ───────────────────────────────────── */}
                {workout.exercises.length > 0 && (
                    <>
                        <SectionDivider />
                        <Box sx={{ px: 2.5, pb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <IconBarbell size={16} color={colors.primaryBrown} />
                                <Typography sx={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    color: colors.primaryBrown,
                                }}>
                                    Exercises ({workout.exercises.length})
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {workout.exercises
                                    .slice()
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map((we) => (
                                        <ExerciseCard
                                            key={we.id}
                                            we={we}
                                            workout={workout}
                                            allWorkouts={allWorkouts}
                                        />
                                    ))}
                            </Box>
                        </Box>
                    </>
                )}

                {/* ── Delete confirmation ─────────────────────────── */}
                {confirmDelete && (
                    <>
                        <SectionDivider />
                        <Box sx={{ px: 2.5, py: 1 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>
                                Delete this workout?
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Box
                                    onClick={() => { onDelete(workout.id); onClose(); setConfirmDelete(false) }}
                                    sx={{
                                        'px': 2,
                                        'py': 0.75,
                                        'fontSize': 13,
                                        'fontWeight': 700,
                                        'backgroundColor': colors.primaryRed,
                                        'color': colors.primaryWhite,
                                        'border': `1px solid ${colors.primaryBlack}`,
                                        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                        'borderRadius': '4px',
                                        'cursor': 'pointer',
                                        '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                                    }}>
                                    Delete
                                </Box>
                                <Box
                                    onClick={() => setConfirmDelete(false)}
                                    sx={{
                                        'px': 2,
                                        'py': 0.75,
                                        'fontSize': 13,
                                        'fontWeight': 700,
                                        'backgroundColor': colors.primaryWhite,
                                        'border': `1px solid ${colors.primaryBlack}`,
                                        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                        'borderRadius': '4px',
                                        'cursor': 'pointer',
                                        '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                                    }}>
                                    Cancel
                                </Box>
                            </Box>
                        </Box>
                    </>
                )}
            </Box>
        </FormDrawer>
    )
}
