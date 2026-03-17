'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Exercise, MuscleGroupWithParents, Workout, WorkoutExercise } from '@/lib/health-types'
import { GROUP_TARGETS, getParents, isTarget } from '@/lib/health/muscle-groups'
import {
    fieldSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import { useRegisterFab } from 'providers/fab-provider'
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material'
import { IconCopy, IconDots, IconPencil, IconPlus, IconTrash, IconX, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import FormDrawer from 'components/form-drawer'

type WorkoutFormData = {
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

export default function ExercisePage() {
    const [workouts, setWorkouts] = useState<Workout[]>([])
    const [muscleGroups, setMuscleGroups] = useState<MuscleGroupWithParents[]>([])
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
    const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

    const fetchWorkouts = useCallback(() => {
        fetch('/api/health/workouts')
            .then((res) => res.json())
            .then(setWorkouts)
            .catch((err) => console.error('Failed to fetch workouts:', err))
    }, [])

    const fetchExercises = useCallback(() => {
        fetch('/api/health/exercises')
            .then((res) => res.json())
            .then(setExercises)
            .catch((err) => console.error('Failed to fetch exercises:', err))
    }, [])

    useEffect(() => {
        Promise.all([
            fetch('/api/health/muscle-groups').then((r) => r.json()),
            fetch('/api/health/workouts').then((r) => r.json()),
            fetch('/api/health/exercises').then((r) => r.json()),
        ])
            .then(([mg, w, ex]) => {
                setMuscleGroups(mg)
                setWorkouts(w)
                setExercises(ex)
            })
            .catch((err) => console.error('Failed to load:', err))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = useCallback(
        async (data: WorkoutFormData) => {
            const isEdit = editingWorkout !== null && editingWorkout.id !== -1
            const url = isEdit
                ? `/api/health/workouts/${editingWorkout!.id}`
                : '/api/health/workouts'
            const method = isEdit ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                setDrawerOpen(false)
                setEditingWorkout(null)
                fetchWorkouts()
                fetchExercises() // refresh in case quick-add was used
            }
        },
        [editingWorkout, fetchWorkouts, fetchExercises]
    )

    const handleDelete = useCallback(
        async (id: number) => {
            const res = await fetch(`/api/health/workouts/${id}`, { method: 'DELETE' })
            if (res.ok) {
                setMenuOpenId(null)
                fetchWorkouts()
            }
        },
        [fetchWorkouts]
    )

    const handleDuplicate = useCallback(
        (workout: Workout) => {
            setEditingWorkout(null)
            setDrawerOpen(true)
            // Pre-fill handled via editingWorkout with sentinel id=-1
            setTimeout(() => {
                setEditingWorkout({
                    ...workout,
                    id: -1, // sentinel: duplicate mode
                    date: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` })(),
                })
            }, 0)
        },
        []
    )

    const openAdd = useCallback(() => {
        setEditingWorkout(null)
        setDrawerOpen(true)
    }, [])

    const openEdit = useCallback((workout: Workout) => {
        setEditingWorkout(workout)
        setMenuOpenId(null)
        setDrawerOpen(true)
    }, [])

    const fabCallback = useCallback(() => openAdd(), [openAdd])
    useRegisterFab(fabCallback)

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ color: colors.primaryYellow }} />
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: 600,
                paddingX: 2,
                paddingY: 2,
                gap: 2,
            }}>
            {/* Header */}
            <Typography
                sx={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: 'var(--font-serif)',
                }}>
                Workouts
            </Typography>

            {/* Workout list */}
            {workouts.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                    No workouts logged yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {workouts.map((workout) => {
                        const parentGroups = workout.muscleGroups.filter((mg) => !isTarget(mg.name))
                        const targets = workout.muscleGroups.filter((mg) => isTarget(mg.name))
                        const d = new Date(workout.date + 'T00:00:00')
                        const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
                        const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                        return (
                        <Box
                            key={workout.id}
                            sx={{
                                display: 'flex',
                                gap: 0,
                                ...cardSx,
                                padding: 0,
                                overflow: 'hidden',
                                minHeight: 76,
                            }}>
                            {/* Date cards — left side */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 0.5,
                                    minWidth: 56,
                                    px: 1,
                                }}>
                                <Box sx={{
                                    px: 0.75,
                                    py: 0.25,
                                    backgroundColor: colors.primaryYellow,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    borderRadius: '3px',
                                    textAlign: 'center',
                                }}>
                                    <Typography sx={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1 }}>
                                        {weekday}
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    px: 0.75,
                                    py: 0.25,
                                    backgroundColor: colors.primaryWhite,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    borderRadius: '3px',
                                    textAlign: 'center',
                                }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                                        {monthDay}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Content */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75, padding: '10px 12px' }}>
                                {/* Parent groups */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {parentGroups.map((mg) => (
                                        <Chip
                                            key={mg.id}
                                            label={mg.name}
                                            size="small"
                                            sx={{
                                                'height': 22,
                                                'fontSize': 11,
                                                'fontWeight': 700,
                                                'backgroundColor': selectedBg,
                                                'border': `1px solid ${selectedBorder}`,
                                                'boxShadow': `1px 1px 0px ${selectedBorder}`,
                                                'borderRadius': '3px',
                                                'color': colors.primaryBlack,
                                                '& .MuiChip-label': { px: 0.75 },
                                            }}
                                        />
                                    ))}
                                </Box>

                                {/* Target muscles */}
                                {targets.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {targets.map((mg) => (
                                            <Chip
                                                key={mg.id}
                                                label={mg.name}
                                                size="small"
                                                sx={{
                                                    'height': 20,
                                                    'fontSize': 11,
                                                    'fontWeight': 500,
                                                    'backgroundColor': selectedTargetBg,
                                                    'border': `1px solid ${selectedTargetBorder}`,
                                                    'boxShadow': `1px 1px 0px ${selectedTargetBorder}`,
                                                    'borderRadius': '3px',
                                                    'color': colors.primaryBlack,
                                                    '& .MuiChip-label': { px: 0.75 },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}

                                {/* Notes */}
                                {workout.notes && (
                                    <Typography
                                        sx={{
                                            fontSize: 12,
                                            color: colors.primaryBrown,
                                            fontStyle: 'italic',
                                        }}>
                                        {workout.notes}
                                    </Typography>
                                )}
                            </Box>

                            {/* Actions menu */}
                            <Box sx={{ position: 'relative', pt: 0.75, pr: 0.75 }}>
                                <Box
                                    onClick={() => setMenuOpenId(menuOpenId === workout.id ? null : workout.id)}
                                    sx={{
                                        'cursor': 'pointer',
                                        'p': 0.5,
                                        'borderRadius': '4px',
                                        '&:active': { backgroundColor: `${colors.primaryYellow}40` },
                                    }}>
                                    <IconDots size={18} stroke={2} color={colors.primaryBrown} />
                                </Box>
                                {menuOpenId === workout.id && (
                                    <>
                                        <Box
                                            onClick={() => setMenuOpenId(null)}
                                            sx={{ position: 'fixed', inset: 0, zIndex: 10 }}
                                        />
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                zIndex: 11,
                                                ...cardSx,
                                                backgroundColor: colors.primaryWhite,
                                                minWidth: 140,
                                                py: 0.5,
                                            }}>
                                            <Box
                                                onClick={() => openEdit(workout)}
                                                sx={{
                                                    'display': 'flex',
                                                    'alignItems': 'center',
                                                    'gap': 1,
                                                    'px': 1.5,
                                                    'py': 0.75,
                                                    'fontSize': 13,
                                                    'cursor': 'pointer',
                                                    '&:hover': { backgroundColor: `${colors.primaryYellow}30` },
                                                }}>
                                                <IconPencil size={14} /> Edit
                                            </Box>
                                            <Box
                                                onClick={() => handleDuplicate(workout)}
                                                sx={{
                                                    'display': 'flex',
                                                    'alignItems': 'center',
                                                    'gap': 1,
                                                    'px': 1.5,
                                                    'py': 0.75,
                                                    'fontSize': 13,
                                                    'cursor': 'pointer',
                                                    '&:hover': { backgroundColor: `${colors.primaryYellow}30` },
                                                }}>
                                                <IconCopy size={14} /> Duplicate
                                            </Box>
                                            <Box
                                                onClick={() => handleDelete(workout.id)}
                                                sx={{
                                                    'display': 'flex',
                                                    'alignItems': 'center',
                                                    'gap': 1,
                                                    'px': 1.5,
                                                    'py': 0.75,
                                                    'fontSize': 13,
                                                    'cursor': 'pointer',
                                                    'color': colors.primaryRed,
                                                    '&:hover': { backgroundColor: `${colors.primaryRed}15` },
                                                }}>
                                                <IconTrash size={14} /> Delete
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>
                        </Box>
                    )})}
                </Box>
            )}

            {/* Workout form drawer */}
            <WorkoutFormDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false)
                    setEditingWorkout(null)
                }}
                onSave={handleSave}
                muscleGroups={muscleGroups}
                exercises={exercises}
                editingWorkout={editingWorkout}
                onExerciseCreated={fetchExercises}
            />
        </Box>
    )
}

// ── Workout Form Drawer ──────────────────────────────────────────────────────

type WorkoutFormDrawerProps = {
    open: boolean
    onClose: () => void
    onSave: (data: WorkoutFormData) => Promise<void>
    muscleGroups: MuscleGroupWithParents[]
    exercises: Exercise[]
    editingWorkout: Workout | null
    onExerciseCreated: () => void
}

// Grid layout for muscle group selection
type GridRow =
    | { type: 'simple'; groups: string[]; columns: number }
    | { type: 'custom'; id: string }

const GRID_ROWS: GridRow[] = [
    { type: 'custom', id: 'back-row' },
    { type: 'simple', groups: ['Chest', 'Shoulders', 'Triceps'], columns: 3 },
    { type: 'simple', groups: ['Legs'], columns: 1 },
    { type: 'simple', groups: ['Core', 'Cardio'], columns: 2 },
]

// Selected state colors — warm palette
const selectedBorder = '#b57b00'
const selectedBg = '#fff8e1'
const selectedTargetBg = '#e8c196'
const selectedTargetBorder = '#a0612a'

// Exercise colors — purple palette
const exerciseBg = '#f3e8ff'
const exerciseBorder = '#7c3aed'

function MuscleGroupCard({
    groupName,
    muscleGroups,
    selectedIds,
    onToggle,
    sx: sxOverride,
}: {
    groupName: string
    muscleGroups: MuscleGroupWithParents[]
    selectedIds: Set<number>
    onToggle: (name: string, id: number) => void
    sx?: Record<string, unknown>
}) {
    const group = muscleGroups.find((g) => g.name === groupName)
    if (!group) return null

    const isGroupSelected = selectedIds.has(Number(group.id))
    const targets = GROUP_TARGETS[groupName] || []

    return (
        <Box
            sx={{
                'display': 'flex',
                'flexDirection': 'column',
                'gap': 1,
                'padding': '10px',
                'backgroundColor': isGroupSelected ? selectedBg : colors.primaryWhite,
                'border': `1.5px solid ${isGroupSelected ? selectedBorder : colors.primaryBlack}`,
                'boxShadow': `2px 2px 0px ${isGroupSelected ? selectedBorder : colors.primaryBlack}`,
                'borderRadius': '4px',
                'cursor': 'pointer',
                'transition': 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s',
                '&:active': {
                    boxShadow: `1px 1px 0px ${isGroupSelected ? selectedBorder : colors.primaryBlack}`,
                    transform: 'translate(1px, 1px)',
                },
                ...sxOverride,
            }}
            onClick={() => onToggle(groupName, group.id)}>
            <Typography
                sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: colors.primaryBlack,
                }}>
                {groupName}
            </Typography>

            {targets.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {targets.map((targetName) => {
                        const target = muscleGroups.find((g) => g.name === targetName)
                        if (!target) return null
                        const isTargetSelected = selectedIds.has(Number(target.id))
                        return (
                            <Chip
                                key={targetName}
                                label={targetName}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onToggle(targetName, target.id)
                                }}
                                size="small"
                                sx={{
                                    'height': 26,
                                    'fontSize': 11,
                                    'fontWeight': isTargetSelected ? 700 : 400,
                                    'backgroundColor': isTargetSelected
                                        ? selectedTargetBg
                                        : 'transparent',
                                    'border': `1px solid ${isTargetSelected ? selectedTargetBorder : `${colors.primaryBlack}25`}`,
                                    'boxShadow': isTargetSelected
                                        ? `1px 1px 0px ${selectedTargetBorder}`
                                        : 'none',
                                    'borderRadius': '3px',
                                    'cursor': 'pointer',
                                    'color': colors.primaryBlack,
                                    '& .MuiChip-label': { px: 1 },
                                    'transition': 'all 0.12s',
                                }}
                            />
                        )
                    })}
                </Box>
            )}
        </Box>
    )
}

// ── Workout exercise entry in the form ───────────────────────────────────────

type FormExerciseEntry = {
    exerciseId: number
    exerciseName: string
    isBodyweight: boolean
    sets: number
    reps: string       // string for input flexibility
    weightLbs: string  // string for input flexibility — lives on exercise, not per-set
    expandedSets: { reps: string }[] | null  // null = collapsed (uniform)
}

function defaultEntry(exercise: Exercise): FormExerciseEntry {
    return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        isBodyweight: exercise.isBodyweight,
        sets: 3,
        reps: '',
        weightLbs: '',
        expandedSets: null,
    }
}

function entryFromWorkoutExercise(we: WorkoutExercise): FormExerciseEntry {
    const sets = we.sets
    const weightStr = we.weightLbs != null ? we.weightLbs.toString() : ''

    if (sets.length === 0) {
        return {
            exerciseId: we.exercise.id,
            exerciseName: we.exercise.name,
            isBodyweight: we.exercise.isBodyweight,
            sets: 0,
            reps: '',
            weightLbs: weightStr,
            expandedSets: null,
        }
    }

    // Check if all sets have the same reps
    const allSame = sets.every((s) => s.reps === sets[0].reps)

    if (allSame) {
        return {
            exerciseId: we.exercise.id,
            exerciseName: we.exercise.name,
            isBodyweight: we.exercise.isBodyweight,
            sets: sets.length,
            reps: sets[0].reps?.toString() ?? '',
            weightLbs: weightStr,
            expandedSets: null,
        }
    }

    // Different reps per set — expand
    return {
        exerciseId: we.exercise.id,
        exerciseName: we.exercise.name,
        isBodyweight: we.exercise.isBodyweight,
        sets: sets.length,
        reps: sets[0].reps?.toString() ?? '',
        weightLbs: weightStr,
        expandedSets: sets.map((s) => ({
            reps: s.reps?.toString() ?? '',
        })),
    }
}

function WorkoutFormDrawer({
    open,
    onClose,
    onSave,
    muscleGroups,
    exercises,
    editingWorkout,
    onExerciseCreated,
}: WorkoutFormDrawerProps) {
    const isEdit = editingWorkout !== null && editingWorkout.id !== -1
    const isDuplicate = editingWorkout !== null && editingWorkout.id === -1

    const [date, setDate] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    })
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    // Exercise entries in the workout
    const [exerciseEntries, setExerciseEntries] = useState<FormExerciseEntry[]>([])
    const [showExercisePicker, setShowExercisePicker] = useState(false)
    const [exerciseSearch, setExerciseSearch] = useState('')

    // Quick-add exercise state
    const [quickAddName, setQuickAddName] = useState('')
    const [quickAddSaving, setQuickAddSaving] = useState(false)

    // Reset form when opened
    useEffect(() => {
        if (open) {
            if (editingWorkout) {
                setDate(editingWorkout.date)
                setSelectedIds(new Set(editingWorkout.muscleGroups.map((mg) => Number(mg.id))))
                setNotes(editingWorkout.notes || '')
                setExerciseEntries(
                    editingWorkout.exercises.map(entryFromWorkoutExercise)
                )
            } else {
                const now = new Date()
                setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
                setSelectedIds(new Set())
                setNotes('')
                setExerciseEntries([])
            }
            setShowExercisePicker(false)
            setExerciseSearch('')
            setQuickAddName('')
        }
    }, [open, editingWorkout])

    const toggleMuscle = useCallback(
        (name: string, id: number) => {
            const numId = Number(id)
            setSelectedIds((prev) => {
                const next = new Set(prev)
                if (next.has(numId)) {
                    next.delete(numId)
                    if (!isTarget(name)) {
                        const targets = GROUP_TARGETS[name] || []
                        for (const t of targets) {
                            const tid = muscleGroups.find((g) => g.name === t)?.id
                            if (tid) next.delete(Number(tid))
                        }
                    }
                } else {
                    next.add(numId)
                    if (isTarget(name)) {
                        const parents = getParents(name)
                        for (const p of parents) {
                            const pid = muscleGroups.find((g) => g.name === p)?.id
                            if (pid) next.add(Number(pid))
                        }
                    }
                }
                return next
            })
        },
        [muscleGroups]
    )

    // Add an exercise to the workout
    const addExercise = useCallback(
        (exercise: Exercise) => {
            // Don't add duplicates
            if (exerciseEntries.some((e) => e.exerciseId === exercise.id)) return

            setExerciseEntries((prev) => [...prev, defaultEntry(exercise)])

            // One-time auto-add the exercise's muscle groups
            setSelectedIds((prev) => {
                const next = new Set(prev)
                for (const mg of exercise.muscleGroups) {
                    next.add(mg.id)
                    // Also add parent groups for targets
                    if (isTarget(mg.name)) {
                        const parents = getParents(mg.name)
                        for (const p of parents) {
                            const pid = muscleGroups.find((g) => g.name === p)?.id
                            if (pid) next.add(Number(pid))
                        }
                    }
                }
                return next
            })

            setShowExercisePicker(false)
            setExerciseSearch('')
        },
        [exerciseEntries, muscleGroups]
    )

    const removeExercise = useCallback((index: number) => {
        setExerciseEntries((prev) => prev.filter((_, i) => i !== index))
    }, [])

    const updateEntry = useCallback((index: number, updates: Partial<FormExerciseEntry>) => {
        setExerciseEntries((prev) =>
            prev.map((e, i) => (i === index ? { ...e, ...updates } : e))
        )
    }, [])

    const moveExercise = useCallback((index: number, direction: -1 | 1) => {
        setExerciseEntries((prev) => {
            const next = [...prev]
            const targetIndex = index + direction
            if (targetIndex < 0 || targetIndex >= next.length) return prev
            ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
            return next
        })
    }, [])

    // Toggle expanded sets view
    const toggleExpandedSets = useCallback((index: number) => {
        setExerciseEntries((prev) =>
            prev.map((e, i) => {
                if (i !== index) return e
                if (e.expandedSets) {
                    // Collapse — keep first set values as the summary
                    return { ...e, expandedSets: null }
                }
                // Expand — create individual set entries from current reps
                const expanded = Array.from({ length: e.sets || 1 }, () => ({
                    reps: e.reps,
                }))
                return { ...e, expandedSets: expanded }
            })
        )
    }, [])

    const updateExpandedSet = useCallback(
        (entryIndex: number, setIndex: number, value: string) => {
            setExerciseEntries((prev) =>
                prev.map((e, i) => {
                    if (i !== entryIndex || !e.expandedSets) return e
                    const updated = e.expandedSets.map((s, si) =>
                        si === setIndex ? { reps: value } : s
                    )
                    return { ...e, expandedSets: updated }
                })
            )
        },
        []
    )

    // Quick-add a new exercise
    const handleQuickAdd = useCallback(async () => {
        if (!quickAddName.trim()) return
        setQuickAddSaving(true)
        try {
            // Create exercise with currently selected muscle groups
            const mgIds = Array.from(selectedIds)
            if (mgIds.length === 0) return

            const res = await fetch('/api/health/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: quickAddName.trim(),
                    muscleGroupIds: mgIds,
                }),
            })

            if (res.ok) {
                const newExercise: Exercise = await res.json()
                onExerciseCreated()
                addExercise(newExercise)
                setQuickAddName('')
            }
        } finally {
            setQuickAddSaving(false)
        }
    }, [quickAddName, selectedIds, onExerciseCreated, addExercise])

    // Filter exercises for picker
    const filteredExercises = useMemo(() => {
        const alreadyAdded = new Set(exerciseEntries.map((e) => e.exerciseId))
        let filtered = exercises.filter((e) => !alreadyAdded.has(e.id))

        if (exerciseSearch.trim()) {
            const search = exerciseSearch.toLowerCase()
            filtered = filtered.filter((e) => e.name.toLowerCase().includes(search))
        }

        return filtered
    }, [exercises, exerciseEntries, exerciseSearch])

    const handleSubmit = useCallback(async () => {
        if (selectedIds.size === 0) return
        setSaving(true)
        try {
            const data: WorkoutFormData = {
                date,
                muscleGroupIds: Array.from(selectedIds),
                notes,
            }

            if (exerciseEntries.length > 0) {
                data.exercises = exerciseEntries.map((entry, index) => {
                    const parseWeight = (v: string) => v !== '' ? parseFloat(v) : undefined
                    const parseReps = (v: string) => v !== '' ? parseInt(v, 10) : undefined

                    const sets: { reps?: number }[] = []

                    if (entry.expandedSets) {
                        for (const s of entry.expandedSets) {
                            sets.push({ reps: parseReps(s.reps) })
                        }
                    } else if (entry.sets > 0) {
                        const r = parseReps(entry.reps)
                        for (let i = 0; i < entry.sets; i++) {
                            sets.push({ reps: r })
                        }
                    }

                    return {
                        exerciseId: entry.exerciseId,
                        sortOrder: index,
                        weightLbs: parseWeight(entry.weightLbs),
                        sets: sets.length > 0 ? sets : undefined,
                    }
                })
            }

            await onSave(data)
        } finally {
            setSaving(false)
        }
    }, [date, selectedIds, notes, exerciseEntries, onSave])

    return (
        <FormDrawer open={open} onClose={onClose}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                }}>
                {/* Header */}
                <Box
                    sx={{
                        px: 2.5,
                        py: 2,
                        borderBottom: `1px solid ${colors.primaryBlack}20`,
                    }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                        {isEdit ? 'Edit Workout' : isDuplicate ? 'Duplicate Workout' : 'Log Workout'}
                    </Typography>
                </Box>

                {/* Form body */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        px: 2.5,
                        py: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2.5,
                    }}>
                    {/* Muscle group grid */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {GRID_ROWS.map((row, rowIdx) => {
                            if (row.type === 'custom' && row.id === 'back-row') {
                                return (
                                    <Box
                                        key={rowIdx}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr',
                                            gap: 1,
                                        }}>
                                        <MuscleGroupCard
                                            groupName="Back"
                                            muscleGroups={muscleGroups}
                                            selectedIds={selectedIds}
                                            onToggle={toggleMuscle}
                                        />
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: '100%' }}>
                                            <MuscleGroupCard
                                                groupName="Biceps"
                                                muscleGroups={muscleGroups}
                                                selectedIds={selectedIds}
                                                onToggle={toggleMuscle}
                                                sx={{ flex: 1 }}
                                            />
                                            <MuscleGroupCard
                                                groupName="Forearms"
                                                muscleGroups={muscleGroups}
                                                selectedIds={selectedIds}
                                                onToggle={toggleMuscle}
                                                sx={{ flex: 1 }}
                                            />
                                        </Box>
                                    </Box>
                                )
                            }
                            if (row.type !== 'simple') return null
                            return (
                                <Box
                                    key={rowIdx}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${row.columns}, 1fr)`,
                                        gap: 1,
                                    }}>
                                    {row.groups.map((groupName) => (
                                        <MuscleGroupCard
                                            key={groupName}
                                            groupName={groupName}
                                            muscleGroups={muscleGroups}
                                            selectedIds={selectedIds}
                                            onToggle={toggleMuscle}
                                        />
                                    ))}
                                </Box>
                            )
                        })}
                    </Box>

                    {/* Exercises section */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography sx={labelSx}>Exercises (optional)</Typography>

                        {/* Existing exercise entries */}
                        {exerciseEntries.map((entry, index) => (
                            <Box
                                key={`${entry.exerciseId}-${index}`}
                                sx={{
                                    padding: '10px 12px',
                                    backgroundColor: exerciseBg,
                                    border: `1.5px solid ${exerciseBorder}`,
                                    boxShadow: `2px 2px 0px ${exerciseBorder}`,
                                    borderRadius: '4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                }}>
                                {/* Exercise header */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                                            {entry.exerciseName}
                                        </Typography>
                                        {entry.isBodyweight && (
                                            <Chip
                                                label="BW"
                                                size="small"
                                                sx={{
                                                    'height': 18,
                                                    'fontSize': 9,
                                                    'fontWeight': 700,
                                                    'backgroundColor': '#e3f2fd',
                                                    'border': '1px solid #1565c0',
                                                    'borderRadius': '3px',
                                                    '& .MuiChip-label': { px: 0.5 },
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                                        {index > 0 && (
                                            <Box
                                                onClick={() => moveExercise(index, -1)}
                                                sx={{ 'cursor': 'pointer', 'p': 0.25, '&:active': { opacity: 0.5 } }}>
                                                <IconChevronUp size={14} stroke={2} />
                                            </Box>
                                        )}
                                        {index < exerciseEntries.length - 1 && (
                                            <Box
                                                onClick={() => moveExercise(index, 1)}
                                                sx={{ 'cursor': 'pointer', 'p': 0.25, '&:active': { opacity: 0.5 } }}>
                                                <IconChevronDown size={14} stroke={2} />
                                            </Box>
                                        )}
                                        <Box
                                            onClick={() => removeExercise(index)}
                                            sx={{
                                                'cursor': 'pointer',
                                                'p': 0.25,
                                                'ml': 0.5,
                                                '&:active': { opacity: 0.5 },
                                            }}>
                                            <IconX size={14} stroke={2} color={colors.primaryRed} />
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Set/rep/weight inputs — each field independent */}
                                {!entry.expandedSets ? (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                                            <CompactField
                                                label="sets"
                                                type="number"
                                                value={entry.sets || ''}
                                                onChange={(v) => {
                                                    const val = parseInt(v, 10)
                                                    updateEntry(index, { sets: isNaN(val) ? 0 : Math.max(0, val) })
                                                }}
                                                width={48}
                                                placeholder="3"
                                                htmlInputProps={{ min: 0 }}
                                            />
                                            <CompactField
                                                label="reps"
                                                type="number"
                                                value={entry.reps}
                                                onChange={(v) => updateEntry(index, { reps: v })}
                                                width={56}
                                                placeholder="–"
                                                htmlInputProps={{ min: 0 }}
                                            />
                                            <CompactField
                                                label="lbs"
                                                type="number"
                                                value={entry.weightLbs}
                                                onChange={(v) => updateEntry(index, { weightLbs: v })}
                                                width={64}
                                                placeholder="–"
                                                htmlInputProps={{ min: 0, step: 'any' }}
                                            />
                                            {entry.sets > 1 && (
                                                <Box
                                                    onClick={() => toggleExpandedSets(index)}
                                                    sx={{
                                                        'cursor': 'pointer',
                                                        'fontSize': 11,
                                                        'color': exerciseBorder,
                                                        'fontWeight': 600,
                                                        'whiteSpace': 'nowrap',
                                                        '&:active': { opacity: 0.5 },
                                                    }}>
                                                    per set
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {entry.expandedSets.map((set, si) => (
                                            <Box key={si} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                                                <Typography sx={{ fontSize: 11, color: colors.primaryBrown, width: 32, flexShrink: 0, pt: 0.5 }}>
                                                    Set {si + 1}
                                                </Typography>
                                                <CompactField
                                                    label="reps"
                                                    type="number"
                                                    value={set.reps}
                                                    onChange={(v) => updateExpandedSet(index, si, v)}
                                                    width={56}
                                                    placeholder="–"
                                                    htmlInputProps={{ min: 0 }}
                                                />
                                            </Box>
                                        ))}
                                        <Box
                                            onClick={() => toggleExpandedSets(index)}
                                            sx={{
                                                'cursor': 'pointer',
                                                'fontSize': 11,
                                                'color': exerciseBorder,
                                                'fontWeight': 600,
                                                'mt': 0.25,
                                                '&:active': { opacity: 0.5 },
                                            }}>
                                            collapse
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        ))}

                        {/* Add exercise button / picker */}
                        {!showExercisePicker ? (
                            <Box
                                onClick={() => setShowExercisePicker(true)}
                                sx={{
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'gap': 0.75,
                                    'padding': '8px 12px',
                                    'border': `1.5px dashed ${colors.primaryBlack}30`,
                                    'borderRadius': '4px',
                                    'cursor': 'pointer',
                                    'color': colors.primaryBrown,
                                    'fontSize': 13,
                                    '&:active': { backgroundColor: `${colors.primaryYellow}20` },
                                }}>
                                <IconPlus size={14} stroke={2} />
                                Add Exercise
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                    padding: '10px 12px',
                                    border: `1.5px solid ${colors.primaryBlack}`,
                                    borderRadius: '4px',
                                    backgroundColor: colors.primaryWhite,
                                }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                                        Pick Exercise
                                    </Typography>
                                    <Box
                                        onClick={() => {
                                            setShowExercisePicker(false)
                                            setExerciseSearch('')
                                            setQuickAddName('')
                                        }}
                                        sx={{ 'cursor': 'pointer', 'p': 0.25, '&:active': { opacity: 0.5 } }}>
                                        <IconX size={14} stroke={2} />
                                    </Box>
                                </Box>

                                <TextField
                                    value={exerciseSearch}
                                    onChange={(e) => setExerciseSearch(e.target.value)}
                                    size="small"
                                    placeholder="Search exercises..."
                                    autoFocus
                                    sx={{ ...fieldSx, '& .MuiInputBase-input': { py: 0.5, fontSize: 13 } }}
                                />

                                {/* Exercise list */}
                                <Box sx={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                    {filteredExercises.length === 0 && !exerciseSearch.trim() && (
                                        <Typography sx={{ fontSize: 12, color: colors.primaryBrown, py: 1, textAlign: 'center' }}>
                                            No exercises yet. Create one below.
                                        </Typography>
                                    )}
                                    {filteredExercises.length === 0 && exerciseSearch.trim() && (
                                        <Typography sx={{ fontSize: 12, color: colors.primaryBrown, py: 1, textAlign: 'center' }}>
                                            No matches. Create it below.
                                        </Typography>
                                    )}
                                    {filteredExercises.map((ex) => (
                                        <Box
                                            key={ex.id}
                                            onClick={() => addExercise(ex)}
                                            sx={{
                                                'display': 'flex',
                                                'alignItems': 'center',
                                                'gap': 0.75,
                                                'px': 1,
                                                'py': 0.5,
                                                'borderRadius': '3px',
                                                'cursor': 'pointer',
                                                'fontSize': 13,
                                                '&:hover': { backgroundColor: `${exerciseBorder}15` },
                                                '&:active': { backgroundColor: `${exerciseBorder}25` },
                                            }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                                                {ex.name}
                                            </Typography>
                                            {ex.isBodyweight && (
                                                <Chip
                                                    label="BW"
                                                    size="small"
                                                    sx={{
                                                        'height': 16,
                                                        'fontSize': 9,
                                                        'fontWeight': 700,
                                                        'backgroundColor': '#e3f2fd',
                                                        'border': '1px solid #1565c0',
                                                        'borderRadius': '2px',
                                                        '& .MuiChip-label': { px: 0.5 },
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    ))}
                                </Box>

                                {/* Quick-add */}
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', borderTop: `1px solid ${colors.primaryBlack}15`, pt: 0.75 }}>
                                    <TextField
                                        value={quickAddName}
                                        onChange={(e) => setQuickAddName(e.target.value)}
                                        size="small"
                                        placeholder="New exercise name..."
                                        sx={{ ...fieldSx, flex: 1, '& .MuiInputBase-input': { py: 0.5, fontSize: 12 } }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleQuickAdd()
                                        }}
                                    />
                                    <Button
                                        onClick={handleQuickAdd}
                                        disabled={!quickAddName.trim() || quickAddSaving || selectedIds.size === 0}
                                        size="small"
                                        sx={{
                                            ...primaryButtonSx,
                                            minWidth: 'unset',
                                            px: 1.5,
                                            py: 0.5,
                                            fontSize: 11,
                                        }}>
                                        {quickAddSaving ? '...' : 'Add'}
                                    </Button>
                                </Box>
                                {selectedIds.size === 0 && (
                                    <Typography sx={{ fontSize: 11, color: colors.primaryBrown }}>
                                        Select muscle groups first to quick-add an exercise
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>

                    {/* Date */}
                    <Box>
                        <Typography sx={labelSx}>Date</Typography>
                        <TextField
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            size="small"
                            sx={{ ...fieldSx, maxWidth: 180 }}
                        />
                    </Box>

                    {/* Notes */}
                    <Box>
                        <Typography sx={labelSx}>Notes (optional)</Typography>
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
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 2,
                        px: 2.5,
                        py: 2,
                        borderTop: `1px solid ${colors.primaryBlack}20`,
                        paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
                    }}>
                    <Button
                        onClick={onClose}
                        disabled={saving}
                        size="large"
                        sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={selectedIds.size === 0 || saving}
                        size="large"
                        sx={primaryButtonSx}>
                        {saving ? 'Saving...' : isEdit ? 'Save' : 'Log'}
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
    )
}

// ── Compact labeled field for set/rep/weight inputs ──────────────────────────

function CompactField({
    label,
    type,
    value,
    onChange,
    width,
    placeholder,
    htmlInputProps,
}: {
    label: string
    type: string
    value: string | number
    onChange: (value: string) => void
    width: number
    placeholder?: string
    htmlInputProps?: Record<string, unknown>
}) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width }}>
            <TextField
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                size="small"
                placeholder={placeholder}
                slotProps={{
                    htmlInput: {
                        ...htmlInputProps,
                        style: { textAlign: 'center', padding: '4px 0' },
                    },
                }}
                sx={{ ...compactFieldSx, width }}
            />
            <Typography sx={{ fontSize: 9, color: colors.primaryBrown, mt: 0.25, lineHeight: 1 }}>
                {label}
            </Typography>
        </Box>
    )
}

// Compact field styling for inline set/rep/weight inputs
const compactFieldSx = {
    '& .MuiOutlinedInput-root': {
        'backgroundColor': colors.primaryWhite,
        'borderRadius': '3px',
        'fontSize': 13,
        '& fieldset': {
            borderColor: `${colors.primaryBlack}30`,
            borderWidth: 1,
        },
        '&:hover fieldset': {
            borderColor: colors.primaryBlack,
        },
        '&.Mui-focused fieldset': {
            borderColor: exerciseBorder,
            borderWidth: 1.5,
        },
    },
    '& input[type=number]': {
        MozAppearance: 'textfield',
    },
    '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
    },
}
