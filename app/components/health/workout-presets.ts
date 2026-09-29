'use client'

import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { WorkoutPreset } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { arrayMove } from 'components/health/sortable-preset'
import { showToast } from 'components/toast-store'

type ApplyResult = {
    workoutId: number
    created: boolean
    addedMuscleGroupIds: number[]
    addedWorkoutExerciseIds: number[]
}

/**
 * One tap logs a routine on `date`, with an Undo toast. One workout per day
 * (00044): if the day already has a workout the routine is added to it, and
 * Undo removes only what that tap added (a new workout is deleted instead).
 * Shared by Home's workout card and the Workouts page's rotation tiles.
 */
export function useApplyWorkoutRoutine(date: string) {
    const queryClient = useQueryClient()
    const [appliedId, setAppliedId] = useState<number | null>(null)
    const invalidate = useCallback(
        () => queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all }),
        [queryClient],
    )

    const undo = useCallback(
        async (preset: WorkoutPreset, r: ApplyResult) => {
            setAppliedId((id) => (id === preset.id ? null : id))
            const res = await (r.created
                ? fetch(`/api/health/workouts/${r.workoutId}`, { method: 'DELETE' })
                : fetch(`/api/health/workouts/${r.workoutId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          removeMuscleGroupIds: r.addedMuscleGroupIds,
                          removeWorkoutExerciseIds: r.addedWorkoutExerciseIds,
                      }),
                  })
            ).catch(() => null)
            if (!res?.ok) showToast("Couldn't undo that. Fix it from Workouts.")
            invalidate()
        },
        [invalidate],
    )

    const mutation = useMutation({
        mutationFn: async (preset: WorkoutPreset) => {
            const res = await fetch(`/api/health/presets/${preset.id}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date }),
            })
            if (!res.ok) throw new Error('Apply failed')
            const data = (await res.json()) as ApplyResult
            return { preset, result: { ...data, workoutId: Number(data.workoutId) } }
        },
        onSuccess: ({ preset, result }) => {
            setAppliedId(preset.id)
            invalidate()
            const added = result.addedMuscleGroupIds.length + result.addedWorkoutExerciseIds.length
            if (!result.created && added === 0) {
                showToast(`${preset.name} is already logged`, 'info')
                return
            }
            showToast(`Logged ${preset.name}`, 'success', {
                label: 'Undo',
                onClick: () => undo(preset, result),
            })
        },
        meta: { errorToast: "Couldn't log that routine. Try again." },
    })

    return {
        apply: mutation.mutate,
        applyingId: mutation.isPending ? (mutation.variables?.id ?? null) : null,
        appliedId,
    }
}

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
