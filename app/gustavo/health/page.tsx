'use client'

import type {
    DietPreset,
    SupplementLog,
    SupplementPreset,
    SymptomLog,
    Workout,
    WorkoutPreset,
} from '@/lib/health-types'
import { HealthDashboardV2 } from 'components/health/health-dashboard-v2'
import { PullToRefresh } from 'components/pull-to-refresh'
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'

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

const fetchJson = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)
    return res.json()
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function HealthPage() {
    const today = useMemo(() => getLocalDate(), [])
    const thirtyDaysAgo = useMemo(() => getDateDaysAgo(30), [])
    const queryClient = useQueryClient()

    const queries = useQueries({
        queries: [
            {
                queryKey: queryKeys.health.workouts.daysSince,
                queryFn: () => fetchJson<import('@/lib/health-types').DaysSince[]>(`/api/health/workouts/days-since?today=${today}`),
            },
            {
                queryKey: [...queryKeys.health.workouts.list(), { startDate: thirtyDaysAgo, endDate: today }],
                queryFn: () => fetchJson<Workout[]>(`/api/health/workouts?startDate=${thirtyDaysAgo}&endDate=${today}`),
            },
            {
                queryKey: queryKeys.health.presets.byType('workout'),
                queryFn: () => fetchJson<WorkoutPreset[]>('/api/health/presets?type=workout'),
            },
            {
                queryKey: queryKeys.health.presets.byType('diet'),
                queryFn: () => fetchJson<DietPreset[]>('/api/health/presets?type=diet'),
            },
            {
                queryKey: queryKeys.health.presets.byType('supplement'),
                queryFn: () => fetchJson<SupplementPreset[]>('/api/health/presets?type=supplement'),
            },
            {
                queryKey: queryKeys.health.foodLogs.all,
                queryFn: () => fetchJson<import('@/lib/health-types').DietDay[]>('/api/health/food-logs'),
            },
            {
                queryKey: queryKeys.health.supplementLogs.all,
                queryFn: () => fetchJson<SupplementLog[]>('/api/health/supplement-logs'),
            },
            {
                queryKey: queryKeys.health.symptomLogs.all,
                queryFn: () => fetchJson<SymptomLog[]>('/api/health/symptom-logs'),
            },
            {
                queryKey: queryKeys.health.weightLogs,
                queryFn: () => fetchJson<import('@/lib/health-types').WeightLog[]>('/api/health/weight-logs'),
            },
        ],
    })

    const [
        daysSinceQ,
        recentWorkoutsQ,
        workoutPresetsQ,
        dietPresetsQ,
        supplementPresetsQ,
        recentDietDaysQ,
        recentSupplementsQ,
        recentSymptomsQ,
        recentWeightLogsQ,
    ] = queries

    const daysSince = daysSinceQ.data ?? []
    const recentWorkouts = recentWorkoutsQ.data ?? []
    const workoutPresets = workoutPresetsQ.data ?? []
    const dietPresets = dietPresetsQ.data ?? []
    const supplementPresets = supplementPresetsQ.data ?? []
    const recentDietDays = recentDietDaysQ.data ?? []
    const recentSupplements = recentSupplementsQ.data ?? []
    const recentSymptoms = recentSymptomsQ.data ?? []
    const recentWeightLogs = recentWeightLogsQ.data ?? []

    const loading = queries.some((q) => q.isLoading)

    const [appliedId, setAppliedId] = useState<number | null>(null)

    const applyPresetMutation = useMutation({
        mutationFn: async ({ presetId }: { presetId: number; type: 'workout' | 'diet' | 'supplement' }) => {
            const res = await fetch(`/api/health/presets/${presetId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: today }),
            })
            if (!res.ok) throw new Error('Apply failed')
            return presetId
        },
        onSuccess: (presetId, { type }) => {
            setAppliedId(presetId)
            setTimeout(() => setAppliedId(null), 1200)
            if (type === 'workout') {
                queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all })
            } else if (type === 'diet') {
                queryClient.invalidateQueries({ queryKey: queryKeys.health.foodLogs.all })
            } else {
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementLogs.all })
            }
        },
        onError: (err) => console.error('Failed to apply preset:', err),
    })

    const applyPreset = useCallback(
        async (presetId: number, type: 'workout' | 'diet' | 'supplement') => {
            if (applyPresetMutation.isPending) return
            applyPresetMutation.mutate({ presetId, type })
        },
        [applyPresetMutation],
    )

    const applyingId = applyPresetMutation.isPending
        ? (applyPresetMutation.variables?.presetId ?? null)
        : null

    const daysSinceMap = useMemo(() => {
        const map = new Map<string, import('@/lib/health-types').DaysSince>()
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

    const refreshDashboard = () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all }),
            queryClient.invalidateQueries({ queryKey: queryKeys.health.foodLogs.all }),
            queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementLogs.all }),
            queryClient.invalidateQueries({ queryKey: queryKeys.health.symptomLogs.all }),
            queryClient.invalidateQueries({ queryKey: queryKeys.health.weightLogs }),
            queryClient.invalidateQueries({ queryKey: queryKeys.health.presets.all }),
        ])

    return (
        <PullToRefresh onRefresh={refreshDashboard}>
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
        />
        </PullToRefresh>
    )
}
