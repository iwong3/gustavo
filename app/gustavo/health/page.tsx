'use client'

import { cardSx, colors } from '@/lib/colors'
import type {
    DaysSince,
    DietDay,
    DietPreset,
    SupplementLog,
    SupplementPreset,
    Workout,
    WorkoutPreset,
} from '@/lib/health-types'
import { Box, Chip, Typography } from '@mui/material'
import {
    IconBarbell,
    IconBolt,
    IconFirstAidKit,
    IconPill,
    IconSalad,
    IconStretching,
} from '@tabler/icons-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatMonthDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const mealChipSx = {
    'height': 24,
    'fontSize': 12,
    'fontWeight': 500,
    'backgroundColor': '#e3f2fd',
    'border': `1px solid #4b6981`,
    'boxShadow': '1px 1px 0px #4b6981',
    'borderRadius': '3px',
    'color': '#090401',
    '& .MuiChip-label': { px: 0.75, display: 'flex', alignItems: 'center', gap: '6px' },
} as const

const foodChipSx = {
    'height': 24,
    'fontSize': 12,
    'fontWeight': 500,
    'backgroundColor': '#fbf6e8',
    'border': `1px solid #090401`,
    'boxShadow': '1px 1px 0px #090401',
    'borderRadius': '3px',
    'color': '#090401',
    '& .MuiChip-label': { px: 0.75, display: 'flex', alignItems: 'center', gap: '6px' },
} as const

const supplementChipSx = {
    'height': 24,
    'fontSize': 12,
    'fontWeight': 500,
    'backgroundColor': '#f1f8e9',
    'border': '1px solid #4caf50',
    'boxShadow': '1px 1px 0px #4caf50',
    'borderRadius': '3px',
    'color': '#090401',
    '& .MuiChip-label': { px: 1 },
} as const

