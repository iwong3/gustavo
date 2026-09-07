'use client'

import { Box, Checkbox, TextField, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { colors } from '@/lib/colors'
import {
    errorFieldSx,
    errorLabelSx,
    fieldSx,
    labelSx,
} from '@/lib/form-styles'
import type { Supplement } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { FormPage } from 'components/form-page'

type Props = {
    mode: 'add' | 'edit'
    supplement?: Supplement
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style New / Edit Supplement form: name, dosage, and (when editing) an
 * Active toggle — inactive supplements stay in history but drop out of the
 * log checklist. Owns the request; the page owns navigation.
 */
export default function SupplementForm({
    mode,
    supplement,
    onCancel,
    onSuccess,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [name, setName] = useState(supplement?.name ?? '')
    const [dosage, setDosage] = useState(supplement?.dosage ?? '')
    const [isActive, setIsActive] = useState(supplement?.isActive ?? true)
    const [attempted, setAttempted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const nameError = attempted && !name.trim()

    const handleSubmit = useCallback(async () => {
        setAttempted(true)
        if (!name.trim()) {
            setError('Give the supplement a name.')
            return
        }
        setError('')
        setSaving(true)
        try {
            const url =
                isEdit && supplement
                    ? `/api/health/supplements/${supplement.id}`
                    : '/api/health/supplements'
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    dosage: dosage.trim() || null,
                    ...(isEdit ? { isActive } : {}),
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.error || 'Could not save the supplement.')
                return
            }
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.supplements,
            })
            onSuccess()
        } catch (err) {
            console.error('Failed to save supplement:', err)
            setError('Could not save the supplement. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [name, dosage, isActive, isEdit, supplement, queryClient, onSuccess])

    return (
        <FormPage
            title={isEdit ? 'Edit Supplement' : 'New Supplement'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving}
            submitLabel={saving ? 'Saving...' : isEdit ? 'Save' : 'Add'}>
            <Box>
                <Typography sx={nameError ? errorLabelSx : labelSx}>
                    Name *
                </Typography>
                <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    size="small"
                    fullWidth
                    autoFocus={!isEdit}
                    placeholder="Creatine, Vitamin D..."
                    sx={nameError ? errorFieldSx : fieldSx}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Dosage</Typography>
                <TextField
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="5g, 400mg, 2 capsules..."
                    sx={fieldSx}
                />
            </Box>

            {isEdit && (
                <Box
                    onClick={() => setIsActive(!isActive)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                    }}>
                    <Checkbox
                        checked={isActive}
                        size="small"
                        sx={{
                            'padding': 0,
                            'color': colors.primaryBlack,
                            '&.Mui-checked': { color: colors.primaryBlack },
                        }}
                        tabIndex={-1}
                    />
                    <Typography sx={{ fontSize: 14 }}>Active</Typography>
                </Box>
            )}
        </FormPage>
    )
}
