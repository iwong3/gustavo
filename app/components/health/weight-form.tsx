'use client'

import { Box, TextField, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
    errorFieldSx,
    errorLabelSx,
    fieldSx,
    labelSx,
} from '@/lib/form-styles'
import type { WeightLog } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { FormDateField } from 'components/form-date-field'
import { FormPage } from 'components/form-page'
import { todayIso } from 'components/health/workout-presets'

type Props = {
    mode: 'add' | 'edit'
    log?: WeightLog
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style Log / Edit Weight form: date (week strip) then the weight in
 * lbs. Owns the request; the page owns navigation.
 */
export default function WeightForm({ mode, log, onCancel, onSuccess }: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [date, setDate] = useState(() =>
        isEdit && log ? log.date : todayIso()
    )
    const [weight, setWeight] = useState(() =>
        isEdit && log ? String(log.weightLbs) : ''
    )
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
                <TextField
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    size="small"
                    type="number"
                    autoFocus={!isEdit}
                    inputProps={{ step: '0.1', min: '0', inputMode: 'decimal' }}
                    placeholder="e.g. 185.5"
                    sx={{ ...(weightError ? errorFieldSx : fieldSx), maxWidth: 180 }}
                />
            </Box>
        </FormPage>
    )
}
