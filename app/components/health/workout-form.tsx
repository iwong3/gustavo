'use client'

import {
    Box,
    Button,
    Checkbox,
    Chip,
    TextField,
    Typography,
} from '@mui/material'
import { IconBolt, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { cardSx, colors } from '@/lib/colors'
import { fieldSx, labelSx, primaryButtonSx } from '@/lib/form-styles'
import type {
    Exercise,
    MuscleGroupWithParents,
    Workout,
    WorkoutExercise,
    WorkoutPreset,
} from '@/lib/health-types'
import { getParents, isTarget } from '@/lib/health/muscle-groups'
import { queryKeys } from '@/lib/query-keys'
import { FormDateField } from 'components/form-date-field'
import { FormPage } from 'components/form-page'
import {
    BodyweightChip,
    exerciseBorder,
    exerciseCheckboxSx,
    inlineSearchSx,
    MuscleGroupGrid,
    MuscleTagList,
    selectedBg,
    selectedBorder,
    toggleMuscleSelection,
} from 'components/health/muscle-group-grid'
import {
    HorizontalSortableList,
    SortablePresetChip,
} from 'components/health/sortable-preset'
import {
    todayIso,
    useReorderWorkoutPresets,
} from 'components/health/workout-presets'

// ── Types ────────────────────────────────────────────────────────────────────

export type WorkoutFormData = {
    date: string
    muscleGroupIds: number[]
    notes: string
    exercises?: {
        exerciseId: number
        sortOrder: number
        weightLbs?: number
        sets?: { reps?: number }[]
    }[]
}

type FormExerciseEntry = {
    exerciseId: number
    exerciseName: string
    isBodyweight: boolean
    sets: number
    reps: string // string for input flexibility
    weightLbs: string // string for input flexibility — lives on exercise, not per-set
    expandedSets: { reps: string }[] | null // null = collapsed (uniform)
}

function defaultEntry(exercise: Exercise): FormExerciseEntry {
    return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        isBodyweight: exercise.isBodyweight,
        sets: 0,
        reps: '',
        weightLbs: '',
        expandedSets: null,
    }
}

function entryFromWorkoutExercise(we: WorkoutExercise): FormExerciseEntry {
    const sets = we.sets
    const weightStr = we.weightLbs != null ? we.weightLbs.toString() : ''
    const base = {
        exerciseId: we.exercise.id,
        exerciseName: we.exercise.name,
        isBodyweight: we.exercise.isBodyweight,
        weightLbs: weightStr,
    }
    if (sets.length === 0) {
        return { ...base, sets: 0, reps: '', expandedSets: null }
    }
    const allSame = sets.every((s) => s.reps === sets[0].reps)
    return {
        ...base,
        sets: sets.length,
        reps: sets[0].reps?.toString() ?? '',
        // Different reps per set — show one field per set
        expandedSets: allSame
            ? null
            : sets.map((s) => ({ reps: s.reps?.toString() ?? '' })),
    }
}

type Props = {
    /** duplicate = a copy of `workout` dated today, saved as a new workout */
    mode: 'add' | 'edit' | 'duplicate'
    workout?: Workout
    muscleGroups: MuscleGroupWithParents[]
    exercises: Exercise[]
    presets: WorkoutPreset[]
    onCancel: () => void
    onSuccess: () => void
}

/**
 * Page-style Log / Edit / Duplicate Workout form. Field order follows the
 * app-wide convention (code-guide.md § Page-style forms): date first, then
 * the quick-fill routines, the muscle-group grid, exercises, notes.
 * Owns the request; the page owns navigation.
 */
