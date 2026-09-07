'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import type { WorkoutPreset } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { arrayMove } from 'components/health/sortable-preset'

/** Local date as ISO YYYY-MM-DD (not UTC — avoids the midnight shift). */
export const todayIso = () => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/**
 * Drag-reorder for workout routines: updates the cached list optimistically,
 * then persists the new order. Shared by the workouts page, the routines
 * page, and the workout form's routine chips.
 */
export function useReorderWorkoutPresets() {
    const queryClient = useQueryClient()
    return useCallback(
        (from: number, to: number) => {
            const key = queryKeys.health.presets.byType('workout')
            const current = queryClient.getQueryData<WorkoutPreset[]>(key) ?? []
            const next = arrayMove(current, from, to)
            queryClient.setQueryData(key, next)
            fetch('/api/health/presets/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presetIds: next.map((p) => p.id) }),
            }).catch((err) =>
                console.error('Failed to save preset order:', err)
            )
        },
        [queryClient]
    )
}
