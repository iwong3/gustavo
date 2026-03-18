'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Exercise, MuscleGroupWithParents } from '@/lib/health-types'
import { GROUP_TARGETS, isTarget } from '@/lib/health/muscle-groups'
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
import { useCallback, useEffect, useState } from 'react'
import FormDrawer from 'components/form-drawer'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { SlidingToggle } from 'components/sliding-toggle'

const chipShadow = `1px 1px 0px`

export default function ExercisesPage() {
    const [exercises, setExercises] = useState<Exercise[]>([])
    const [muscleGroups, setMuscleGroups] = useState<MuscleGroupWithParents[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

    const fetchData = useCallback(() => {
        Promise.all([
            fetch('/api/health/exercises').then((r) => r.json()),
            fetch('/api/health/muscle-groups').then((r) => r.json()),
        ])
            .then(([ex, mg]) => {
                setExercises(ex)
                setMuscleGroups(mg)
            })
            .catch((err) => console.error('Failed to load:', err))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const openAdd = useCallback(() => {
        setEditingExercise(null)
        setDrawerOpen(true)
    }, [])

    const openEdit = useCallback((exercise: Exercise) => {
        setEditingExercise(exercise)
        setDrawerOpen(true)
    }, [])

    const handleDelete = useCallback(
        async (id: number) => {
            const res = await fetch(`/api/health/exercises/${id}`, { method: 'DELETE' })
            if (res.ok) fetchData()
        },
        [fetchData]
    )

    useRegisterFab(openAdd)

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
            <Typography
                sx={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: 'var(--font-serif)',
                }}>
                Exercises
            </Typography>

            {exercises.length === 0 ? (
                <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                    No exercises yet. Tap + to add one.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {exercises.map((exercise) => (
                        <Box key={exercise.id} sx={{ ...cardSx, overflow: 'hidden' }}>
                            <SwipeableRow
                                canEdit
                                canDelete
                                onEdit={() => openEdit(exercise)}
                                onDelete={() => handleDelete(exercise.id)}
                                backgroundColor={colors.primaryWhite}
                            >
                                <Box
                                    onClick={() => openEdit(exercise)}
                                    sx={{
                                        'padding': '12px 14px',
                                        'cursor': 'pointer',
                                        '&:active': { backgroundColor: `${colors.primaryYellow}15` },
                                    }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                            {exercise.name}
                                        </Typography>
                                        {exercise.isBodyweight && (
                                            <Chip
                                                label="BW"
                                                size="small"
                                                sx={{
                                                    'height': 20,
                                                    'fontSize': 10,
                                                    'fontWeight': 700,
                                                    'backgroundColor': '#e0ebe0',
                                                    'border': `1px solid ${colors.primaryBrown}`,
                                                    'boxShadow': `${chipShadow} ${colors.primaryBrown}`,
                                                    'borderRadius': '3px',
                                                    '& .MuiChip-label': { px: 0.75 },
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {exercise.muscleGroups.map((mg) => {
                                            const isTargetMuscle = isTarget(mg.name)
                                            return (
                                                <Chip
                                                    key={mg.id}
                                                    label={mg.name}
                                                    size="small"
                                                    sx={{
                                                        'height': 22,
                                                        'fontSize': 11,
                                                        'fontWeight': isTargetMuscle ? 500 : 600,
                                                        'backgroundColor': isTargetMuscle ? '#f5f0eb' : '#fff8e1',
                                                        'border': `1px solid ${isTargetMuscle ? '#a0612a' : '#b57b00'}`,
                                                        'boxShadow': `${chipShadow} ${isTargetMuscle ? '#a0612a' : '#b57b00'}`,
                                                        'borderRadius': '3px',
                                                        '& .MuiChip-label': { px: 0.75 },
                                                    }}
                                                />
                                            )
                                        })}
                                    </Box>
                                </Box>
                            </SwipeableRow>
                        </Box>
                    ))}
                </Box>
            )}

            <ExerciseFormDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false)
                    setEditingExercise(null)
                }}
                muscleGroups={muscleGroups}
                editingExercise={editingExercise}
                onSaved={fetchData}
            />
        </Box>
    )
}

// ── Exercise Form Drawer ─────────────────────────────────────────────────────

type ExerciseFormDrawerProps = {
    open: boolean
    onClose: () => void
    muscleGroups: MuscleGroupWithParents[]
    editingExercise: Exercise | null
    onSaved: () => void
}

function ExerciseFormDrawer({
    open,
    onClose,
    muscleGroups,
    editingExercise,
    onSaved,
}: ExerciseFormDrawerProps) {
    const [name, setName] = useState('')
    const [isBodyweight, setIsBodyweight] = useState(false)
    const [selectedMgIds, setSelectedMgIds] = useState<Set<number>>(new Set())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Groups only (no targets that also appear under groups)
    const groups = muscleGroups.filter((mg) => !isTarget(mg.name))

    useEffect(() => {
        if (open) {
            if (editingExercise) {
                setName(editingExercise.name)
                setIsBodyweight(editingExercise.isBodyweight)
                setSelectedMgIds(new Set(editingExercise.muscleGroups.map((mg) => mg.id)))
            } else {
                setName('')
                setIsBodyweight(false)
                setSelectedMgIds(new Set())
            }
            setError('')
        }
    }, [open, editingExercise])

    const toggleMuscle = useCallback(
        (mgName: string, mgId: number) => {
            setSelectedMgIds((prev) => {
                const next = new Set(prev)
                if (next.has(mgId)) {
                    next.delete(mgId)
                    // If deselecting a group, also deselect its targets
                    if (!isTarget(mgName)) {
                        const targets = GROUP_TARGETS[mgName] || []
                        for (const t of targets) {
                            const tid = muscleGroups.find((g) => g.name === t)?.id
                            if (tid) next.delete(tid)
                        }
                    }
                } else {
                    next.add(mgId)
                    // If selecting a target, auto-select parent group(s)
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

    const handleSubmit = useCallback(async () => {
        if (!name.trim() || selectedMgIds.size === 0) return
        setSaving(true)
        setError('')

        const url = editingExercise
            ? `/api/health/exercises/${editingExercise.id}`
            : '/api/health/exercises'
        const method = editingExercise ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    isBodyweight,
                    muscleGroupIds: Array.from(selectedMgIds),
                }),
            })

            if (res.ok) {
                onSaved()
                onClose()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to save')
            }
        } catch {
            setError('Failed to save')
        } finally {
            setSaving(false)
        }
    }, [name, isBodyweight, selectedMgIds, editingExercise, onSaved, onClose])

    // Collect selected groups and their targets for the two-row layout
    const selectedGroups = groups.filter((g) => selectedMgIds.has(g.id))

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
                    <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                        {editingExercise ? 'Edit Exercise' : 'New Exercise'}
                    </Typography>
                </Box>

                {/* Body */}
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
                    {/* Name */}
                    <Box>
                        <Typography sx={labelSx}>Name</Typography>
                        <TextField
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="Bench Press, Dumbbell Curl..."
                            sx={fieldSx}
                        />
                    </Box>

                    {/* Bodyweight toggle */}
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

                    {/* Muscle group selection — main groups as a chip grid */}
                    <Box>
                        <Typography sx={labelSx}>Muscle Groups</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {groups.map((group) => {
                                const isGroupSelected = selectedMgIds.has(group.id)
                                return (
                                    <Chip
                                        key={group.id}
                                        label={group.name}
                                        onClick={() => toggleMuscle(group.name, group.id)}
                                        size="small"
                                        sx={{
                                            'height': 30,
                                            'fontSize': 12,
                                            'fontWeight': 700,
                                            'backgroundColor': isGroupSelected ? colors.primaryYellow : colors.primaryWhite,
                                            'border': `1.5px solid ${isGroupSelected ? '#b57b00' : colors.primaryBlack}`,
                                            'boxShadow': `1.5px 1.5px 0px ${isGroupSelected ? '#b57b00' : colors.primaryBlack}`,
                                            'borderRadius': '4px',
                                            'cursor': 'pointer',
                                            '& .MuiChip-label': { px: 1.5 },
                                        }}
                                    />
                                )
                            })}
                        </Box>

                        {/* Target muscles — shown below, grouped by parent */}
                        {selectedGroups.length > 0 && (
                            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {selectedGroups.map((group) => {
                                    const targets = GROUP_TARGETS[group.name] || []
                                    if (targets.length === 0) return null
                                    return (
                                        <Box key={group.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                                            {/* Parent label */}
                                            <Typography sx={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color: '#b57b00',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.3,
                                                lineHeight: '26px',
                                                whiteSpace: 'nowrap',
                                                minWidth: 'fit-content',
                                            }}>
                                                {group.name}
                                            </Typography>
                                            <Box sx={{
                                                width: '1px',
                                                alignSelf: 'stretch',
                                                backgroundColor: '#b57b00',
                                                flexShrink: 0,
                                                opacity: 0.4,
                                            }} />
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {targets.map((targetName) => {
                                                    const target = muscleGroups.find((g) => g.name === targetName)
                                                    if (!target) return null
                                                    const isTargetSelected = selectedMgIds.has(target.id)
                                                    return (
                                                        <Chip
                                                            key={targetName}
                                                            label={targetName}
                                                            onClick={() => toggleMuscle(targetName, target.id)}
                                                            size="small"
                                                            sx={{
                                                                'height': 26,
                                                                'fontSize': 11,
                                                                'fontWeight': isTargetSelected ? 700 : 400,
                                                                'backgroundColor': isTargetSelected ? '#e8c196' : 'transparent',
                                                                'border': `1px solid ${isTargetSelected ? '#a0612a' : `${colors.primaryBlack}25`}`,
                                                                'boxShadow': isTargetSelected ? `${chipShadow} #a0612a` : 'none',
                                                                'borderRadius': '3px',
                                                                'cursor': 'pointer',
                                                                '& .MuiChip-label': { px: 1 },
                                                            }}
                                                        />
                                                    )
                                                })}
                                            </Box>
                                        </Box>
                                    )
                                })}
                            </Box>
                        )}
                    </Box>

                    {error && (
                        <Typography sx={{ fontSize: 13, color: colors.primaryRed }}>
                            {error}
                        </Typography>
                    )}
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
                    <Button onClick={onClose} disabled={saving} size="large" sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!name.trim() || selectedMgIds.size === 0 || saving}
                        size="large"
                        sx={primaryButtonSx}>
                        {saving ? 'Saving...' : editingExercise ? 'Save' : 'Add'}
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
    )
}
