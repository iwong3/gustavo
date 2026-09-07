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
import type { Exercise, MuscleGroupWithParents } from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { FormPage } from 'components/form-page'
import {
    MuscleGroupGrid,
    toggleMuscleSelection,
} from 'components/health/muscle-group-grid'
import { SlidingToggle } from 'components/sliding-toggle'

type Props = {
    mode: 'add' | 'edit'
    exercise?: Exercise
    muscleGroups: MuscleGroupWithParents[]
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style New / Edit Exercise form: name, weighted vs bodyweight, then the
 * muscle-group grid (shared with the workout and routine forms). Owns the
 * request; the page owns navigation.
 */
export default function ExerciseForm({
    mode,
    exercise,
    muscleGroups,
    onCancel,
    onSuccess,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [name, setName] = useState(exercise?.name ?? '')
    const [isBodyweight, setIsBodyweight] = useState(
        exercise?.isBodyweight ?? false
    )
    const [selectedMgIds, setSelectedMgIds] = useState<Set<number>>(
        () => new Set(exercise?.muscleGroups.map((mg) => Number(mg.id)) ?? [])
    )
    const [attempted, setAttempted] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const nameError = attempted && !name.trim()

    const toggleMuscle = useCallback(
        (mgName: string, mgId: number) =>
            setSelectedMgIds((prev) =>
                toggleMuscleSelection(prev, mgName, mgId, muscleGroups)
            ),
        [muscleGroups]
    )

    const handleSubmit = useCallback(async () => {
        setAttempted(true)
        if (!name.trim()) {
            setError('Give the exercise a name.')
            return
        }
        setError('')
        setSaving(true)
        try {
            const url =
                isEdit && exercise
                    ? `/api/health/exercises/${exercise.id}`
                    : '/api/health/exercises'
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    isBodyweight,
                    muscleGroupIds: Array.from(selectedMgIds),
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.error || 'Could not save the exercise.')
                return
            }
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.exercises,
            })
            onSuccess()
        } catch (err) {
            console.error('Failed to save exercise:', err)
            setError('Could not save the exercise. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [
        name,
        isBodyweight,
        selectedMgIds,
        isEdit,
        exercise,
        queryClient,
        onSuccess,
    ])

    return (
        <FormPage
            title={isEdit ? 'Edit Exercise' : 'New Exercise'}
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
                    placeholder="Bench Press, Dumbbell Curl..."
                    sx={nameError ? errorFieldSx : fieldSx}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Type</Typography>
                <SlidingToggle
                    value={isBodyweight ? 'bw' : 'weighted'}
                    options={[
                        { value: 'weighted', label: 'Weighted' },
                        { value: 'bw', label: 'Bodyweight' },
                    ]}
                    onChange={(v) => setIsBodyweight(v === 'bw')}
                    fontSize={13}
                    borderWidth={1}
                />
            </Box>

            <Box>
                <Typography sx={labelSx}>Muscle groups</Typography>
                <MuscleGroupGrid
                    muscleGroups={muscleGroups}
                    selectedIds={selectedMgIds}
                    onToggle={toggleMuscle}
                />
            </Box>
        </FormPage>
    )
}
