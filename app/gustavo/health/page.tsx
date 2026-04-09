'use client'

import type {
    DaysSince,
    DietDay,
    DietPreset,
    SupplementLog,
    SupplementPreset,
    SymptomLog,
    WeightLog,
    Workout,
    WorkoutPreset,
} from '@/lib/health-types'
import { HealthDashboardV2 } from 'components/health/health-dashboard-v2'
import { arrayMove } from 'components/health/sortable-preset'
import { useCallback, useEffect, useMemo, useState } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLocalDate(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getDateDaysAgo(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeWorkoutStats(workouts: Workout[], today: string) {
    const workoutDates = new Set(workouts.map((w) => w.date))
    const workoutDays = workoutDates.size
    const restDays = 30 - workoutDays

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

// ── Page Component ───────────────────────────────────────────────────────────

export default function HealthPage() {
    const today = useMemo(() => getLocalDate(), [])
    const thirtyDaysAgo = useMemo(() => getDateDaysAgo(30), [])

    const [daysSince, setDaysSince] = useState<DaysSince[]>([])
    const [workoutPresets, setWorkoutPresets] = useState<WorkoutPreset[]>([])
    const [dietPresets, setDietPresets] = useState<DietPreset[]>([])
    const [supplementPresets, setSupplementPresets] = useState<SupplementPreset[]>([])
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
    const [recentDietDays, setRecentDietDays] = useState<DietDay[]>([])
    const [recentSupplements, setRecentSupplements] = useState<SupplementLog[]>([])
    const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([])
    const [recentWeightLogs, setRecentWeightLogs] = useState<WeightLog[]>([])
    const [loading, setLoading] = useState(true)

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

    const fetchRecentSymptoms = useCallback(() => {
        return fetch('/api/health/symptom-logs')
            .then((r) => r.json())
            .then(setRecentSymptoms)
    }, [])

    const fetchRecentWeight = useCallback(() => {
        return fetch('/api/health/weight-logs')
            .then((r) => r.json())
            .then(setRecentWeightLogs)
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
            fetchRecentSymptoms(),
            fetchRecentWeight(),
        ])
            .catch((err) => console.error('Failed to fetch health data:', err))
            .finally(() => setLoading(false))
    }, [fetchDaysSince, fetchRecentWorkouts, fetchRecentDiet, fetchRecentSupplements, fetchRecentSymptoms, fetchRecentWeight])

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

    const reorderPresetsHandler = useCallback((type: 'workout' | 'diet' | 'supplement', from: number, to: number) => {
        const doReorder = <T extends { id: number }>(prev: T[]): T[] => {
            const next = arrayMove(prev, from, to)
            fetch('/api/health/presets/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presetIds: next.map((p) => p.id) }),
            }).catch((err) => console.error('Failed to save preset order:', err))
            return next
        }
        if (type === 'workout') setWorkoutPresets(doReorder)
        else if (type === 'diet') setDietPresets(doReorder)
        else setSupplementPresets(doReorder)
    }, [])

    const daysSinceMap = useMemo(() => {
        const map = new Map<string, DaysSince>()
        for (const item of daysSince) map.set(item.muscleGroup, item)
        return map
    }, [daysSince])

    const workoutStats = useMemo(
        () => computeWorkoutStats(recentWorkouts, today),
        [recentWorkouts, today],
    )

    const topExercises = useMemo(() => {
        const counts = new Map<string, number>()
        for (const w of recentWorkouts) {
            for (const ex of w.exercises) {
                counts.set(ex.exercise.name, (counts.get(ex.exercise.name) ?? 0) + 1)
            }
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }))
    }, [recentWorkouts])

    const recentSymptomDays = useMemo(() => {
        const groups: { date: string; logs: SymptomLog[] }[] = []
        for (const log of recentSymptoms) {
            const last = groups[groups.length - 1]
            if (last && last.date === log.date) {
                last.logs.push(log)
            } else {
                groups.push({ date: log.date, logs: [log] })
            }
        }
        return groups.slice(0, 3)
    }, [recentSymptoms])

    const recentDiet = useMemo(() => recentDietDays.slice(0, 3), [recentDietDays])

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
        <HealthDashboardV2
            loading={loading}
            daysSince={daysSince}
            daysSinceMap={daysSinceMap}
            workoutPresets={workoutPresets}
            dietPresets={dietPresets}
            supplementPresets={supplementPresets}
            recentDiet={recentDiet}
            recentSupplementDays={recentSupplementDays}
            workoutStats={workoutStats}
            applyingId={applyingId}
            appliedId={appliedId}
            topExercises={topExercises}
            recentSymptomDays={recentSymptomDays}
            applyPreset={applyPreset}
            recentWeightLogs={recentWeightLogs}
            reorderPresets={reorderPresetsHandler}
        />
    )
}