function getLocalDate(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getDateDaysAgo(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDaysSinceColor(days: number | null): string {
    if (days === null) return '#9e9e9e'
    if (days <= 3) return '#4caf50'
    if (days <= 6) return '#ff9800'
    return '#f44336'
}

function getDaysSinceBg(days: number | null): string {
    if (days === null) return '#9e9e9e12'
    if (days <= 3) return '#4caf5012'
    if (days <= 6) return '#ff980012'
    return '#f4433612'
}

function getDaysSinceBorder(days: number | null): string {
    if (days === null) return '#9e9e9ecc'
    if (days <= 3) return '#4caf50cc'
    if (days <= 6) return '#ff9800cc'
    return '#f44336cc'
}

function formatDaysSince(days: number | null): string {
    if (days === null) return 'Never'
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
}

function computeWorkoutStats(workouts: Workout[], today: string) {
    // Unique workout dates
    const workoutDates = new Set(workouts.map((w) => w.date))

    // 30-day breakdown
    const workoutDays = workoutDates.size
    const restDays = 30 - workoutDays

    // Streak: walk backwards from today
    let streak = 0
    const d = new Date(today + 'T00:00:00')
    while (true) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (workoutDates.has(dateStr)) {
            streak++
            d.setDate(d.getDate() - 1)
        } else {
            break
        }
    }

    return { streak, workoutDays, restDays }
}

// ── Constants ────────────────────────────────────────────────────────────────

const tools = [
    { name: 'Workouts', path: '/gustavo/health/exercise', icon: IconBarbell, bg: '#ffe0b2' },
    { name: 'Exercises', path: '/gustavo/health/exercises', icon: IconStretching, bg: '#fff9c4' },
    { name: 'Diet', path: '/gustavo/health/diet', icon: IconSalad, bg: '#c8e6c9' },
    { name: 'Supplements', path: '/gustavo/health/supplements', icon: IconPill, bg: '#cdbfdb' },
    { name: 'Symptoms', path: '/gustavo/health/symptoms', icon: IconFirstAidKit, bg: '#ffcdd2' },
]

const daysSinceCardWidth = 'calc((100% - 12px) / 3)'

const DAYS_SINCE_ROWS: { label: string; groups: string[] }[] = [
    { label: 'Push', groups: ['Chest', 'Shoulders', 'Triceps'] },
    { label: 'Pull', groups: ['Upper Back', 'Biceps', 'Forearms'] },
    { label: 'Legs', groups: ['Legs', 'Lower Back'] },
    { label: 'Other', groups: ['Core', 'Cardio'] },
]

const sectionHeaderSx = {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    color: colors.primaryBrown,
    mb: 1,
}

const boltBoxSx = {
    'width': 28,
    'height': 28,
    'borderRadius': '6px',
    'border': `1.5px solid ${colors.primaryBlack}`,
    'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'flexShrink': 0,
    'cursor': 'pointer',
    '&:active': {
        boxShadow: 'none',
        transform: 'translate(2px, 2px)',
    },
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function HealthPage() {
    const today = useMemo(() => getLocalDate(), [])
    const thirtyDaysAgo = useMemo(() => getDateDaysAgo(30), [])

    // Data
    const [daysSince, setDaysSince] = useState<DaysSince[]>([])
    const [workoutPresets, setWorkoutPresets] = useState<WorkoutPreset[]>([])
    const [dietPresets, setDietPresets] = useState<DietPreset[]>([])
    const [supplementPresets, setSupplementPresets] = useState<SupplementPreset[]>([])
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
    const [recentDietDays, setRecentDietDays] = useState<DietDay[]>([])
    const [recentSupplements, setRecentSupplements] = useState<SupplementLog[]>([])
    const [loading, setLoading] = useState(true)

    // Preset apply state
    const [applyingId, setApplyingId] = useState<number | null>(null)
    const [appliedId, setAppliedId] = useState<number | null>(null)

    const fetchDaysSince = useCallback(() => {
        return fetch(`/api/health/workouts/days-since?today=${today}`)
            .then((r) => r.json())
            .then(setDaysSince)
    }, [today])

    const fetchRecentDiet = useCallback(() => {
        return fetch('/api/health/food-logs')
            .then((r) => r.json())
            .then(setRecentDietDays)
    }, [])

    const fetchRecentSupplements = useCallback(() => {
        return fetch('/api/health/supplement-logs')
            .then((r) => r.json())
            .then(setRecentSupplements)
    }, [])

    const fetchRecentWorkouts = useCallback(() => {
        return fetch(`/api/health/workouts?startDate=${thirtyDaysAgo}&endDate=${today}`)
            .then((r) => r.json())
            .then(setRecentWorkouts)
    }, [thirtyDaysAgo, today])

    useEffect(() => {
        Promise.all([
            fetchDaysSince(),
            fetchRecentWorkouts(),
            fetch('/api/health/presets?type=workout').then((r) => r.json()).then(setWorkoutPresets),
            fetch('/api/health/presets?type=diet').then((r) => r.json()).then(setDietPresets),
            fetch('/api/health/presets?type=supplement').then((r) => r.json()).then(setSupplementPresets),
            fetchRecentDiet(),
            fetchRecentSupplements(),
        ])
            .catch((err) => console.error('Failed to fetch health data:', err))
            .finally(() => setLoading(false))
    }, [fetchDaysSince, fetchRecentWorkouts, fetchRecentDiet, fetchRecentSupplements])

    // Apply preset
    const applyPreset = useCallback(async (presetId: number, type: 'workout' | 'diet' | 'supplement') => {
        if (applyingId) return
        setApplyingId(presetId)
        setAppliedId(null)
        try {
            const res = await fetch(`/api/health/presets/${presetId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: today }),
            })
            if (!res.ok) throw new Error('Apply failed')

            setAppliedId(presetId)
            setTimeout(() => setAppliedId(null), 1200)

            // Refresh relevant data
            if (type === 'workout') {
                await Promise.all([fetchDaysSince(), fetchRecentWorkouts()])
            } else if (type === 'diet') {
                await fetchRecentDiet()
            } else {
                await fetchRecentSupplements()
            }
        } catch (err) {
            console.error('Failed to apply preset:', err)
        } finally {
            setApplyingId(null)
        }
    }, [applyingId, today, fetchDaysSince, fetchRecentWorkouts, fetchRecentDiet, fetchRecentSupplements])

    const daysSinceMap = useMemo(() => {
        const map = new Map<string, DaysSince>()
        for (const item of daysSince) map.set(item.muscleGroup, item)
        return map
    }, [daysSince])

    const workoutStats = useMemo(
        () => computeWorkoutStats(recentWorkouts, today),
        [recentWorkouts, today],
    )

    // Recent diet days (max 3)
    const recentDiet = useMemo(() => recentDietDays.slice(0, 3), [recentDietDays])

    // Group supplement logs by date (max 3 days)
    const recentSupplementDays = useMemo(() => {
        const groups: { date: string; logs: SupplementLog[] }[] = []
        for (const log of recentSupplements) {
            const last = groups[groups.length - 1]
            if (last && last.date === log.date) {
                last.logs.push(log)
            } else {
                groups.push({ date: log.date, logs: [log] })
            }
        }
        return groups.slice(0, 3)
    }, [recentSupplements])

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 600,
                paddingX: 2,
                paddingBottom: 2,
                gap: 2.5,
            }}>

            {/* ── Workouts Section ─────────────────────────────────── */}
            <Box>
                <Typography
                    component={Link}
                    href="/gustavo/health/exercise"
                    sx={{ ...sectionHeaderSx, textDecoration: 'none', color: colors.primaryBrown, display: 'block' }}>
                    Workouts
                </Typography>

                {/* Workout presets */}
                {workoutPresets.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', overflowX: 'auto', pb: 1.5, mb: 0.5, WebkitOverflowScrolling: 'touch' }}>
                        <Box sx={{ ...boltBoxSx, backgroundColor: '#ffe0b2' }}>
                            <IconBolt size={14} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
                        </Box>
                        {workoutPresets.map((preset) => (
                            <Box
                                key={preset.id}
                                onClick={() => applyPreset(preset.id, 'workout')}
                                sx={{
                                    'px': 1.25,
                                    'py': 0.5,
                                    'backgroundColor': applyingId === preset.id
                                        ? colors.primaryYellow
                                        : appliedId === preset.id
                                            ? '#c8e6c9'
                                            : colors.primaryWhite,
                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    'borderRadius': '4px',
                                    'cursor': applyingId ? 'default' : 'pointer',
                                    'opacity': applyingId && applyingId !== preset.id ? 0.5 : 1,
                                    'transition': 'all 0.15s',
                                    'whiteSpace': 'nowrap',
                                    'flexShrink': 0,
                                    '&:active': applyingId ? {} : {
                                        boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                        transform: 'translate(1px, 1px)',
                                    },
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                    {preset.name}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Days since grid */}
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {DAYS_SINCE_ROWS.map((row) => (
                            <Box key={row.label}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75 }}>
                                    {row.groups.map((g) => (
                                        <Box
                                            key={g}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                width: daysSinceCardWidth,
                                                padding: '6px 8px',
                                                borderRadius: '4px',
                                                border: `1.5px solid ${colors.primaryBlack}20`,
                                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}20`,
                                                backgroundColor: `${colors.primaryBlack}05`,
                                            }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: `${colors.primaryBlack}15`, flexShrink: 0 }} />
                                            <Box>
                                                <Typography sx={{ fontSize: 12, lineHeight: 1.2, color: 'transparent' }}>&nbsp;</Typography>
                                                <Typography sx={{ fontSize: 11, lineHeight: 1.2, color: 'transparent' }}>&nbsp;</Typography>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                ) : daysSince.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>
                        No workouts logged yet. Start tracking!
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {DAYS_SINCE_ROWS.map((row) => (
                            <Box key={row.label}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75 }}>
                                    {row.groups.map((groupName) => {
                                        const item = daysSinceMap.get(groupName)
                                        return (
                                            <Box
                                                key={groupName}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.75,
                                                    width: daysSinceCardWidth,
                                                    padding: '6px 8px',
                                                    borderRadius: '4px',
                                                    border: `1.5px solid ${getDaysSinceBorder(item?.daysSince ?? null)}`,
                                                    boxShadow: `1.5px 1.5px 0px ${getDaysSinceBorder(item?.daysSince ?? null)}`,
                                                    backgroundColor: getDaysSinceBg(item?.daysSince ?? null),
                                                    transition: 'background-color 0.3s, border-color 0.3s, box-shadow 0.3s',
                                                }}>
                                                <Box
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        backgroundColor: getDaysSinceColor(item?.daysSince ?? null),
                                                        border: `1px solid ${colors.primaryBlack}`,
                                                        flexShrink: 0,
                                                        transition: 'background-color 0.3s',
                                                    }}
                                                />
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {groupName}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 11, color: colors.primaryBrown, lineHeight: 1.2 }}>
                                                        {formatDaysSince(item?.daysSince ?? null)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Workout stats */}
                {!loading && daysSince.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'flex-end' }}>
                        {workoutStats.streak > 0 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.primaryBrown, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, textAlign: 'center' }}>
                                    Streak
                                </Typography>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: `1.5px solid ${colors.primaryBlack}`,
                                    boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    backgroundColor: '#fff3e0',
                                }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
                                        {workoutStats.streak}
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown, lineHeight: 1 }}>
                                        day{workoutStats.streak !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                        {/* 30-day split card */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors.primaryBrown, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, textAlign: 'center' }}>
                                Last 30 days
                            </Typography>
                            <Box sx={{
                                display: 'flex',
                                borderRadius: '6px',
                                border: `1.5px solid ${colors.primaryBlack}`,
                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                overflow: 'hidden',
                            }}>
                                <Box sx={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    padding: '6px 10px',
                                    backgroundColor: '#e8f5e9',
                                }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
                                        {workoutStats.workoutDays}
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown, lineHeight: 1 }}>
                                        workout{workoutStats.workoutDays !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                                <Box sx={{ width: '1.5px', backgroundColor: colors.primaryBlack }} />
                                <Box sx={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    padding: '6px 10px',
                                    backgroundColor: '#f5f5f5',
                                }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>
                                        {workoutStats.restDays}
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown, lineHeight: 1 }}>
                                        rest
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* ── Diet Section ─────────────────────────────────────── */}
            <Box>
                <Typography
                    component={Link}
                    href="/gustavo/health/diet"
                    sx={{ ...sectionHeaderSx, textDecoration: 'none', color: colors.primaryBrown, display: 'block' }}>
                    Diet
                </Typography>

                {/* Diet presets */}
                {dietPresets.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', overflowX: 'auto', pb: 1.5, mb: 0.5, WebkitOverflowScrolling: 'touch' }}>
                        <Box sx={{ ...boltBoxSx, backgroundColor: '#c8e6c9' }}>
                            <IconBolt size={14} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
                        </Box>
                        {dietPresets.map((preset) => (
                            <Box
                                key={preset.id}
                                onClick={() => applyPreset(preset.id, 'diet')}
                                sx={{
                                    'px': 1.25,
                                    'py': 0.5,
                                    'backgroundColor': applyingId === preset.id
                                        ? colors.primaryYellow
                                        : appliedId === preset.id
                                            ? '#c8e6c9'
                                            : colors.primaryWhite,
                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    'borderRadius': '4px',
                                    'cursor': applyingId ? 'default' : 'pointer',
                                    'opacity': applyingId && applyingId !== preset.id ? 0.5 : 1,
                                    'transition': 'all 0.15s',
                                    'whiteSpace': 'nowrap',
                                    'flexShrink': 0,
                                    '&:active': applyingId ? {} : {
                                        boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                        transform: 'translate(1px, 1px)',
                                    },
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                    {preset.name}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Recent food logs */}
                {loading ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>Loading...</Typography>
                ) : recentDiet.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown, opacity: 0.6 }}>
                        No food logged yet
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {recentDiet.map((day) => (
                            <Box key={day.date}>
                                {/* Date label */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                    <Box sx={{
                                        px: 0.75, py: 0.25,
                                        backgroundColor: colors.primaryYellow,
                                        border: `1px solid ${colors.primaryBlack}`,
                                        boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                        borderRadius: '3px',
                                    }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.2 }}>
                                            {formatWeekday(day.date)}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryBrown }}>
                                        {formatMonthDay(day.date)}
                                    </Typography>
                                </Box>
                                {/* Chips card */}
                                <Box sx={{
                                    ...cardSx,
                                    p: 1.25,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 0.5,
                                }}>
                                    {day.mealGroups.map((group) => (
                                        <Chip
                                            key={`meal-${group.id}`}
                                            label={`${group.quantity > 1 ? `${group.quantity}× ` : ''}${group.label}`}
                                            size="small"
                                            sx={mealChipSx}
                                        />
                                    ))}
                                    {day.standaloneFoods.map((entry) => (
                                        <Chip
                                            key={`food-${entry.id}`}
                                            label={`${entry.quantity > 1 ? `${entry.quantity}× ` : ''}${entry.food.name}`}
                                            size="small"
                                            sx={foodChipSx}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* ── Supplements Section ──────────────────────────────── */}
            <Box>
                <Typography
                    component={Link}
                    href="/gustavo/health/supplements"
                    sx={{ ...sectionHeaderSx, textDecoration: 'none', color: colors.primaryBrown, display: 'block' }}>
                    Supplements
                </Typography>

                {/* Supplement presets */}
                {supplementPresets.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', overflowX: 'auto', pb: 1.5, mb: 0.5, WebkitOverflowScrolling: 'touch' }}>
                        <Box sx={{ ...boltBoxSx, backgroundColor: '#cdbfdb' }}>
                            <IconBolt size={14} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
                        </Box>
                        {supplementPresets.map((preset) => (
                            <Box
                                key={preset.id}
                                onClick={() => applyPreset(preset.id, 'supplement')}
                                sx={{
                                    'px': 1.25,
                                    'py': 0.5,
                                    'backgroundColor': applyingId === preset.id
                                        ? colors.primaryYellow
                                        : appliedId === preset.id
                                            ? '#c8e6c9'
                                            : colors.primaryWhite,
                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    'borderRadius': '4px',
                                    'cursor': applyingId ? 'default' : 'pointer',
                                    'opacity': applyingId && applyingId !== preset.id ? 0.5 : 1,
                                    'transition': 'all 0.15s',
                                    'whiteSpace': 'nowrap',
                                    'flexShrink': 0,
                                    '&:active': applyingId ? {} : {
                                        boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                        transform: 'translate(1px, 1px)',
                                    },
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                    {preset.name}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Recent supplement logs */}
                {loading ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>Loading...</Typography>
                ) : recentSupplementDays.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown, opacity: 0.6 }}>
                        No supplements logged yet
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {recentSupplementDays.map((group) => (
                            <Box key={group.date}>
                                {/* Date label */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                    <Box sx={{
                                        px: 0.75, py: 0.25,
                                        backgroundColor: colors.primaryYellow,
                                        border: `1px solid ${colors.primaryBlack}`,
                                        boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                        borderRadius: '3px',
                                    }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.2 }}>
                                            {formatWeekday(group.date)}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryBrown }}>
                                        {formatMonthDay(group.date)}
                                    </Typography>
                                </Box>
                                {/* Chips card */}
                                <Box sx={{
                                    ...cardSx,
                                    p: 1.25,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 0.5,
                                }}>
                                    {group.logs.map((log) => (
                                        <Chip
                                            key={log.id}
                                            label={log.quantity > 1 ? `${log.supplementName} ×${log.quantity}` : log.supplementName}
                                            size="small"
                                            sx={supplementChipSx}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* ── Tools ────────────────────────────────────────────── */}
            <Box>
                <Typography sx={sectionHeaderSx}>Tools</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {tools.map((tool) => {
                        const Icon = tool.icon
                        return (
                            <Box
                                key={tool.name}
                                component={Link}
                                href={tool.path}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': 2,
                                    'padding': 2,
                                    ...cardSx,
                                    'textDecoration': 'none',
                                    'color': colors.primaryBlack,
                                    '&:active': {
                                        boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                        transform: 'translate(1px, 1px)',
                                    },
                                    'transition': 'box-shadow 0.1s, transform 0.1s',
                                }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        backgroundColor: tool.bg,
                                        border: `1.5px solid ${colors.primaryBlack}`,
                                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                        flexShrink: 0,
                                    }}>
                                    <Icon size={22} stroke={1.8} color={colors.primaryBlack} fill={colors.primaryWhite} />
                                </Box>
                                <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                                    {tool.name}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>
            </Box>
        </Box>
    )
}
