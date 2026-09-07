'use client'

import { Box, Checkbox, TextField, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { cardSx, colors } from '@/lib/colors'
import { errorFieldSx, errorLabelSx, fieldSx, labelSx } from '@/lib/form-styles'
import type {
    Exercise,
    MuscleGroupWithParents,
    WorkoutPreset,
} from '@/lib/health-types'
import { queryKeys } from '@/lib/query-keys'
import { FormPage } from 'components/form-page'
import {
    BodyweightChip,
    exerciseCheckboxSx,
    inlineSearchSx,
    MuscleGroupGrid,
    MuscleTagList,
    selectedBg,
    toggleMuscleSelection,
} from 'components/health/muscle-group-grid'

type Props = {
    mode: 'add' | 'edit'
    preset?: WorkoutPreset
    muscleGroups: MuscleGroupWithParents[]
    exercises: Exercise[]
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style New / Edit Routine form (a workout preset: a name, muscle
 * groups, and exercises that one tap applies to a new workout).
 */
export default function RoutineForm({
    mode,
    preset,
    muscleGroups,
    exercises,
    onCancel,
    onSuccess,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'

    const [name, setName] = useState(preset?.name ?? '')
    const [selectedMgIds, setSelectedMgIds] = useState<Set<number>>(
        () => new Set(preset?.muscleGroups.map((mg) => Number(mg.id)) ?? [])
    )
    const [selectedExIds, setSelectedExIds] = useState<number[]>(
        () => preset?.exercises.map((ex) => ex.id) ?? []
    )
    const [search, setSearch] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [attempted, setAttempted] = useState(false)

    const nameError = attempted && !name.trim()

    const toggleMuscle = useCallback(
        (mgName: string, mgId: number) =>
            setSelectedMgIds((prev) =>
                toggleMuscleSelection(prev, mgName, mgId, muscleGroups)
            ),
        [muscleGroups]
    )

    const toggleExercise = useCallback((exId: number) => {
        setSelectedExIds((prev) =>
            prev.includes(exId)
                ? prev.filter((id) => id !== exId)
                : [...prev, exId]
        )
    }, [])

    const handleSubmit = useCallback(async () => {
        setAttempted(true)
        if (!name.trim()) return
        setSaving(true)
        setError('')
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
                        type: 'workout',
                        muscleGroupIds: Array.from(selectedMgIds),
                        exerciseIds: selectedExIds,
                    }),
                }
            )
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.error || 'Failed to save')
                return
            }
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.presets.all,
            })
            onSuccess()
        } catch {
            setError('Failed to save')
        } finally {
            setSaving(false)
        }
    }, [
        name,
        selectedMgIds,
        selectedExIds,
        isEdit,
        preset,
        queryClient,
        onSuccess,
    ])

    // Selected first, then the rest; both filtered by the search text
    const term = search.trim().toLowerCase()
    const matches = (ex: Exercise) =>
        !term || ex.name.toLowerCase().includes(term)
    const rows = [
        ...exercises
            .filter((ex) => selectedExIds.includes(ex.id))
            .filter(matches)
            .map((ex) => ({ ex, checked: true })),
        ...exercises
            .filter((ex) => !selectedExIds.includes(ex.id))
            .filter(matches)
            .map((ex) => ({ ex, checked: false })),
    ]

    return (
        <FormPage
            title={isEdit ? 'Edit Routine' : 'New Routine'}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving}
            submitLabel={saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}>
            {/* 1. Name */}
            <Box>
                <Typography sx={nameError ? errorLabelSx : labelSx}>
                    Name *
                </Typography>
                <TextField
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    size="small"
                    fullWidth
                    placeholder="Push Day, Pull Day..."
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    sx={nameError ? errorFieldSx : fieldSx}
                />
            </Box>

            {/* 2. Muscle groups */}
            <Box>
                <Typography sx={labelSx}>Muscle groups</Typography>
                <MuscleGroupGrid
                    muscleGroups={muscleGroups}
                    selectedIds={selectedMgIds}
                    onToggle={toggleMuscle}
                />
            </Box>

            {/* 3. Exercises */}
            {exercises.length > 0 && (
                <Box>
                    <Typography sx={labelSx}>
                        Exercises
                        {selectedExIds.length > 0 &&
                            ` (${selectedExIds.length})`}
                    </Typography>
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1.5,
                                py: 1,
                                borderBottom: `1px solid ${colors.primaryBlack}`,
                            }}>
                            <TextField
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                size="small"
                                placeholder="Search exercises..."
                                sx={inlineSearchSx}
                            />
                        </Box>
                        {rows.map(({ ex, checked }, i) => (
                            <Box
                                key={ex.id}
                                onClick={() => toggleExercise(ex.id)}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': 1,
                                    'padding': 1,
                                    'cursor': 'pointer',
                                    'backgroundColor': checked
                                        ? selectedBg
                                        : colors.primaryWhite,
                                    ...(i < rows.length - 1 && {
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    }),
                                    '&:active': { opacity: 0.7 },
                                }}>
                                <Checkbox
                                    checked={checked}
                                    size="small"
                                    sx={exerciseCheckboxSx}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => toggleExercise(ex.id)}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                        }}>
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: checked ? 600 : 500,
                                            }}>
                                            {ex.name}
                                        </Typography>
                                        {ex.isBodyweight && <BodyweightChip />}
                                    </Box>
                                    <MuscleTagList
                                        groups={ex.muscleGroups}
                                        selectedIds={selectedMgIds}
                                    />
                                </Box>
                            </Box>
                        ))}
                        {rows.length === 0 && (
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: colors.primaryBrown,
                                    py: 1,
                                    textAlign: 'center',
                                }}>
                                No exercises match.
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}
        </FormPage>
    )
}
