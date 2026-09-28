'use client'

import { Typography } from '@mui/material'
import { IconList } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { colors, healthColors } from '@/lib/colors'
import type { Supplement } from '@/lib/health-types'
import { buildSupplementHistory } from '@/lib/health/supplement-calendar'
import { queryKeys } from '@/lib/query-keys'
import { HealthPageHeader, HealthPageLayout } from 'components/health/health-page-layout'
import { YourStack, type StackRow } from 'components/health/supplements/your-stack'
import { showToast } from 'components/toast-store'
import { useLogDay } from 'hooks/use-today'
import { allSupplementsKey, useSupplementData } from 'hooks/useSupplementData'
import { useRegisterFab } from 'providers/fab-provider'
import { localDateString, logDateString } from 'utils/time'

const LIST_URL = '/gustavo/health/supplements/manage'
const NEW_URL = `${LIST_URL}/new`

const daysBefore = (iso: string, n: number) => {
    const d = new Date(iso + 'T00:00:00')
    d.setDate(d.getDate() - n)
    return localDateString(d)
}

/**
 * Your Stack: every supplement, in two boards — the daily stack (Day X, since
 * when) and "Off the stack" (0×: as needed or stopped, last taken). Tap a row
 * to edit it, swipe to delete, tap its 1× / 0× tag to change the daily count
 * in place (0 takes it off the stack, with Undo). The FAB adds one.
 */
export default function ManageSupplementsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { supplements, logs, events, historyPending } = useSupplementData()
    const today = useLogDay()

    useEffect(() => {
        router.prefetch(NEW_URL)
    }, [router])

    const openNew = useCallback(() => router.push(NEW_URL), [router])
    useRegisterFab(openNew)

    const invalidate = useCallback(
        () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplements }),
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementEvents }),
            ]),
        [queryClient]
    )

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/health/supplements/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
        },
        onSuccess: invalidate,
        meta: { errorToast: "Couldn't delete that supplement. Try again." },
    })

    // The daily count, changed in place: optimistic, then the server records
    // the stack change (start / stop / dose change) for the calendar
    const setDoses = useMutation({
        mutationFn: async ({ id, dailyDoses }: { id: number; dailyDoses: number | null }) => {
            const res = await fetch(`/api/health/supplements/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dailyDoses, isActive: true, eventDate: logDateString() }),
            })
            if (!res.ok) throw new Error('Update failed')
        },
        onMutate: async ({ id, dailyDoses }) => {
            await queryClient.cancelQueries({ queryKey: allSupplementsKey })
            const prev = queryClient.getQueryData<Supplement[]>(allSupplementsKey)
            queryClient.setQueryData<Supplement[]>(allSupplementsKey, (list = []) =>
                list.map((s) => (Number(s.id) === id ? { ...s, dailyDoses, isActive: true } : s))
            )
            return { prev }
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(allSupplementsKey, ctx.prev)
        },
        onSettled: invalidate,
        meta: { errorToast: "Couldn't change that supplement. Try again." },
    })
    const { mutate: mutateDoses } = setDoses

    const onSetDoses = useCallback(
        (row: StackRow, dailyDoses: number | null) => {
            mutateDoses({ id: row.supplementId, dailyDoses })
            if ((dailyDoses === null) !== (row.dailyDoses === null)) {
                showToast(
                    dailyDoses === null ? `Took ${row.name} off the stack` : `Added ${row.name} to the stack`,
                    'success',
                    { label: 'Undo', onClick: () => mutateDoses({ id: row.supplementId, dailyDoses: row.dailyDoses }) }
                )
            }
        },
        [mutateDoses]
    )

    const rows: StackRow[] = useMemo(() => {
        const history = buildSupplementHistory({
            supplements,
            events,
            logs,
            today,
            recordedOn: (iso) => logDateString(new Date(iso)),
        })
        const lastTaken = new Map<number, string>()
        for (const l of logs) {
            const id = Number(l.supplementId)
            if ((Number(l.quantity) || 0) > 0 && l.date > (lastTaken.get(id) ?? '')) lastTaken.set(id, l.date)
        }
        return supplements
            .map((s) => {
                const id = Number(s.id)
                // Legacy inactive ones (the old Active toggle) count as off the stack
                const dailyDoses = s.isActive ? s.dailyDoses : null
                const day = dailyDoses !== null ? history.dayOfRun(id, today) : null
                return {
                    supplementId: id,
                    name: s.name,
                    dosage: s.dosage,
                    dailyDoses,
                    dayOfRun: day,
                    since: day !== null ? daysBefore(today, day - 1) : null,
                    lastTaken: lastTaken.get(id) ?? null,
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [supplements, events, logs, today])

    return (
        <HealthPageLayout loading={historyPending} onRefresh={invalidate}>
            <HealthPageHeader
                icon={<IconList size={20} stroke={2.2} color={colors.primaryBlack} />}
                title="Your Stack"
                color={healthColors.supplements}
            />

            {rows.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                    No supplements yet. Tap + to add one.
                </Typography>
            ) : (
                <YourStack
                    rows={rows}
                    today={today}
                    onOpen={(id) => router.push(`${LIST_URL}/${id}/edit`)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onSetDoses={onSetDoses}
                />
            )}
        </HealthPageLayout>
    )
}
