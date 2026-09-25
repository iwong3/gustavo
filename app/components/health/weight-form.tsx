'use client'

import { Box, Typography } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { errorLabelSx, labelSx } from '@/lib/form-styles'
import type { WeightLog } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { FormDateField } from 'components/form-date-field'
import { FormPage } from 'components/form-page'
import { todayIso } from 'components/health/workout-presets'
import { StepperField } from 'components/stepper-field'
import { useWeightLogs } from 'hooks/useWeightLogs'

type Props = {
    mode: 'add' | 'edit'
    log?: WeightLog
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style Log / Edit Weight form: date (week strip) then the weight in
 * lbs. Owns the request; the page owns navigation.
 *
 * Logging starts from your most recent weight, nudged with the − / +
 * buttons — a daily weigh-in is usually a small change, not a retype.
 */
export default function WeightForm({ mode, log, onCancel, onSuccess }: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [date, setDate] = useState(() =>
        isEdit && log ? log.date : todayIso()
    )
    const { logs } = useWeightLogs()
    // Most recent weigh-in (by date) — the starting point when logging
    const lastWeight = useMemo(() => {
        if (isEdit || logs.length === 0) return null
        const latest = logs.reduce((a, b) => (b.date > a.date ? b : a))
        return String(latest.weightLbs)
    }, [isEdit, logs])

    // null = untouched: show the prefill (derived, so it still appears if
    // the history loads after the form opens)
    const [typed, setTyped] = useState<string | null>(() =>
        isEdit && log ? String(log.weightLbs) : null
    )
    const weight = typed ?? lastWeight ?? ''
    const setWeight = setTyped
    const [attempted, setAttempted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const weightNum = parseFloat(weight)
    const weightValid = Number.isFinite(weightNum) && weightNum > 0
    const weightError = attempted && !weightValid

    const handleSubmit = useCallback(async () => {
        setAttempted(true)
        if (!date) {
            setError('Pick a date.')
            return
        }
        if (!weightValid) {
            setError('Enter your weight in lbs.')
            return
        }
        setError('')
        setSaving(true)
        try {
            const url =
                isEdit && log
                    ? `/api/health/weight-logs/${log.id}`
                    : '/api/health/weight-logs'
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, weightLbs: weightNum }),
            })
            if (!res.ok) throw new Error('Save failed')
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.weightLogs,
            })
            onSuccess()
        } catch (err) {
            console.error('Failed to save weight log:', err)
            setError('Could not save the weight. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [date, weightValid, weightNum, isEdit, log, queryClient, onSuccess])

    return (
        <FormPage
            title={isEdit ? 'Edit Weight' : 'Log Weight'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving}
            submitLabel={saving ? 'Saving...' : isEdit ? 'Save' : 'Log'}>
            <FormDateField value={date} onChange={setDate} required />

            <Box>
                <Typography sx={weightError ? errorLabelSx : labelSx}>
                    Weight (lbs) *
                </Typography>
                <StepperField
                    value={weight}
                    onChange={setWeight}
                    step={0.1}
                    decimals={1}
                    error={weightError}
                    // Only pop the keyboard when there's nothing to nudge
                    autoFocus={!isEdit && lastWeight === null}
                    placeholder="185.5"
                    ariaLabel="weight in lbs"
                />
            </Box>
        </FormPage>
    )
}
