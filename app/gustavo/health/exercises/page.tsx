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
import { IconStretching } from '@tabler/icons-react'
import { useRegisterFab } from 'providers/fab-provider'
import {
    Box,
    Button,
    Chip,
    TextField,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import FormDrawer from 'components/form-drawer'
import { HealthPageLayout, HealthPageHeader } from 'components/health/health-page-layout'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { SlidingToggle } from 'components/sliding-toggle'

const chipShadow = `1px 1px 0px`

// Selected state colors — warm palette (matches workout form)
const selectedBorder = '#b57b00'
const selectedBg = '#fff8e1'
const selectedTargetBg = '#e8c196'
const selectedTargetBorder = '#a0612a'

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
                                    'backgroundColor': isTargetSelected ? selectedTargetBg : 'transparent',
                                    'border': `1px solid ${isTargetSelected ? selectedTargetBorder : `${colors.primaryBlack}25`}`,
                                    'boxShadow': isTargetSelected ? `1px 1px 0px ${selectedTargetBorder}` : 'none',
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

    return (
        <HealthPageLayout loading={loading}>
            <HealthPageHeader
                icon={<IconStretching size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />}
                title="Exercises"
                color="#fff9c4"
            />

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
                                borderColor={colors.primaryBlack}
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
        </HealthPageLayout>
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
        if (!name.trim()) return
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

    const mgCardProps = { muscleGroups, selectedIds: selectedMgIds, onToggle: toggleMuscle }

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

                    {/* Muscle group grid — same layout as workout form */}
                    <Box>
                        <Typography sx={labelSx}>Muscle Groups</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {/* Push: Chest / Shoulders / Triceps */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Chest" {...mgCardProps} />
                                <MuscleGroupCard groupName="Shoulders" {...mgCardProps} />
                                <MuscleGroupCard groupName="Triceps" {...mgCardProps} />
                            </Box>
                            {/* Pull: Upper Back / Biceps / Forearms */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Upper Back" {...mgCardProps} sx={{ gridColumn: 'span 2' }} />
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <MuscleGroupCard groupName="Biceps" {...mgCardProps} sx={{ flex: 1 }} />
                                    <MuscleGroupCard groupName="Forearms" {...mgCardProps} sx={{ flex: 1 }} />
                                </Box>
                            </Box>
                            {/* Legs / Lower Back */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Legs" {...mgCardProps} sx={{ gridColumn: 'span 2' }} />
                                <MuscleGroupCard groupName="Lower Back" {...mgCardProps} />
                            </Box>
                            {/* Core / Cardio */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                <MuscleGroupCard groupName="Core" {...mgCardProps} sx={{ gridColumn: 'span 2' }} />
                                <MuscleGroupCard groupName="Cardio" {...mgCardProps} />
                            </Box>
                        </Box>
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
                        {saving ? 'Saving...' : editingExercise ? 'Save' : 'Add'}
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
    )
}