export default function WorkoutForm({
    mode,
    workout,
    muscleGroups,
    exercises,
    presets,
    onCancel,
    onSuccess,
}: Props) {
    const queryClient = useQueryClient()
    const isEdit = mode === 'edit'
    const isDuplicate = mode === 'duplicate'
    const title = isEdit
        ? 'Edit Workout'
        : isDuplicate
          ? 'Duplicate Workout'
          : 'Log Workout'

    const [date, setDate] = useState(() =>
        isEdit && workout ? workout.date : todayIso()
    )
    const [selectedIds, setSelectedIds] = useState<Set<number>>(
        () => new Set(workout?.muscleGroups.map((mg) => Number(mg.id)) ?? [])
    )
    const [notes, setNotes] = useState(workout?.notes ?? '')
    const [exerciseEntries, setExerciseEntries] = useState<FormExerciseEntry[]>(
        () => workout?.exercises.map(entryFromWorkoutExercise) ?? []
    )
    const [exerciseSearch, setExerciseSearch] = useState('')
    const [expandedEntries, setExpandedEntries] = useState<Set<number>>(
        new Set()
    )
    const [quickAddSaving, setQuickAddSaving] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Save-as-routine state
    const [showSavePreset, setShowSavePreset] = useState(false)
    const [presetName, setPresetName] = useState('')
    const [savingPreset, setSavingPreset] = useState(false)
    const reorderPresets = useReorderWorkoutPresets()

    const toggleMuscle = useCallback(
        (name: string, id: number) =>
            setSelectedIds((prev) =>
                toggleMuscleSelection(prev, name, id, muscleGroups)
            ),
        [muscleGroups]
    )

    // Apply a routine to prefill the form
    const applyPreset = useCallback((preset: WorkoutPreset) => {
        setSelectedIds(new Set(preset.muscleGroups.map((mg) => Number(mg.id))))
        setExerciseEntries(preset.exercises.map((ex) => defaultEntry(ex)))
    }, [])

    // Save the current selection as a new routine
    const saveAsPreset = useCallback(async () => {
        if (!presetName.trim()) return
        setSavingPreset(true)
        try {
            const res = await fetch('/api/health/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: presetName.trim(),
                    type: 'workout',
                    muscleGroupIds: Array.from(selectedIds),
                    exerciseIds: exerciseEntries.map((e) => e.exerciseId),
                }),
            })
            if (res.ok) {
                setShowSavePreset(false)
                setPresetName('')
                queryClient.invalidateQueries({
                    queryKey: queryKeys.health.presets.all,
                })
            }
        } catch {
            // silent fail — the chip list simply doesn't gain a new routine
        } finally {
            setSavingPreset(false)
        }
    }, [presetName, selectedIds, exerciseEntries, queryClient])

    // Add an exercise to the workout (+ auto-select its muscle groups)
    const addExercise = useCallback(
        (exercise: Exercise) => {
            if (exerciseEntries.some((e) => e.exerciseId === exercise.id))
                return
            setExerciseEntries((prev) => [...prev, defaultEntry(exercise)])
            setSelectedIds((prev) => {
                const next = new Set(prev)
                for (const mg of exercise.muscleGroups) {
                    next.add(Number(mg.id))
                    if (isTarget(mg.name)) {
                        for (const p of getParents(mg.name)) {
                            const pid = muscleGroups.find(
                                (g) => g.name === p
                            )?.id
                            if (pid) next.add(Number(pid))
                        }
                    }
                }
                return next
            })
            setExerciseSearch('')
        },
        [exerciseEntries, muscleGroups]
    )

    const removeExercise = useCallback((index: number) => {
        setExerciseEntries((prev) => prev.filter((_, i) => i !== index))
        setExpandedEntries((prev) => {
            const next = new Set<number>()
            Array.from(prev).forEach((i) => {
                if (i < index) next.add(i)
                else if (i > index) next.add(i - 1)
            })
            return next
        })
    }, [])

    const updateEntry = useCallback(
        (index: number, updates: Partial<FormExerciseEntry>) => {
            setExerciseEntries((prev) =>
                prev.map((e, i) => (i === index ? { ...e, ...updates } : e))
            )
        },
        []
    )

    // Uniform sets ⇄ one reps field per set
    const toggleExpandedSets = useCallback((index: number) => {
        setExerciseEntries((prev) =>
            prev.map((e, i) => {
                if (i !== index) return e
                if (e.expandedSets) return { ...e, expandedSets: null }
                return {
                    ...e,
                    expandedSets: Array.from({ length: e.sets || 1 }, () => ({
                        reps: e.reps,
                    })),
                }
            })
        )
    }, [])

    const updateExpandedSet = useCallback(
        (entryIndex: number, setIndex: number, value: string) => {
            setExerciseEntries((prev) =>
                prev.map((e, i) => {
                    if (i !== entryIndex || !e.expandedSets) return e
                    return {
                        ...e,
                        expandedSets: e.expandedSets.map((s, si) =>
                            si === setIndex ? { reps: value } : s
                        ),
                    }
                })
            )
        },
        []
    )

    // Create a new exercise from the search text and add it
    const handleQuickAdd = useCallback(async () => {
        if (!exerciseSearch.trim()) return
        setQuickAddSaving(true)
        try {
            const res = await fetch('/api/health/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: exerciseSearch.trim(),
                    muscleGroupIds: Array.from(selectedIds),
                }),
            })
            if (res.ok) {
                const newExercise: Exercise = await res.json()
                queryClient.invalidateQueries({
                    queryKey: queryKeys.health.exercises,
                })
                addExercise(newExercise)
                setExerciseSearch('')
            }
        } finally {
            setQuickAddSaving(false)
        }
    }, [exerciseSearch, selectedIds, queryClient, addExercise])

    // Browse list: exercises matching the selected muscle groups first
    const sortedExercisesForBrowse = useMemo(() => {
        const alreadyAdded = new Set(exerciseEntries.map((e) => e.exerciseId))
        const available = exercises.filter((e) => !alreadyAdded.has(e.id))
        if (selectedIds.size === 0) return available
        const matching: Exercise[] = []
        const nonMatching: Exercise[] = []
        for (const ex of available) {
            const hasMatch = ex.muscleGroups.some((mg) =>
                selectedIds.has(Number(mg.id))
            )
            if (hasMatch) matching.push(ex)
            else nonMatching.push(ex)
        }
        return [...matching, ...nonMatching]
    }, [exercises, exerciseEntries, selectedIds])

    const handleSubmit = useCallback(async () => {
        if (selectedIds.size === 0) {
            setError('Pick at least one muscle group.')
            return
        }
        setSaving(true)
        setError('')
        try {
            const data: WorkoutFormData = {
                date,
                muscleGroupIds: Array.from(selectedIds),
                notes,
            }
            if (exerciseEntries.length > 0) {
                const parseWeight = (v: string) =>
                    v !== '' ? parseFloat(v) : undefined
                const parseReps = (v: string) =>
                    v !== '' ? parseInt(v, 10) : undefined
                data.exercises = exerciseEntries.map((entry, index) => {
                    const sets: { reps?: number }[] = []
                    if (entry.expandedSets) {
                        for (const s of entry.expandedSets) {
                            sets.push({ reps: parseReps(s.reps) })
                        }
                    } else if (entry.sets > 0) {
                        const r = parseReps(entry.reps)
                        for (let i = 0; i < entry.sets; i++)
                            sets.push({ reps: r })
                    }
                    return {
                        exerciseId: entry.exerciseId,
                        sortOrder: index,
                        weightLbs: parseWeight(entry.weightLbs),
                        sets: sets.length > 0 ? sets : undefined,
                    }
                })
            }

            const url =
                isEdit && workout
                    ? `/api/health/workouts/${workout.id}`
                    : '/api/health/workouts'
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Save failed')
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.workouts.all,
            })
            // quick-add may have created exercises
            queryClient.invalidateQueries({
                queryKey: queryKeys.health.exercises,
            })
            onSuccess()
        } catch {
            setError('Could not save the workout. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [
        date,
        selectedIds,
        notes,
        exerciseEntries,
        isEdit,
        workout,
        queryClient,
        onSuccess,
    ])

    // ── Exercise list rows (selected first, then browse) ────────────────
    const searchTerm = exerciseSearch.trim().toLowerCase()
    const selectedItems = exerciseEntries
        .map((entry, index) => ({
            type: 'selected' as const,
            entry,
            index,
            exercise: exercises.find((e) => e.id === entry.exerciseId),
        }))
        .filter(
            (item) =>
                !searchTerm ||
                item.entry.exerciseName.toLowerCase().includes(searchTerm)
        )
    const browseItems = (
        searchTerm
            ? sortedExercisesForBrowse.filter((e) =>
                  e.name.toLowerCase().includes(searchTerm)
              )
            : sortedExercisesForBrowse
    ).map((exercise) => ({ type: 'browse' as const, exercise }))
    const allItems = [...selectedItems, ...browseItems]

    return (
        <FormPage
            title={title}
            error={error}
            onCancel={onCancel}
            onSubmit={handleSubmit}
            busy={saving}
            submitLabel={saving ? 'Saving...' : isEdit ? 'Save' : 'Log'}>
            {/* 1. Date */}
            <FormDateField value={date} onChange={setDate} required />

            {/* 2. Routines — one tap prefills groups + exercises. Hidden on
                edit: a routine describes a plan, not a logged session. */}
            {!isEdit && (
                <Box>
                    <Typography sx={labelSx}>Routines</Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            alignItems: 'center',
                        }}>
                        {/* Lightning: reveal the "save as routine" input */}
                        <Box
                            onClick={() => {
                                setShowSavePreset((v) => !v)
                                if (showSavePreset) setPresetName('')
                            }}
                            role="button"
                            aria-label="Save as routine"
                            sx={{
                                'display': 'flex',
                                'alignItems': 'center',
                                'justifyContent': 'center',
                                'width': 30,
                                'height': 30,
                                'borderRadius': '50%',
                                'border': `1.5px solid ${colors.primaryBlack}`,
                                'boxShadow': showSavePreset
                                    ? `1px 1px 0px ${colors.primaryBlack}`
                                    : `2px 2px 0px ${colors.primaryBlack}`,
                                'backgroundColor': colors.primaryYellow,
                                'cursor': 'pointer',
                                'transition': 'all 0.15s',
                                'transform': showSavePreset
                                    ? 'translate(0.5px, 0.5px)'
                                    : 'none',
                                '&:active': {
                                    boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                    transform: 'translate(1px, 1px)',
                                },
                            }}>
                            <IconBolt
                                size={14}
                                stroke={2.5}
                                fill={colors.primaryWhite}
                                color={colors.primaryBlack}
                            />
                        </Box>
                        <HorizontalSortableList
                            items={presets}
                            onReorder={reorderPresets}>
                            {presets.map((preset) => (
                                <SortablePresetChip
                                    key={preset.id}
                                    id={preset.id}>
                                    <Chip
                                        label={preset.name}
                                        onClick={() => applyPreset(preset)}
                                        size="small"
                                        sx={{
                                            'height': 28,
                                            'fontSize': 12,
                                            'fontWeight': 600,
                                            'backgroundColor':
                                                colors.primaryWhite,
                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                            'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                            'borderRadius': '4px',
                                            'cursor': 'pointer',
                                            '& .MuiChip-label': { px: 0.75 },
                                            '&:active': {
                                                boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                                transform:
                                                    'translate(1px, 1px)',
                                            },
                                        }}
                                    />
                                </SortablePresetChip>
                            ))}
                        </HorizontalSortableList>
                        {presets.length === 0 && !showSavePreset && (
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: colors.primaryBrown,
                                }}>
                                No routines yet — tap ⚡ to save this one.
                            </Typography>
                        )}
                    </Box>
                    {/* New routine name + inline save, so the action bar keeps
                        logging the workout as its one job */}
                    {showSavePreset && (
                        <Box sx={{ mt: 1 }}>
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: colors.primaryBrown,
                                    mb: 0.5,
                                }}>
                                New routine name
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    value={presetName}
                                    onChange={(e) =>
                                        setPresetName(e.target.value)
                                    }
                                    size="small"
                                    fullWidth
                                    autoFocus
                                    placeholder="Push Day, Pull Day..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveAsPreset()
                                    }}
                                    sx={{
                                        ...fieldSx,
                                        '& .MuiInputBase-input': {
                                            fontSize: 13,
                                            py: 0.75,
                                        },
                                    }}
                                />
                                <Button
                                    onClick={saveAsPreset}
                                    disabled={
                                        !presetName.trim() || savingPreset
                                    }
                                    size="small"
                                    sx={{
                                        ...primaryButtonSx,
                                        minWidth: 'unset',
                                        px: 1.5,
                                        fontSize: 12,
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}>
                                    {savingPreset ? '...' : 'Save routine'}
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Box>
            )}

            {/* 3. Muscle groups */}
            <Box>
                <Typography sx={labelSx}>Muscle groups *</Typography>
                <MuscleGroupGrid
                    muscleGroups={muscleGroups}
                    selectedIds={selectedIds}
                    onToggle={toggleMuscle}
                />
            </Box>

            {/* 4. Exercises — search/create header + checklist with
                per-exercise weight/sets/reps */}
            <Box>
                <Typography sx={labelSx}>
                    Exercises
                    {exerciseEntries.length > 0 &&
                        ` (${exerciseEntries.length})`}
                </Typography>
                <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 0.5,
                            alignItems: 'center',
                            px: 1.5,
                            py: 1,
                            borderBottom: `1px solid ${colors.primaryBlack}`,
                        }}>
                        <TextField
                            value={exerciseSearch}
                            onChange={(e) => setExerciseSearch(e.target.value)}
                            size="small"
                            placeholder="Search or create exercise..."
                            sx={inlineSearchSx}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && exerciseSearch.trim())
                                    handleQuickAdd()
                            }}
                        />
                        {exerciseSearch.trim() && (
                            <Button
                                onClick={handleQuickAdd}
                                disabled={quickAddSaving}
                                size="small"
                                sx={{
                                    ...primaryButtonSx,
                                    minWidth: 'unset',
                                    px: 1.5,
                                    py: 0.5,
                                    fontSize: 11,
                                    whiteSpace: 'nowrap',
                                }}>
                                {quickAddSaving ? '...' : 'Create'}
                            </Button>
                        )}
                    </Box>

                    {allItems.length === 0 && !searchTerm && (
                        <Typography
                            sx={{
                                fontSize: 12,
                                color: colors.primaryBrown,
                                py: 1,
                                textAlign: 'center',
                            }}>
                            No exercises yet. Type above to create one.
                        </Typography>
                    )}

                    {allItems.map((item, i) => {
                        const isLast = i === allItems.length - 1
                        const isSelected = item.type === 'selected'
                        const ex = item.exercise
                        const name = isSelected
                            ? item.entry.exerciseName
                            : item.exercise.name
                        const isBodyweight = isSelected
                            ? item.entry.isBodyweight
                            : item.exercise.isBodyweight
                        const isExpanded =
                            isSelected && expandedEntries.has(item.index)
                        const toggleExpand = () => {
                            if (!isSelected) return
                            setExpandedEntries((prev) => {
                                const next = new Set(prev)
                                if (next.has(item.index))
                                    next.delete(item.index)
                                else next.add(item.index)
                                return next
                            })
                        }
                        const handleToggle = () => {
                            if (isSelected) removeExercise(item.index)
                            else addExercise(item.exercise)
                        }

                        return (
                            <Box
                                key={
                                    isSelected
                                        ? `selected-${item.entry.exerciseId}`
                                        : `browse-${item.exercise.id}`
                                }
                                sx={{
                                    backgroundColor: isSelected
                                        ? selectedBg
                                        : colors.primaryWhite,
                                    ...(!isLast && {
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    }),
                                }}>
                                <Box
                                    onClick={
                                        isSelected ? toggleExpand : handleToggle
                                    }
                                    sx={{
                                        'display': 'flex',
                                        'alignItems': 'center',
                                        'gap': 1,
                                        'padding': 1,
                                        'cursor': 'pointer',
                                        '&:active': { opacity: 0.7 },
                                    }}>
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={handleToggle}
                                        onClick={(e) => e.stopPropagation()}
                                        size="small"
                                        sx={exerciseCheckboxSx}
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
                                                    fontWeight: isSelected
                                                        ? 600
                                                        : 500,
                                                }}>
                                                {name}
                                            </Typography>
                                            {isBodyweight && <BodyweightChip />}
                                        </Box>
                                        <MuscleTagList
                                            groups={ex?.muscleGroups ?? []}
                                            selectedIds={selectedIds}
                                        />
                                    </Box>
                                    {isSelected &&
                                        (isExpanded ? (
                                            <IconChevronUp
                                                size={12}
                                                stroke={2}
                                                color={colors.primaryBrown}
                                                style={{ flexShrink: 0 }}
                                            />
                                        ) : (
                                            <IconChevronDown
                                                size={12}
                                                stroke={2}
                                                color={colors.primaryBrown}
                                                style={{ flexShrink: 0 }}
                                            />
                                        ))}
                                </Box>

                                {/* Expanded: weight / sets / reps */}
                                {isSelected && isExpanded && (
                                    <Box
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{ pl: '48px', pr: 1.5, pb: 1 }}>
                                        {!item.entry.expandedSets ? (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 1,
                                                    alignItems: 'center',
                                                }}>
                                                <CompactField
                                                    label="lbs"
                                                    value={item.entry.weightLbs}
                                                    onChange={(v) =>
                                                        updateEntry(
                                                            item.index,
                                                            {
                                                                weightLbs: v,
                                                            }
                                                        )
                                                    }
                                                    width={64}
                                                    htmlInputProps={{
                                                        min: 0,
                                                        step: 'any',
                                                    }}
                                                />
                                                <CompactField
                                                    label="sets"
                                                    value={
                                                        item.entry.sets || ''
                                                    }
                                                    onChange={(v) => {
                                                        const val = parseInt(
                                                            v,
                                                            10
                                                        )
                                                        updateEntry(
                                                            item.index,
                                                            {
                                                                sets: isNaN(val)
                                                                    ? 0
                                                                    : Math.max(
                                                                          0,
                                                                          val
                                                                      ),
                                                            }
                                                        )
                                                    }}
                                                    width={48}
                                                    htmlInputProps={{ min: 0 }}
                                                />
                                                <CompactField
                                                    label="reps"
                                                    value={item.entry.reps}
                                                    onChange={(v) =>
                                                        updateEntry(
                                                            item.index,
                                                            {
                                                                reps: v,
                                                            }
                                                        )
                                                    }
                                                    width={56}
                                                    htmlInputProps={{ min: 0 }}
                                                />
                                                {item.entry.sets > 1 && (
                                                    <TextLink
                                                        onClick={() =>
                                                            toggleExpandedSets(
                                                                item.index
                                                            )
                                                        }>
                                                        per set
                                                    </TextLink>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 0.5,
                                                }}>
                                                {item.entry.expandedSets.map(
                                                    (set, si) => (
                                                        <Box
                                                            key={si}
                                                            sx={{
                                                                display: 'flex',
                                                                gap: 0.75,
                                                                alignItems:
                                                                    'flex-start',
                                                            }}>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 11,
                                                                    color: colors.primaryBrown,
                                                                    width: 32,
                                                                    flexShrink: 0,
                                                                    pt: 0.5,
                                                                }}>
                                                                Set {si + 1}
                                                            </Typography>
                                                            <CompactField
                                                                label="reps"
                                                                value={set.reps}
                                                                onChange={(v) =>
                                                                    updateExpandedSet(
                                                                        item.index,
                                                                        si,
                                                                        v
                                                                    )
                                                                }
                                                                width={56}
                                                                htmlInputProps={{
                                                                    min: 0,
                                                                }}
                                                            />
                                                        </Box>
                                                    )
                                                )}
                                                <TextLink
                                                    onClick={() =>
                                                        toggleExpandedSets(
                                                            item.index
                                                        )
                                                    }
                                                    sx={{ mt: 0.25 }}>
                                                    collapse
                                                </TextLink>
                                            </Box>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )
                    })}
                </Box>
            </Box>

            {/* 5. Notes */}
            <Box>
                <Typography sx={labelSx}>Notes</Typography>
                <TextField
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Light session, felt good..."
                    sx={fieldSx}
                />
            </Box>
        </FormPage>
    )
}

