'use client'

import { Box, Button, Typography } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { colors, supplementColors } from '@/lib/colors'
import { primaryButtonSx } from '@/lib/form-styles'
import type { Supplement, SupplementEvent, SupplementLog } from '@/lib/health-types'
import { buildSupplementHistory } from '@/lib/health/supplement-calendar'
import { queryKeys } from '@/lib/query-keys'
import { FormDateField } from 'components/form-date-field'
import { FormPage } from 'components/form-page'
import { AsNeededTiles, type AsNeededTile } from 'components/health/supplements/as-needed-tiles'
import { SupplementTiles, type SupplementTile } from 'components/health/supplements/supplement-tiles'
import { logDateString } from 'utils/time'

/** Selected supplement id → quantity for a date, seeded from its logs. */
function quantitiesFor(logs: SupplementLog[], date: string) {
    const map = new Map<number, number>()
    for (const l of logs) {
        if (l.date === date) map.set(Number(l.supplementId), l.quantity)
    }
    return map
}

type Props = {
    /** edit = the date already has logs; saving diffs against them. */
    mode: 'add' | 'edit'
    /** Date to open on (edit) — defaults to today. */
    initialDate?: string
    supplements: Supplement[]
    /** Every log, so changing the date re-syncs the selection. */
    allLogs: SupplementLog[]
    /** Stack changes, for each tile's Day X on the chosen date. */
    events: SupplementEvent[]
    onCancel: () => void
    onSuccess: () => void
    /** Where "Add supplements" goes when the catalogue is empty. */
    onAddSupplements?: () => void
}

/**
 * Page-style Log / Edit Supplements form for one day: the date (week strip),
 * then the daily stack as tiles — tap adds a dose, tapping a full one clears
 * it (so one tap always undoes) — and as-needed supplements as dashed tiles
 * that toggle, with a + for more than one. Nothing saves until Save, so
 * Cancel undoes everything. Saving diffs against the date's existing logs
 * (create / update / delete), so the same form logs a new day and edits one.
 */
