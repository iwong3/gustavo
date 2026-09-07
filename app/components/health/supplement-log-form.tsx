'use client'

import { Box, Button, Checkbox, Typography } from '@mui/material'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { cardSx, colors } from '@/lib/colors'
import { labelSx, primaryButtonSx } from '@/lib/form-styles'
import type { Supplement, SupplementLog } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { FormDateField } from 'components/form-date-field'
import { FormPage } from 'components/form-page'
import { todayIso } from 'components/health/workout-presets'

/** Selected supplement id → quantity for a date, seeded from its logs. */
function quantitiesFor(logs: SupplementLog[], date: string) {
    const map = new Map<number, number>()
    for (const l of logs) {
        if (l.date === date) map.set(Number(l.supplementId), l.quantity)
    }
    return map
}

const roundButtonSx = {
    'width': 24,
    'height': 24,
    'borderRadius': '50%',
    'border': `1.5px solid ${colors.primaryBlack}`,
    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'cursor': 'pointer',
    'backgroundColor': colors.primaryWhite,
    '&:active': {
        boxShadow: 'none',
        transform: 'translate(1px, 1px)',
    },
} as const

type Props = {
    /** edit = the date already has logs; saving diffs against them. */
    mode: 'add' | 'edit'
    /** Date to open on (edit) — defaults to today. */
    initialDate?: string
    supplements: Supplement[]
    /** Every log, so changing the date re-syncs the selection. */
    allLogs: SupplementLog[]
    onCancel: () => void
    onSuccess: () => void
    /** Where "Add supplements" goes when the catalogue is empty. */
    onAddSupplements?: () => void
}

/**
 * Page-style Log Supplements form: date first (week strip), then the active
 * supplements as a checklist with a quantity stepper. Saving diffs the
 * selection against the date's existing logs (create / update / delete), so
 * the same form logs a new day and edits an existing one.
 */
export default function SupplementLogForm({
    mode,
    initialDate,
    supplements,
    allLogs,
    onCancel,
    onSuccess,
    onAddSupplements,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [date, setDate] = useState(() => initialDate ?? todayIso())
    const [quantities, setQuantities] = useState(() =>
        quantitiesFor(allLogs, initialDate ?? todayIso())
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const activeSupplements = supplements.filter((s) => s.isActive)

    // Changing the date re-syncs the selection from that date's logs
    const handleDateChange = useCallback(
        (next: string) => {
            setDate(next)
            setQuantities(quantitiesFor(allLogs, next))
        },
        [allLogs]
    )

    const toggle = useCallback((id: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (next.has(id)) next.delete(id)
            else next.set(id, 1)
            return next
        })
    }, [])

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

            <Box>
                <Typography sx={labelSx}>Supplements</Typography>
                {activeSupplements.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography
                            sx={{
                                fontSize: 14,
                                color: colors.primaryBrown,
                                mb: 1,
                            }}>
                            No supplements added yet.
                        </Typography>
                        {onAddSupplements && (
                            <Button
                                onClick={onAddSupplements}
                                size="small"
                                sx={primaryButtonSx}>
                                Add Supplements
                            </Button>
                        )}
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.75,
                        }}>
                        {activeSupplements.map((supp) => {
                            const id = Number(supp.id)
                            const qty = quantities.get(id) ?? 0
                            const isSelected = qty > 0
                            return (
                                <Box
                                    key={supp.id}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        padding: '8px 12px',
                                        ...cardSx,
                                        backgroundColor: isSelected
                                            ? '#f1f8e9'
                                            : colors.primaryWhite,
                                        borderColor: isSelected
                                            ? '#4caf50'
                                            : colors.primaryBlack,
                                        boxShadow: `2px 2px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                        transition:
                                            'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
                                    }}>
                                    <Checkbox
                                        checked={isSelected}
                                        onClick={() => toggle(id)}
                                        size="small"
                                        sx={{
                                            'padding': 0,
                                            'color': colors.primaryBlack,
                                            '&.Mui-checked': { color: '#4caf50' },
                                        }}
                                    />
                                    <Box
                                        sx={{ flex: 1, cursor: 'pointer' }}
                                        onClick={() => toggle(id)}>
                                        <Typography
                                            sx={{ fontSize: 14, fontWeight: 600 }}>
                                            {supp.name}
                                        </Typography>
                                        {supp.dosage && (
                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    color: colors.primaryBrown,
                                                }}>
                                                {supp.dosage}
                                            </Typography>
                                        )}
                                    </Box>
                                    {isSelected && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                flexShrink: 0,
                                            }}>
                                            <Box
                                                onClick={() => setQuantity(id, qty - 1)}
                                                sx={roundButtonSx}>
                                                <IconMinus size={12} stroke={2.5} />
                                            </Box>
                                            <Typography
                                                sx={{
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    minWidth: 20,
                                                    textAlign: 'center',
                                                }}>
                                                {qty}
                                            </Typography>
                                            <Box
                                                onClick={() => setQuantity(id, qty + 1)}
                                                sx={roundButtonSx}>
                                                <IconPlus size={12} stroke={2.5} />
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            )
                        })}
                    </Box>
                )}
            </Box>
        </FormPage>
    )
}
