'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'

import type { SupplementLog } from '@/lib/health-types'
import { addDose, removeDose } from '@/lib/health/supplement-stack'
import { queryKeys } from '@/lib/query-keys'
import { showToast } from 'components/toast-store'

type DoseVars = { supplementId: number; name: string; date: string; delta: 1 | -1 }

/** What a tap needs to know about the thing tapped. */
export type DoseTarget = {
    supplementId: number
    name: string
    /** Doses logged that day so far. */
    taken: number
    /** How many make it "done" — tapping a done one takes a dose back. */
    dosesPerDay: number
}

/**
 * One tap = one dose on `date`, the same everywhere (Home card, Supplements
 * page tiles + day panel): tap to take a dose (with an Undo toast), tap a
 * finished one to take the last dose back. Atomic ±1 on the server
 * (/supplement-logs/dose), applied optimistically to both caches that hold
 * that day — the day's list (Home) and the full history (Supplements page).
 */
export function useDoseTaps(date: string) {
    const queryClient = useQueryClient()
    // Refetch only once every tap has landed — a refetch between two quick
    // taps would briefly roll the second one back
    const inFlight = useRef(0)

    const dose = useMutation({
        mutationFn: async ({ supplementId, date: day, delta }: DoseVars) => {
            const res = await fetch('/api/health/supplement-logs/dose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplementId, date: day, delta }),
            })
            if (!res.ok) throw new Error('Dose failed')
        },
        onMutate: async ({ supplementId, name, date: day, delta }: DoseVars) => {
            inFlight.current++
            const keys = [
                queryKeys.health.supplementLogs.all,
                queryKeys.health.supplementLogs.byDate(day),
            ]
            await Promise.all(keys.map((k) => queryClient.cancelQueries({ queryKey: k, exact: true })))
            const prev = keys.map((k) => [k, queryClient.getQueryData<SupplementLog[]>(k)] as const)
            for (const [k, logs] of prev) {
                if (!logs) continue
                queryClient.setQueryData<SupplementLog[]>(
                    k,
                    delta === 1
                        ? addDose(logs, { id: supplementId, name }, day, -Date.now())
                        : removeDose(logs, supplementId, day)
                )
            }
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            for (const [k, logs] of ctx?.prev ?? []) queryClient.setQueryData(k, logs)
        },
        onSettled: () => {
            inFlight.current--
            if (inFlight.current === 0) {
                // The prefix covers every day's list and the full history
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementLogs.all })
            }
        },
        meta: { errorToast: "Couldn't log that dose. Try again." },
    })
    const { mutate } = dose

    const onTap = useCallback(
        (t: DoseTarget) => {
            const vars = { supplementId: t.supplementId, name: t.name, date }
            if (t.taken >= t.dosesPerDay) {
                // Tapping a finished one takes the last dose back
                mutate({ ...vars, delta: -1 })
                return
            }
            mutate({ ...vars, delta: 1 })
            const taken = t.taken + 1
            showToast(
                t.dosesPerDay > 1 ? `${t.name} ${taken}/${t.dosesPerDay}` : `Took ${t.name}`,
                'success',
                { label: 'Undo', onClick: () => mutate({ ...vars, delta: -1 }) }
            )
        },
        [mutate, date]
    )

    /** Take one dose back (swipe → Undo). */
    const onUndo = useCallback(
        (t: DoseTarget) => mutate({ supplementId: t.supplementId, name: t.name, date, delta: -1 }),
        [mutate, date]
    )

    return { onTap, onUndo }
}