export default function SupplementLogForm({
    mode,
    initialDate,
    supplements,
    allLogs,
    events,
    onCancel,
    onSuccess,
    onAddSupplements,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    // Before 6am a new log defaults to yesterday, like the Home stack
    const [date, setDate] = useState(() => initialDate ?? logDateString())
    const [quantities, setQuantities] = useState(() =>
        quantitiesFor(allLogs, initialDate ?? logDateString())
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const activeSupplements = supplements.filter((s) => s.isActive)

    // Day X on the chosen date (the history's "today" is the log day)
    const history = useMemo(
        () =>
            buildSupplementHistory({
                supplements,
                events,
                logs: allLogs,
                today: logDateString(),
                recordedOn: (iso) => logDateString(new Date(iso)),
            }),
        [supplements, events, allLogs]
    )

    // Today's daily stack, plus anything off it that has a dose that day
    const dailyTiles: SupplementTile[] = activeSupplements
        .filter((s) => s.dailyDoses !== null)
        .map((s) => ({
            supplementId: Number(s.id),
            name: s.name,
            dosage: s.dosage,
            dayOfRun: history.dayOfRun(Number(s.id), date),
            taken: quantities.get(Number(s.id)) ?? 0,
            dosesPerDay: s.dailyDoses as number,
        }))
    const asNeededTiles: AsNeededTile[] = activeSupplements
        .filter((s) => s.dailyDoses === null)
        .map((s) => ({
            supplementId: Number(s.id),
            name: s.name,
            dosage: s.dosage,
            taken: quantities.get(Number(s.id)) ?? 0,
        }))
    const due = dailyTiles.reduce((n, t) => n + t.dosesPerDay, 0)
    const taken = dailyTiles.reduce((n, t) => n + Math.min(t.taken, t.dosesPerDay), 0)

    // Changing the date re-syncs the selection from that date's logs
    const handleDateChange = useCallback(
        (next: string) => {
            setDate(next)
            setQuantities(quantitiesFor(allLogs, next))
        },
        [allLogs]
    )

    const setQuantity = useCallback((id: number, qty: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (qty <= 0) next.delete(id)
            else next.set(id, qty)
            return next
        })
    }, [])

    const handleSubmit = useCallback(async () => {
        const existing = quantitiesFor(allLogs, date)
        if (quantities.size === 0 && existing.size === 0) {
            setError('Pick at least one supplement.')
            return
        }
        setError('')
        setSaving(true)
        try {
            const logBySupp = new Map<number, SupplementLog>()
            for (const l of allLogs) {
                if (l.date === date) logBySupp.set(Number(l.supplementId), l)
            }
            const json = { 'Content-Type': 'application/json' }
            const ops: Promise<Response>[] = []

            // Create or update the selected supplements
            for (const [suppId, qty] of Array.from(quantities.entries())) {
                const log = logBySupp.get(suppId)
                if (log) {
                    if (log.quantity !== qty) {
                        ops.push(
                            fetch(`/api/health/supplement-logs/${log.id}`, {
                                method: 'PUT',
                                headers: json,
                                body: JSON.stringify({ quantity: qty }),
                            })
                        )
                    }
                } else {
                    // POST creates with quantity 1, then PUT if more
                    ops.push(
                        fetch('/api/health/supplement-logs', {
                            method: 'POST',
                            headers: json,
                            body: JSON.stringify({ date, supplementId: suppId }),
                        }).then(async (res) => {
                            if (res.ok && qty > 1) {
                                const created = await res.json()
                                return fetch(
                                    `/api/health/supplement-logs/${created.id}`,
                                    {
                                        method: 'PUT',
                                        headers: json,
                                        body: JSON.stringify({ quantity: qty }),
                                    }
                                )
                            }
                            return res
                        })
                    )
                }
            }
            // Remove the deselected ones
            for (const [suppId, log] of Array.from(logBySupp.entries())) {
                if (!quantities.has(suppId)) {
                    ops.push(
                        fetch(`/api/health/supplement-logs/${log.id}`, {
                            method: 'DELETE',
                        })
                    )
                }
            }

            const results = await Promise.all(ops)
            if (results.some((r) => !r.ok)) throw new Error('Save failed')
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.supplementLogs.all,
            })
            onSuccess()
        } catch (err) {
            console.error('Failed to save supplement log:', err)
            setError('Could not save. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [allLogs, date, quantities, queryClient, onSuccess])

    return (
        <FormPage
            title={isEdit ? 'Edit Supplements' : 'Log Supplements'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving}
            submitLabel={saving ? 'Saving...' : isEdit ? 'Save' : 'Log'}>
            <FormDateField value={date} onChange={handleDateChange} required />

            {activeSupplements.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography sx={{ fontSize: 14, color: colors.primaryBrown, mb: 1 }}>
                        No supplements added yet.
                    </Typography>
                    {onAddSupplements && (
                        <Button onClick={onAddSupplements} size="small" sx={primaryButtonSx}>
                            Add Supplements
                        </Button>
                    )}
                </Box>
            ) : (
                <>
                    {dailyTiles.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <SectionLabel
                                label="Daily stack"
                                right={`${taken} / ${due} doses`}
                            />
                            <SupplementTiles
                                tiles={dailyTiles}
                                // Adds a dose; a full tile clears to 0
                                onTap={(t) =>
                                    setQuantity(t.supplementId, t.taken >= t.dosesPerDay ? 0 : t.taken + 1)
                                }
                            />
                        </Box>
                    )}
                    {asNeededTiles.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <SectionLabel label="As needed" />
                            <AsNeededTiles
                                tiles={asNeededTiles}
                                onToggle={(t) => setQuantity(t.supplementId, t.taken > 0 ? 0 : 1)}
                                onAddOne={(t) => setQuantity(t.supplementId, t.taken + 1)}
                            />
                        </Box>
                    )}
                </>
            )}
        </FormPage>
    )
}

/** A section over tiles: mono caps like the Supplements page strip. */
function SectionLabel({ label, right }: { label: string; right?: string }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingX: 0.25 }}>
            <Typography sx={sectionSx}>{label}</Typography>
            {right && <Typography sx={{ ...sectionSx, color: supplementColors.deep }}>{right}</Typography>}
        </Box>
    )
}

const sectionSx = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.primaryBrown,
} as const
