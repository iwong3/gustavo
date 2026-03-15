'use client'

import { cardSx, colors } from '@/lib/colors'
import type { MuscleGroupWithParents, Workout } from '@/lib/health-types'
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
import { IconCopy, IconDots, IconPencil, IconTrash } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import FormDrawer from 'components/form-drawer'

type WorkoutFormData = {
    date: string
    muscleGroupIds: number[]
    notes: string
}

// Resolve muscle group IDs by name from the fetched list
function getIdByName(name: string, allGroups: MuscleGroupWithParents[]): number | undefined {
    return allGroups.find((g) => g.name === name)?.id
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ExercisePage() {
    const [workouts, setWorkouts] = useState<Workout[]>([])
    const [muscleGroups, setMuscleGroups] = useState<MuscleGroupWithParents[]>([])
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

    useEffect(() => {
        Promise.all([
            fetch('/api/health/muscle-groups').then((r) => r.json()),
            fetch('/api/health/workouts').then((r) => r.json()),
        ])
            .then(([mg, w]) => {
                setMuscleGroups(mg)
                setWorkouts(w)
            })
            .catch((err) => console.error('Failed to load:', err))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = useCallback(
        async (data: WorkoutFormData) => {
            const url = editingWorkout
                ? `/api/health/workouts/${editingWorkout.id}`
                : '/api/health/workouts'
            const method = editingWorkout ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                setDrawerOpen(false)
                setEditingWorkout(null)
                fetchWorkouts()
            }
        },
        [editingWorkout, fetchWorkouts]
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
            // Pre-fill handled via duplicateFrom prop
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
                Exercise
            </Typography>

            {/* Workout list */}
            {workouts.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                    No workouts logged yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {workouts.map((workout) => (
                        <Box
                            key={workout.id}
                            sx={{
                                padding: '12px 14px',
                                ...cardSx,
                            }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>
                                        {formatDate(workout.date)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {workout.muscleGroups.map((mg) => {
                                            const isTargetMuscle = isTarget(mg.name)
                                            return (
                                                <Chip
                                                    key={mg.id}
                                                    label={mg.name}
                                                    size="small"
                                                    sx={{
                                                        'height': 24,
                                                        'fontSize': 12,
                                                        'fontWeight': isTargetMuscle ? 500 : 700,
                                                        'backgroundColor': isTargetMuscle
                                                            ? selectedTargetBg
                                                            : selectedBg,
                                                        'border': `1px solid ${isTargetMuscle ? selectedTargetBorder : selectedBorder}`,
                                                        'boxShadow': `1px 1px 0px ${isTargetMuscle ? selectedTargetBorder : selectedBorder}`,
                                                        'borderRadius': '3px',
                                                        'color': colors.primaryBlack,
                                                        '& .MuiChip-label': { px: 1 },
                                                    }}
                                                />
                                            )
                                        })}
                                    </Box>
                                    {workout.notes && (
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                color: colors.primaryBrown,
                                                mt: 0.75,
                                            }}>
                                            {workout.notes}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Actions menu */}
                                <Box sx={{ position: 'relative' }}>
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
                        </Box>
                    ))}
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
                editingWorkout={editingWorkout}
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
    editingWorkout: Workout | null
}

// Grid layout for muscle group selection
// Row 1: Chest | Shoulders | Triceps
// Row 2: Back  | Biceps    | Forearms
// Row 3: Legs (full width)
// Row 4: Core  | Cardio
// Grid layout for muscle group selection
// Row 1: Back (2/3 width) | Biceps + Forearms stacked (1/3 width)
// Row 2: Chest | Shoulders | Triceps
// Row 3: Legs (full width)
// Row 4: Core | Cardio
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
const selectedBorder = '#b57b00'         // dark amber for group border/shadow
const selectedBg = '#fff8e1'             // cream yellow for group background
const selectedTargetBg = '#e8c196'       // muted sandy orange for target chips
const selectedTargetBorder = '#a0612a'   // earthy brown-orange for target border/shadow

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
            {/* Group name */}
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

            {/* Targets */}
            {targets.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.75,
                    }}>
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

function WorkoutFormDrawer({
    open,
    onClose,
    onSave,
    muscleGroups,
    editingWorkout,
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

    // Reset form when opened
    useEffect(() => {
        if (open) {
            if (editingWorkout) {
                setDate(editingWorkout.date)
                setSelectedIds(new Set(editingWorkout.muscleGroups.map((mg) => Number(mg.id))))
                setNotes(editingWorkout.notes || '')
            } else {
                const now = new Date()
                setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
                setSelectedIds(new Set())
                setNotes('')
            }
        }
    }, [open, editingWorkout])

    const toggleMuscle = useCallback(
        (name: string, id: number) => {
            const numId = Number(id)
            setSelectedIds((prev) => {
                const next = new Set(prev)
                if (next.has(numId)) {
                    // Deselecting a group — also deselect its targets
                    next.delete(numId)
                    if (!isTarget(name)) {
                        const targets = GROUP_TARGETS[name] || []
                        for (const t of targets) {
                            const tid = muscleGroups.find((g) => g.name === t)?.id
                            if (tid) next.delete(Number(tid))
                        }
                    }
                } else {
                    // Selecting
                    next.add(numId)
                    // If target, auto-select parent groups
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

    const handleSubmit = useCallback(async () => {
        if (selectedIds.size === 0) return
        setSaving(true)
        try {
            await onSave({
                date,
                muscleGroupIds: Array.from(selectedIds),
                notes,
            })
        } finally {
            setSaving(false)
        }
    }, [date, selectedIds, notes, onSave])

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
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 2.5,
                        py: 2,
                        borderBottom: `1px solid ${colors.primaryBlack}20`,
                    }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                        {isEdit ? 'Edit Workout' : isDuplicate ? 'Duplicate Workout' : 'Log Workout'}
                    </Typography>
                    <Button onClick={onClose} size="small" sx={secondaryButtonSx}>
                        Cancel
                    </Button>
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
                        px: 2.5,
                        py: 2,
                        borderTop: `1px solid ${colors.primaryBlack}20`,
                        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
                    }}>
                    <Button
                        onClick={handleSubmit}
                        disabled={selectedIds.size === 0 || saving}
                        fullWidth
                        sx={{
                            ...primaryButtonSx,
                            '&.Mui-disabled': {
                                backgroundColor: `${colors.primaryYellow}60`,
                                color: `${colors.primaryBlack}60`,
                                border: `1px solid ${colors.primaryBlack}40`,
                                boxShadow: `2px 2px 0px ${colors.primaryBlack}40`,
                            },
                        }}>
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Workout'}
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
    )
}
