'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Exercise, MuscleGroupWithParents, Workout, WorkoutExercise, WorkoutPreset } from '@/lib/health-types'
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
import { IconPlus, IconX, IconChevronDown, IconChevronUp, IconBolt } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import FormDrawer from 'components/form-drawer'
import { WorkoutDetailDrawer } from 'components/health/workout-detail-drawer'
import { SwipeableRow } from 'components/receipts/swipeable-row'

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
    const [presets, setPresets] = useState<WorkoutPreset[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
    const [detailWorkout, setDetailWorkout] = useState<Workout | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [applyingPreset, setApplyingPreset] = useState<number | null>(null)
    const [presetDrawerOpen, setPresetDrawerOpen] = useState(false)
    const [editingPreset, setEditingPreset] = useState<WorkoutPreset | null>(null)

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

    const fetchPresets = useCallback(() => {
        fetch('/api/health/presets?type=workout')
            .then((res) => res.json())
            .then(setPresets)
            .catch((err) => console.error('Failed to fetch presets:', err))
    }, [])

    useEffect(() => {
        Promise.all([
            fetch('/api/health/muscle-groups').then((r) => r.json()),
            fetch('/api/health/workouts').then((r) => r.json()),
            fetch('/api/health/exercises').then((r) => r.json()),
            fetch('/api/health/presets?type=workout').then((r) => r.json()),
        ])
            .then(([mg, w, ex, p]) => {
                setMuscleGroups(mg)
                setWorkouts(w)
                setExercises(ex)
                setPresets(p)
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

    const applyPreset = useCallback(
        async (presetId: number) => {
            setApplyingPreset(presetId)
            try {
                const today = new Date()
                const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                const res = await fetch(`/api/health/presets/${presetId}/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date }),
                })
                if (res.ok) {
                    fetchWorkouts()
                }
            } catch (err) {
                console.error('Failed to apply preset:', err)
            } finally {
                setApplyingPreset(null)
            }
        },
        [fetchWorkouts]
    )

    const openAdd = useCallback(() => {
        setEditingWorkout(null)
        setDrawerOpen(true)
    }, [])

    const openEdit = useCallback((workout: Workout) => {
        setEditingWorkout(workout)
        setDrawerOpen(true)
    }, [])

    const openDetail = useCallback((workout: Workout) => {
        setDetailWorkout(workout)
        setDetailOpen(true)
    }, [])

    // For each workout + muscle group, compute days since the previous time that group was worked
    // Returns Map<workoutId, Map<muscleGroupName, daysSincePrevious>>
    const daysSincePrevMap = useMemo(() => {
        const result = new Map<number, Map<string, number>>()
        // Iterate oldest-first, tracking last-seen date per group
        const lastSeen = new Map<string, string>() // group name → ISO date
        const sorted = [...workouts].reverse()
        for (const w of sorted) {
            const perGroup = new Map<string, number>()
            for (const mg of w.muscleGroups) {
                if (isTarget(mg.name)) continue
                const prev = lastSeen.get(mg.name)
                if (prev) {
                    const days = Math.round(
                        (new Date(w.date + 'T00:00:00').getTime() -
                         new Date(prev + 'T00:00:00').getTime()) / 86400000
                    )
                    perGroup.set(mg.name, days)
                }
                lastSeen.set(mg.name, w.date)
            }
            result.set(w.id, perGroup)
        }
        return result
    }, [workouts])

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

            {/* Routine quick-actions */}
            {presets.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                    {/* Lightning circle icon */}
                    <Box sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        backgroundColor: colors.primaryYellow,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mr: 0.5,
                    }}>
                        <IconBolt size={14} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
                    </Box>
                    {presets.map((preset) => (
                        <Box
                            key={preset.id}
                            onClick={() => applyingPreset === null && applyPreset(preset.id)}
                            sx={{
                                'px': 1.25,
                                'py': 0.5,
                                'backgroundColor': applyingPreset === preset.id ? colors.primaryYellow : colors.primaryWhite,
                                'border': `1.5px solid ${colors.primaryBlack}`,
                                'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                'borderRadius': '4px',
                                'cursor': applyingPreset !== null ? 'default' : 'pointer',
                                'opacity': applyingPreset !== null && applyingPreset !== preset.id ? 0.5 : 1,
                                'transition': 'all 0.15s',
                                '&:active': applyingPreset === null ? {
                                    boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                    transform: 'translate(1px, 1px)',
                                } : {},
                            }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                {preset.name}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Workout timeline */}
            {workouts.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                    No workouts logged yet.
                </Typography>
            ) : (
                <Box sx={{ position: 'relative' }}>
                    {/* Vertical timeline line */}
                    <Box sx={{
                        position: 'absolute',
                        left: 15, // center of 32px gutter
                        top: 6, // align with first node center
                        bottom: 6,
                        width: 2,
                        backgroundColor: `${colors.primaryBlack}25`,
                    }} />

                    {workouts.map((workout, i) => {
                        const parentGroups = workout.muscleGroups.filter((mg) => !isTarget(mg.name))

                        const d = new Date(workout.date + 'T00:00:00')
                        const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
                        const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })


                        // Days gap to next entry
                        const daysBetween = i < workouts.length - 1
                            ? Math.round(
                                (new Date(workout.date + 'T00:00:00').getTime() -
                                 new Date(workouts[i + 1].date + 'T00:00:00').getTime()) / 86400000
                            )
                            : 0

                        return (
                            <Box key={workout.id}>
                                {/* ── Card row with date aligned to top ── */}
                                <Box sx={{ display: 'flex' }}>
                                    {/* Timeline gutter with days-since node */}
                                    <Box sx={{
                                        width: 32,
                                        flexShrink: 0,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        pt: '1px',
                                    }}>
                                        {daysBetween > 0 ? (() => {
                                            const bg = daysBetween <= 2 ? '#e8f5e9' : daysBetween <= 6 ? '#fff3e0' : '#fbe9e7'
                                            const borderColor = daysBetween <= 2 ? '#4caf50' : daysBetween <= 6 ? '#f57c00' : colors.primaryRed
                                            return (
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: 18,
                                                    height: 18,
                                                    borderRadius: '50%',
                                                    backgroundColor: bg,
                                                    border: `1.5px solid ${borderColor}`,
                                                    boxShadow: `1.5px 1.5px 0px ${borderColor}`,
                                                    zIndex: 1,
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: 9,
                                                        fontWeight: 800,
                                                        lineHeight: 1,
                                                        color: borderColor,
                                                    }}>
                                                        {daysBetween}
                                                    </Typography>
                                                </Box>
                                            )
                                        })() : (
                                            <Box sx={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                backgroundColor: colors.primaryYellow,
                                                border: `1.5px solid ${colors.primaryBlack}`,
                                                zIndex: 1,
                                                mt: '5px',
                                            }} />
                                        )}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {/* Date label */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                                            <Box sx={{
                                                px: 0.75,
                                                py: 0.25,
                                                backgroundColor: colors.primaryYellow,
                                                border: `1px solid ${colors.primaryBlack}`,
                                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                                borderRadius: '3px',
                                            }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.2 }}>
                                                    {weekday}
                                                </Typography>
                                            </Box>
                                            <Typography sx={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: colors.primaryBrown,
                                            }}>
                                                {monthDay}
                                            </Typography>
                                        </Box>
                                        {/* Card */}
                                        <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                        <SwipeableRow
                                            canEdit
                                            canDelete
                                            onEdit={() => openEdit(workout)}
                                            onDelete={() => handleDelete(workout.id)}
                                            backgroundColor={colors.primaryWhite}
                                        >
                                            <Box
                                                onClick={() => openDetail(workout)}
                                                sx={{
                                                    'p': 1.5,
                                                    'cursor': 'pointer',
                                                    'backgroundColor': colors.primaryWhite,
                                                    '&:active': { backgroundColor: colors.secondaryYellow },
                                                    'transition': 'background-color 150ms ease',
                                                }}>
                                                {/* Muscle group chips */}
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                    {parentGroups.map((mg) => {
                                                        const workoutDays = daysSincePrevMap.get(workout.id)
                                                        const days = workoutDays?.get(mg.name)
                                                        return (
                                                            <Box key={mg.id} sx={{ position: 'relative' }}>
                                                                <Chip
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
                                                                {days !== undefined && (
                                                                    <Box sx={{
                                                                        position: 'absolute',
                                                                        bottom: -6,
                                                                        right: -4,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        minWidth: 16,
                                                                        height: 14,
                                                                        px: 0.25,
                                                                        borderRadius: '7px',
                                                                        backgroundColor: colors.primaryWhite,
                                                                        border: `1px solid ${colors.primaryBlack}`,
                                                                        zIndex: 1,
                                                                    }}>
                                                                        <Typography sx={{
                                                                            fontSize: 8,
                                                                            fontWeight: 800,
                                                                            lineHeight: 1,
                                                                            color: colors.primaryBlack,
                                                                        }}>
                                                                            {days}
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        )
                                                    })}
                                                </Box>

                                            </Box>
                                        </SwipeableRow>
                                    </Box>
                                    </Box>
                                </Box>

                                {/* ── Gap between entries ── */}
                                {i < workouts.length - 1 && (
                                    <Box sx={{ height: 12 }} />
                                )}
                            </Box>
                        )
                    })}
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
                presets={presets}
                onPresetSaved={fetchPresets}
            />

            {/* Workout detail drawer */}
            <WorkoutDetailDrawer
                workout={detailWorkout}
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setDetailWorkout(null) }}
                onEdit={openEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                allWorkouts={workouts}
            />

            {/* Preset form drawer */}
            <PresetFormDrawer
                open={presetDrawerOpen}
                onClose={() => { setPresetDrawerOpen(false); setEditingPreset(null) }}
                muscleGroups={muscleGroups}
                exercises={exercises}
                editingPreset={editingPreset}
                existingPresets={presets}
                onSaved={() => { fetchPresets(); setPresetDrawerOpen(false); setEditingPreset(null) }}
                onEdit={(p) => { setEditingPreset(p); setPresetDrawerOpen(true) }}
                onDelete={async (id) => {
                    await fetch(`/api/health/presets/${id}`, { method: 'DELETE' })
                    fetchPresets()
                }}
            />
        </Box>
    )
}

// ── Preset Form Drawer ──────────────────────────────────────────────────────

type PresetFormDrawerProps = {
    open: boolean
    onClose: () => void
    muscleGroups: MuscleGroupWithParents[]
    exercises: Exercise[]
    editingPreset: WorkoutPreset | null
    existingPresets: WorkoutPreset[]
    onSaved: () => void
    onEdit: (preset: WorkoutPreset) => void
    onDelete: (id: number) => Promise<void>
}

function PresetFormDrawer({
    open,
    onClose,
    muscleGroups,
    exercises,
    editingPreset,
    existingPresets,
    onSaved,
    onEdit,
    onDelete,
}: PresetFormDrawerProps) {
    const [name, setName] = useState('')
    const [selectedMgIds, setSelectedMgIds] = useState<Set<number>>(new Set())
    const [selectedExIds, setSelectedExIds] = useState<number[]>([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open) {
            if (editingPreset) {
                setName(editingPreset.name)
                setSelectedMgIds(new Set(editingPreset.muscleGroups.map((mg) => mg.id)))
                setSelectedExIds(editingPreset.exercises.map((ex) => ex.id))
            } else {
                setName('')
                setSelectedMgIds(new Set())
                setSelectedExIds([])
            }
            setError('')
        }
    }, [open, editingPreset])

    const toggleMuscle = useCallback(
        (mgName: string, mgId: number) => {
            setSelectedMgIds((prev) => {
                const next = new Set(prev)
                if (next.has(mgId)) {
                    next.delete(mgId)
                    if (!isTarget(mgName)) {
                        const targets = GROUP_TARGETS[mgName] || []
                        for (const t of targets) {
                            const tid = muscleGroups.find((g) => g.name === t)?.id
                            if (tid) next.delete(tid)
                        }
                    }
                } else {
                    next.add(mgId)
                    if (isTarget(mgName)) {
                        const mg = muscleGroups.find((g) => g.name === mgName)
                        if (mg && 'parents' in mg) {
                            for (const p of (mg as MuscleGroupWithParents).parents) {
                                next.add(p.id)
                            }
                        }
                    }
                }
                return next
            })
        },
        [muscleGroups]
    )

    const toggleExercise = useCallback((exId: number) => {
        setSelectedExIds((prev) =>
            prev.includes(exId) ? prev.filter((id) => id !== exId) : [...prev, exId]
        )
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!name.trim()) return
        setSaving(true)
        setError('')

        const url = editingPreset
            ? `/api/health/presets/${editingPreset.id}`
            : '/api/health/presets'
        const method = editingPreset ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    type: 'workout',
                    muscleGroupIds: Array.from(selectedMgIds),
                    exerciseIds: selectedExIds,
                }),
            })
            if (res.ok) {
                onSaved()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to save')
            }
        } catch {
            setError('Failed to save')
        } finally {
            setSaving(false)
        }
    }, [name, selectedMgIds, selectedExIds, editingPreset, onSaved])

    const mgCardProps = { muscleGroups, selectedIds: selectedMgIds, onToggle: toggleMuscle }

    // Show list view when not editing
    return (
        <FormDrawer open={open} onClose={onClose}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${colors.primaryBlack}20` }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                        {editingPreset ? 'Edit Routine' : 'Routines'}
                    </Typography>
                </Box>

                {/* Body */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Existing presets list */}
                    {!editingPreset && existingPresets.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {existingPresets.map((p) => (
                                <Box key={p.id} sx={{ ...cardSx, overflow: 'hidden' }}>
                                    <SwipeableRow
                                        canEdit
                                        canDelete
                                        onEdit={() => onEdit(p)}
                                        onDelete={() => onDelete(p.id)}
                                        backgroundColor={colors.primaryWhite}
                                    >
                                        <Box
                                            onClick={() => onEdit(p)}
                                            sx={{
                                                'p': 1.5,
                                                'cursor': 'pointer',
                                                '&:active': { backgroundColor: colors.secondaryYellow },
                                            }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                                                {p.name}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {p.muscleGroups.filter((mg) => !isTarget(mg.name)).map((mg) => (
                                                    <Chip
                                                        key={mg.id}
                                                        label={mg.name}
                                                        size="small"
                                                        sx={{
                                                            'height': 20,
                                                            'fontSize': 10,
                                                            'fontWeight': 600,
                                                            'backgroundColor': selectedBg,
                                                            'border': `1px solid ${selectedBorder}`,
                                                            'borderRadius': '3px',
                                                            '& .MuiChip-label': { px: 0.75 },
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                            {p.exercises.length > 0 && (
                                                <Typography sx={{ fontSize: 11, color: colors.primaryBrown, mt: 0.5 }}>
                                                    {p.exercises.map((e) => e.name).join(', ')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </SwipeableRow>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Divider between list and form */}
                    {!editingPreset && existingPresets.length > 0 && (
                        <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}15`, my: 0.5 }} />
                    )}

                    {/* Form */}
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.primaryBrown, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {editingPreset ? 'Edit' : 'New Routine'}
                    </Typography>

                    <Box>
                        <Typography sx={labelSx}>Name</Typography>
                        <TextField
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="Push Day, Pull Day..."
                            sx={fieldSx}
                        />
                    </Box>

                    {/* Muscle group grid */}
                    <Box>
                        <Typography sx={labelSx}>Muscle Groups</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Chest" {...mgCardProps} />
                                <MuscleGroupCard groupName="Shoulders" {...mgCardProps} />
                                <MuscleGroupCard groupName="Triceps" {...mgCardProps} />
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Upper Back" {...mgCardProps} sx={{ gridColumn: 'span 2' }} />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <MuscleGroupCard groupName="Biceps" {...mgCardProps} sx={{ flex: 1 }} />
                                    <MuscleGroupCard groupName="Forearms" {...mgCardProps} sx={{ flex: 1 }} />
                                </Box>
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Legs" {...mgCardProps} sx={{ gridColumn: 'span 2' }} />
                                <MuscleGroupCard groupName="Lower Back" {...mgCardProps} />
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Core" {...mgCardProps} sx={{ gridColumn: 'span 2' }} />
                                <MuscleGroupCard groupName="Cardio" {...mgCardProps} />
                            </Box>
                        </Box>
                    </Box>

                    {/* Exercise selection */}
                    {exercises.length > 0 && (
                        <Box>
                            <Typography sx={labelSx}>Exercises (optional)</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {exercises.map((ex) => {
                                    const isSelected = selectedExIds.includes(ex.id)
                                    return (
                                        <Chip
                                            key={ex.id}
                                            label={ex.name}
                                            onClick={() => toggleExercise(ex.id)}
                                            size="small"
                                            sx={{
                                                'height': 28,
                                                'fontSize': 12,
                                                'fontWeight': isSelected ? 700 : 400,
                                                'backgroundColor': isSelected ? exerciseBg : colors.primaryWhite,
                                                'border': `1px solid ${isSelected ? exerciseBorder : `${colors.primaryBlack}25`}`,
                                                'boxShadow': isSelected ? `1.5px 1.5px 0px ${exerciseBorder}` : 'none',
                                                'borderRadius': '4px',
                                                'cursor': 'pointer',
                                                '& .MuiChip-label': { px: 1 },
                                            }}
                                        />
                                    )
                                })}
                            </Box>
                        </Box>
                    )}

                    {error && (
                        <Typography sx={{ fontSize: 13, color: colors.primaryRed }}>
                            {error}
                        </Typography>
                    )}
                </Box>

                {/* Footer */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 2,
                    borderTop: `1px solid ${colors.primaryBlack}20`,
                    paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
                }}>
                    <Button onClick={onClose} disabled={saving} size="large" sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!name.trim() || saving}
                        size="large"
                        sx={primaryButtonSx}>
                        {saving ? 'Saving...' : editingPreset ? 'Save' : 'Create'}
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
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
    presets: WorkoutPreset[]
    onPresetSaved: () => void
}

// Grid layout for muscle group selection — all rows use a 3-column grid.
// 'span2' rows have the first group spanning 2 columns.
type GridRow =
    | { type: 'grid'; groups: string[] }
    | { type: 'pull' }
    | { type: 'span2'; groups: [string, string] }

const GRID_ROWS: GridRow[] = [
    { type: 'grid', groups: ['Chest', 'Shoulders', 'Triceps'] },
    { type: 'pull' },
    { type: 'span2', groups: ['Legs', 'Lower Back'] },
    { type: 'span2', groups: ['Core', 'Cardio'] },
]

// Selected state colors — warm palette
const selectedBorder = '#b57b00'
const selectedBg = '#fff8e1'
const selectedTargetBg = '#e8c196'
const selectedTargetBorder = '#a0612a'

// Exercise colors — warm green palette (matches app theme)
const exerciseBg = '#e8f0dc'
const exerciseBorder = '#5a6e3c'

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
        sets: 0,
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
    presets,
    onPresetSaved,
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
    const [exerciseSearch, setExerciseSearch] = useState('')
    const [exerciseSectionOpen, setExerciseSectionOpen] = useState(true)
    const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set())

    const [quickAddSaving, setQuickAddSaving] = useState(false)

    // Save-as-preset state
    const [showSavePreset, setShowSavePreset] = useState(false)
    const [presetName, setPresetName] = useState('')
    const [savingPreset, setSavingPreset] = useState(false)

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
            setExerciseSearch('')
            setShowSavePreset(false)
            setPresetName('')
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

    // Apply a preset to prefill the form
    const applyPresetToForm = useCallback(
        (preset: WorkoutPreset) => {
            setSelectedIds(new Set(preset.muscleGroups.map((mg) => mg.id)))
            setExerciseEntries(preset.exercises.map((ex) => defaultEntry(ex)))
        },
        []
    )

    // Save current form state as a new preset
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
                onPresetSaved()
            }
        } catch {
            // silent fail
        } finally {
            setSavingPreset(false)
        }
    }, [presetName, selectedIds, exerciseEntries, onPresetSaved])

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

    const updateEntry = useCallback((index: number, updates: Partial<FormExerciseEntry>) => {
        setExerciseEntries((prev) =>
            prev.map((e, i) => (i === index ? { ...e, ...updates } : e))
        )
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
        if (!exerciseSearch.trim()) return
        setQuickAddSaving(true)
        try {
            // Create exercise with currently selected muscle groups
            const mgIds = Array.from(selectedIds)

            const res = await fetch('/api/health/exercises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: exerciseSearch.trim(),
                    muscleGroupIds: mgIds,
                }),
            })

            if (res.ok) {
                const newExercise: Exercise = await res.json()
                onExerciseCreated()
                addExercise(newExercise)
                setExerciseSearch('')
            }
        } finally {
            setQuickAddSaving(false)
        }
    }, [exerciseSearch, selectedIds, onExerciseCreated, addExercise])

    // All exercises sorted: matching selected muscle groups first
    const sortedExercisesForBrowse = useMemo(() => {
        const alreadyAdded = new Set(exerciseEntries.map((e) => e.exerciseId))
        const available = exercises.filter((e) => !alreadyAdded.has(e.id))

        if (selectedIds.size === 0) return available

        const matching: typeof available = []
        const nonMatching: typeof available = []
        for (const ex of available) {
            const hasMatch = ex.muscleGroups.some((mg) => selectedIds.has(mg.id))
            if (hasMatch) matching.push(ex)
            else nonMatching.push(ex)
        }
        return [...matching, ...nonMatching]
    }, [exercises, exerciseEntries, selectedIds])

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
                    {/* Routines + save-as-routine */}
                    {!isEdit && (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography sx={labelSx}>Routines</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                                {/* New routine button */}
                                <Box
                                    onClick={() => {
                                        setShowSavePreset((v) => !v)
                                        if (showSavePreset) setPresetName('')
                                    }}
                                    sx={{
                                        'display': 'flex',
                                        'alignItems': 'center',
                                        'justifyContent': 'center',
                                        'width': 28,
                                        'height': 28,
                                        'borderRadius': '50%',
                                        'border': `1.5px solid ${colors.primaryBlack}`,
                                        'boxShadow': showSavePreset
                                            ? `1px 1px 0px ${colors.primaryBlack}`
                                            : `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                        'backgroundColor': showSavePreset ? colors.primaryYellow : colors.primaryWhite,
                                        'cursor': 'pointer',
                                        'transition': 'all 0.15s',
                                        'transform': showSavePreset ? 'translate(0.5px, 0.5px)' : 'none',
                                        '&:active': {
                                            boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                            transform: 'translate(1px, 1px)',
                                        },
                                    }}>
                                    <IconPlus size={14} stroke={2.5} color={colors.primaryBlack} />
                                </Box>
                                {/* Preset chips */}
                                {presets.map((preset) => (
                                    <Chip
                                        key={preset.id}
                                        label={preset.name}
                                        onClick={() => applyPresetToForm(preset)}
                                        size="small"
                                        sx={{
                                            'height': 28,
                                            'fontSize': 12,
                                            'fontWeight': 600,
                                            'backgroundColor': colors.primaryWhite,
                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                            'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                            'borderRadius': '4px',
                                            'cursor': 'pointer',
                                            '& .MuiChip-label': { px: 0.75 },
                                            '&:active': {
                                                boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                                transform: 'translate(1px, 1px)',
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                            {/* New routine name input — revealed when + is active */}
                            {showSavePreset && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown, mb: 0.5 }}>
                                        New routine name
                                    </Typography>
                                    <TextField
                                        value={presetName}
                                        onChange={(e) => setPresetName(e.target.value)}
                                        size="small"
                                        fullWidth
                                        autoFocus
                                        placeholder="Push Day, Pull Day..."
                                        sx={{ ...fieldSx, '& .MuiInputBase-input': { fontSize: 13, py: 0.75 } }}
                                    />
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Muscle group grid */}
                    <Box>
                        <Typography sx={labelSx}>Muscle Groups</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {GRID_ROWS.map((row, rowIdx) => {
                            if (row.type === 'pull') {
                                return (
                                    <Box key={rowIdx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                        <MuscleGroupCard groupName="Upper Back" muscleGroups={muscleGroups} selectedIds={selectedIds} onToggle={toggleMuscle} sx={{ gridColumn: 'span 2' }} />
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <MuscleGroupCard groupName="Biceps" muscleGroups={muscleGroups} selectedIds={selectedIds} onToggle={toggleMuscle} sx={{ flex: 1 }} />
                                            <MuscleGroupCard groupName="Forearms" muscleGroups={muscleGroups} selectedIds={selectedIds} onToggle={toggleMuscle} sx={{ flex: 1 }} />
                                        </Box>
                                    </Box>
                                )
                            }
                            if (row.type === 'span2') {
                                return (
                                    <Box key={rowIdx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                        <MuscleGroupCard groupName={row.groups[0]} muscleGroups={muscleGroups} selectedIds={selectedIds} onToggle={toggleMuscle} sx={{ gridColumn: 'span 2' }} />
                                        <MuscleGroupCard groupName={row.groups[1]} muscleGroups={muscleGroups} selectedIds={selectedIds} onToggle={toggleMuscle} />
                                    </Box>
                                )
                            }
                            return (
                                <Box key={rowIdx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                    {row.groups.map((groupName: string) => (
                                        <MuscleGroupCard key={groupName} groupName={groupName} muscleGroups={muscleGroups} selectedIds={selectedIds} onToggle={toggleMuscle} />
                                    ))}
                                </Box>
                            )
                        })}
                        </Box>
                    </Box>

                    {/* Exercises section */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        borderRadius: '6px',
                        backgroundColor: colors.primaryWhite,
                        boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                        padding: '10px 12px',
                    }}>
                        <Box
                            onClick={() => setExerciseSectionOpen((v) => !v)}
                            sx={{
                                'display': 'flex',
                                'alignItems': 'center',
                                'justifyContent': 'space-between',
                                'cursor': 'pointer',
                                'userSelect': 'none',
                                '&:active': { opacity: 0.6 },
                            }}>
                            <Typography sx={{ ...labelSx, mb: 0 }}>
                                Exercises{exerciseEntries.length > 0 ? ` (${exerciseEntries.length})` : ' (optional)'}
                            </Typography>
                            {exerciseSectionOpen
                                ? <IconChevronUp size={16} stroke={2} color={colors.primaryBrown} />
                                : <IconChevronDown size={16} stroke={2} color={colors.primaryBrown} />}
                        </Box>

                        {exerciseSectionOpen && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {/* Combined search + create field */}
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                    <TextField
                                        value={exerciseSearch}
                                        onChange={(e) => setExerciseSearch(e.target.value)}
                                        size="small"
                                        placeholder="Search or create exercise..."
                                        sx={{ ...fieldSx, flex: 1, '& .MuiInputBase-input': { py: 0.75, fontSize: 13 } }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && exerciseSearch.trim()) handleQuickAdd()
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
                                    {/* Selected exercises */}
                                    {exerciseEntries.map((entry, index) => {
                                        const isExpanded = expandedEntries.has(index)
                                        const ex = exercises.find((e) => e.id === entry.exerciseId)
                                        const entryMuscleGroups = ex?.muscleGroups ?? []
                                        const toggleExpand = () => setExpandedEntries((prev) => {
                                            const next = new Set(prev)
                                            if (next.has(index)) next.delete(index)
                                            else next.add(index)
                                            return next
                                        })
                                        return (
                                            <SwipeableRow
                                                key={`selected-${entry.exerciseId}`}
                                                canEdit={false}
                                                canDelete={true}
                                                onEdit={() => {}}
                                                onDelete={() => removeExercise(index)}
                                                backgroundColor={colors.secondaryYellow}
                                                borderRadius="4px"
                                                boxShadow={`2px 2px 0px ${colors.primaryYellow}`}>
                                                <Box
                                                    onClick={toggleExpand}
                                                    sx={{
                                                        'display': 'flex',
                                                        'flexDirection': 'column',
                                                        'gap': 0.25,
                                                        'padding': '6px 10px',
                                                        'cursor': 'pointer',
                                                        'border': `1.5px solid ${colors.primaryYellow}`,
                                                        'backgroundColor': colors.secondaryYellow,
                                                        'borderRadius': '4px',
                                                        '&:active': { opacity: 0.7 },
                                                    }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                                                {entry.exerciseName}
                                                            </Typography>
                                                            {entry.isBodyweight && (
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
                                                        {isExpanded
                                                            ? <IconChevronUp size={12} stroke={2} color={colors.primaryBrown} />
                                                            : <IconChevronDown size={12} stroke={2} color={colors.primaryBrown} />}
                                                    </Box>
                                                    {entryMuscleGroups.length > 0 && (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                                                            {entryMuscleGroups.map((mg) => (
                                                                <Typography
                                                                    key={mg.id}
                                                                    sx={{
                                                                        fontSize: 9,
                                                                        fontWeight: 600,
                                                                        color: selectedIds.has(mg.id) ? exerciseBorder : colors.primaryBrown,
                                                                        backgroundColor: selectedIds.has(mg.id) ? `${exerciseBorder}15` : `${colors.primaryBrown}10`,
                                                                        border: `1px solid ${selectedIds.has(mg.id) ? `${exerciseBorder}40` : `${colors.primaryBrown}20`}`,
                                                                        borderRadius: '2px',
                                                                        px: 0.5,
                                                                        py: 0.125,
                                                                        lineHeight: 1.3,
                                                                    }}>
                                                                    {mg.name}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    )}
                                                    {/* Expanded: weight/sets/reps inputs */}
                                                    {isExpanded && (
                                                        <Box onClick={(e) => e.stopPropagation()}>
                                                            {!entry.expandedSets ? (
                                                                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                                                                    <CompactField
                                                                        label="lbs"
                                                                        type="number"
                                                                        value={entry.weightLbs}
                                                                        onChange={(v) => updateEntry(index, { weightLbs: v })}
                                                                        width={64}
                                                                        placeholder="–"
                                                                        htmlInputProps={{ min: 0, step: 'any' }}
                                                                    />
                                                                    <CompactField
                                                                        label="sets"
                                                                        type="number"
                                                                        value={entry.sets || ''}
                                                                        onChange={(v) => {
                                                                            const val = parseInt(v, 10)
                                                                            updateEntry(index, { sets: isNaN(val) ? 0 : Math.max(0, val) })
                                                                        }}
                                                                        width={48}
                                                                        placeholder="–"
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
                                                    )}
                                                </Box>
                                            </SwipeableRow>
                                        )
                                    })}

                                    {/* Unselected exercises */}
                                    {(() => {
                                        const list = exerciseSearch.trim()
                                            ? sortedExercisesForBrowse.filter((e) =>
                                                e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                                            : sortedExercisesForBrowse

                                        if (list.length === 0 && exerciseEntries.length === 0 && !exerciseSearch.trim()) {
                                            return (
                                                <Typography sx={{ fontSize: 12, color: colors.primaryBrown, py: 1, textAlign: 'center' }}>
                                                    No exercises yet. Type above to create one.
                                                </Typography>
                                            )
                                        }

                                        return list.map((ex) => {
                                            const matches = selectedIds.size > 0 && ex.muscleGroups.some((mg) => selectedIds.has(mg.id))
                                            return (
                                                <Box
                                                    key={ex.id}
                                                    onClick={() => addExercise(ex)}
                                                    sx={{
                                                        'display': 'flex',
                                                        'alignItems': 'center',
                                                        'justifyContent': 'space-between',
                                                        'padding': '6px 10px',
                                                        'borderRadius': '4px',
                                                        'cursor': 'pointer',
                                                        'border': `1.5px solid ${matches ? exerciseBorder : `${colors.primaryBlack}40`}`,
                                                        'backgroundColor': matches ? exerciseBg : colors.primaryWhite,
                                                        'boxShadow': `2px 2px 0px ${matches ? exerciseBorder : `${colors.primaryBlack}40`}`,
                                                        '&:active': { opacity: 0.6 },
                                                    }}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            <Typography sx={{ fontSize: 13, fontWeight: matches ? 600 : 500 }}>
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
                                                        {ex.muscleGroups.length > 0 && (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                                                                {ex.muscleGroups.map((mg) => (
                                                                    <Typography
                                                                        key={mg.id}
                                                                        sx={{
                                                                            fontSize: 9,
                                                                            fontWeight: 600,
                                                                            color: selectedIds.has(mg.id) ? exerciseBorder : colors.primaryBrown,
                                                                            backgroundColor: selectedIds.has(mg.id) ? `${exerciseBorder}15` : `${colors.primaryBrown}10`,
                                                                            border: `1px solid ${selectedIds.has(mg.id) ? `${exerciseBorder}40` : `${colors.primaryBrown}20`}`,
                                                                            borderRadius: '2px',
                                                                            px: 0.5,
                                                                            py: 0.125,
                                                                            lineHeight: 1.3,
                                                                        }}>
                                                                        {mg.name}
                                                                    </Typography>
                                                                ))}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                    <IconPlus size={14} stroke={2} color={colors.primaryBrown} style={{ flexShrink: 0 }} />
                                                </Box>
                                            )
                                        })
                                    })()}
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
                        justifyContent: 'space-between',
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
                        onClick={showSavePreset ? saveAsPreset : handleSubmit}
                        disabled={showSavePreset ? (!presetName.trim() || savingPreset) : (selectedIds.size === 0 || saving)}
                        size="large"
                        sx={primaryButtonSx}>
                        {showSavePreset
                            ? (savingPreset ? 'Saving...' : 'Save Routine')
                            : (saving ? 'Saving...' : isEdit ? 'Save' : 'Log')}
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
