'use client'

import { Box, Checkbox, TextField, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { cardSx, colors } from '@/lib/colors'
import {
    errorFieldSx,
    errorLabelSx,
    fieldSx,
    labelSx,
} from '@/lib/form-styles'
import type { Supplement, SupplementPreset } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { FormPage } from 'components/form-page'

type Props = {
    mode: 'add' | 'edit'
    preset?: SupplementPreset
    supplements: Supplement[]
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style New / Edit Supplement Group form (a supplement preset): name,
 * then the active supplements to pick. Owns the request; the page owns
 * navigation.
 */
export default function SupplementGroupForm({
    mode,
    preset,
    supplements,
    onCancel,
    onSuccess,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [name, setName] = useState(preset?.name ?? '')
    const [selectedIds, setSelectedIds] = useState<Set<number>>(
        () => new Set(preset?.supplements.map((s) => Number(s.id)) ?? [])
    )
    const [attempted, setAttempted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const nameError = attempted && !name.trim()
    const activeSupplements = supplements.filter((s) => s.isActive)

    const toggle = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const handleSubmit = useCallback(async () => {
        setAttempted(true)
        if (!name.trim()) {
            setError('Give the group a name.')
            return
        }
        if (selectedIds.size === 0) {
            setError('Pick at least one supplement.')
            return
        }
        setError('')
        setSaving(true)
        try {
            const res = await fetch(
                isEdit && preset
                    ? `/api/health/presets/${preset.id}`
                    : '/api/health/presets',
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name.trim(),
                        type: 'supplement',
                        supplementIds: Array.from(selectedIds),
                    }),
                }
            )
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.error || 'Could not save the group.')
                return
            }
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.presets.all,
            })
            onSuccess()
        } catch (err) {
            console.error('Failed to save supplement group:', err)
            setError('Could not save the group. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [name, selectedIds, isEdit, preset, queryClient, onSuccess])

    return (
        <FormPage
            title={isEdit ? 'Edit Group' : 'New Group'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving}
            submitLabel={saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}>
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
                    placeholder="Daily, Workout, Evening..."
                    sx={nameError ? errorFieldSx : fieldSx}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Supplements *</Typography>
                {activeSupplements.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>
                        No active supplements. Add some first.
                    </Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.75,
                        }}>
                        {activeSupplements.map((supp) => {
                            const id = Number(supp.id)
                            const isSelected = selectedIds.has(id)
                            return (
                                <Box
                                    key={supp.id}
                                    onClick={() => toggle(id)}
                                    sx={{
                                        'display': 'flex',
                                        'alignItems': 'center',
                                        'gap': 1,
                                        'padding': '8px 12px',
                                        ...cardSx,
                                        'cursor': 'pointer',
                                        'backgroundColor': isSelected
                                            ? '#f1f8e9'
                                            : colors.primaryWhite,
                                        'borderColor': isSelected
                                            ? '#4caf50'
                                            : colors.primaryBlack,
                                        'boxShadow': `2px 2px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                        'transition': 'all 0.15s',
                                        '&:active': {
                                            boxShadow: `1px 1px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                            transform: 'translate(1px, 1px)',
                                        },
                                    }}>
                                    <Checkbox
                                        checked={isSelected}
                                        size="small"
                                        sx={{
                                            'padding': 0,
                                            'color': colors.primaryBlack,
                                            '&.Mui-checked': { color: '#4caf50' },
                                        }}
                                        tabIndex={-1}
                                    />
                                    <Box>
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
                                </Box>
                            )
                        })}
                    </Box>
                )}
            </Box>
        </FormPage>
    )
}
