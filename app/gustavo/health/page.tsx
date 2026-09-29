'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { buildSupplementHistory } from '@/lib/health/supplement-calendar'
import { queryKeys } from '@/lib/query-keys'
import { HealthPageLayout } from 'components/health/health-page-layout'
import { HealthHub } from 'components/health/hub/health-hub'
import { useHubWindowStore } from 'components/health/hub/hub-window-store'
import { useSupplementData } from 'hooks/useSupplementData'
import { useLogDay, useToday } from 'hooks/use-today'
import { useWeightLogs } from 'hooks/useWeightLogs'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { logDateString } from 'utils/time'

const recordedOn = (iso: string) => logDateString(new Date(iso))

/**
 * The Health hub — see components/health/hub/health-hub.tsx. Reads the same
 * caches as the Workouts, Weight and Supplements pages, so opening one from
 * here is instant (and vice versa). Until the full workout history loads,
 * Home's last-30-days list stands in — enough for 30D.
 */
export default function HealthPage() {
    // Kept current: the hub can sit open overnight in the PWA
    const today = useToday()
    const logDay = useLogDay()
    const queryClient = useQueryClient()
    const window = useHubWindowStore((s) => s.window)
    const setWindow = useHubWindowStore((s) => s.setWindow)

    const { workouts, pending, workoutsPartial } = useWorkoutData()
    const { logs: weightLogs, loading: weightPending } = useWeightLogs()
    const { supplements, logs: supplementLogs, events, historyPending } = useSupplementData()

    const workoutDates = useMemo(
        () => (pending.workouts || (workoutsPartial && window !== '30d') ? null : workouts.map((w) => w.date)),
        [workouts, pending.workouts, workoutsPartial, window]
    )
    const supplementRuns = useMemo(
        () =>
            historyPending
                ? null
                : buildSupplementHistory({ supplements, events, logs: supplementLogs, today: logDay, recordedOn }).runsBySupplement,
        [historyPending, supplements, events, supplementLogs, logDay]
    )

    const refresh = useCallback(
        () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all }),
                queryClient.invalidateQueries({ queryKey: queryKeys.health.weightLogs }),
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplements }),
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementLogs.all }),
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementEvents }),
            ]),
        [queryClient]
    )

    return (
        <HealthPageLayout loading={false} onRefresh={refresh}>
            <HealthHub
                window={window}
                onWindowChange={setWindow}
                today={today}
                logDay={logDay}
                workoutDates={workoutDates}
                weightLogs={weightPending ? null : weightLogs}
                supplementRuns={supplementRuns}
            />
        </HealthPageLayout>
    )
}