// ── Small pieces ─────────────────────────────────────────────────────────────

/** Inline green text action ("per set", "collapse"). */
function TextLink({
    onClick,
    children,
    sx,
}: {
    onClick: () => void
    children: React.ReactNode
    sx?: Record<string, unknown>
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                'cursor': 'pointer',
                'fontSize': 11,
                'color': exerciseBorder,
                'fontWeight': 600,
                'whiteSpace': 'nowrap',
                '&:active': { opacity: 0.5 },
                ...sx,
            }}>
            {children}
        </Box>
    )
}

/** Compact labeled number field for set/rep/weight inputs. */
function CompactField({
    label,
    value,
    onChange,
    width,
    htmlInputProps,
}: {
    label: string
    value: string | number
    onChange: (value: string) => void
    width: number
    htmlInputProps?: Record<string, unknown>
}) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width }}>
            <Typography
                sx={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: colors.primaryBrown,
                    mb: 0.25,
                    lineHeight: 1,
                }}>
                {label}
            </Typography>
            <TextField
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                size="small"
                placeholder="–"
                slotProps={{
                    htmlInput: {
                        ...htmlInputProps,
                        style: { textAlign: 'center', padding: '4px 0' },
                    },
                }}
                sx={{ ...compactFieldSx, width }}
            />
        </Box>
    )
}

const compactFieldSx = {
    '& .MuiOutlinedInput-root': {
        'backgroundColor': colors.primaryWhite,
        'borderRadius': '3px',
        'fontSize': 13,
        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
        '& fieldset': {
            borderColor: colors.primaryBlack,
            borderWidth: 1,
        },
        '&:hover fieldset': {
            borderColor: colors.primaryBlack,
        },
        '&.Mui-focused': {
            'boxShadow': `2px 2px 0px ${selectedBorder}`,
            '& fieldset': {
                borderColor: selectedBorder,
                borderWidth: 1.5,
            },
        },
    },
    '& input[type=number]': {
        MozAppearance: 'textfield',
    },
    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
        {
            WebkitAppearance: 'none',
            margin: 0,
        },
}
