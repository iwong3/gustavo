'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Workout } from '@/lib/health-types'
import { isTarget } from '@/lib/health/muscle-groups'
import { Box, Chip, Typography } from '@mui/material'
import { IconBarbell, IconBolt } from '@tabler/icons-react'
import {
    HorizontalSortableList,
    SortablePresetChip,
} from 'components/health/sortable-preset'
import { WorkoutDetailDrawer } from 'components/health/workout-detail-drawer'
import { HealthPageLayout, HealthPageHeader } from 'components/health/health-page-layout'
import { selectedBg, selectedBorder } from 'components/health/muscle-group-grid'
import {
    todayIso,
    useReorderWorkoutPresets,
} from 'components/health/workout-presets'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { useWorkoutData } from 'hooks/useWorkoutData'
import { useRegisterFab } from 'providers/fab-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'

const LIST_URL = '/gustavo/health/exercise'
const NEW_URL = `${LIST_URL}/new`
const ROUTINES_URL = `${LIST_URL}/routines`

function ExercisePage() {
    const queryClient = useQueryClient()
    const router = useRouter()

    const [detailWorkout, setDetailWorkout] = useState<Workout | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)

    // Legacy deep link (?presets=open, from older dashboard builds) → the
    // routines page that replaced the preset drawer.
    const searchParams = useSearchParams()
    useEffect(() => {
        if (searchParams.get('presets') === 'open') router.replace(ROUTINES_URL)
    }, [searchParams, router])

    // Warm the form routes so the FAB / edit taps open instantly
    useEffect(() => {
        router.prefetch(NEW_URL)
        router.prefetch(ROUTINES_URL)
    }, [router])

    const { workouts, presets, loading } = useWorkoutData()

    const invalidateWorkouts = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all })
    }, [queryClient])
    const invalidateAll = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.health.workouts.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.exercises })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.presets.all })
    }, [queryClient])

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/health/workouts/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
        },
        onSuccess: invalidateWorkouts,
    })
    const handleDelete = useCallback(
        (id: number) => deleteMutation.mutateAsync(id),
        [deleteMutation],
    )

    const applyPresetMutation = useMutation({
        mutationFn: async (presetId: number) => {
            const res = await fetch(`/api/health/presets/${presetId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: todayIso() }),
            })
            if (!res.ok) throw new Error('Apply failed')
            return presetId
        },
        onSuccess: invalidateWorkouts,
        onError: (err) => console.error('Failed to apply preset:', err),
    })
    const applyPreset = useCallback(
        (presetId: number) => {
            applyPresetMutation.mutate(presetId)
        },
        [applyPresetMutation],
    )
    const applyingPreset = applyPresetMutation.isPending
        ? (applyPresetMutation.variables ?? null)
        : null

    const reorderPresets = useReorderWorkoutPresets()

    // Add / edit / duplicate are page-style forms (see code-guide.md
    // § Page-style forms), not drawers
    const openAdd = useCallback(() => router.push(NEW_URL), [router])
    const openEdit = useCallback(
        (workout: Workout) => router.push(`${LIST_URL}/${workout.id}/edit`),
        [router],
    )
    const openDuplicate = useCallback(
        (workout: Workout) => router.push(`${NEW_URL}?from=${workout.id}`),
        [router],
    )
    const openRoutines = useCallback(() => router.push(ROUTINES_URL), [router])

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
                            new Date(prev + 'T00:00:00').getTime()) /
                            86400000
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

    return (
        <HealthPageLayout loading={loading} onRefresh={invalidateAll}>
            <HealthPageHeader
                icon={<IconBarbell size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />}
                title="Workouts"
                color="#ffe0b2">
                {/* Routine quick-actions */}
                {presets.length > 0 && (
                    <HorizontalSortableList
                        items={presets}
                        onReorder={reorderPresets}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                alignItems: 'center',
                            }}>
                            {/* Lightning circle icon — opens preset drawer */}
                            <Box
                                onClick={openRoutines}
                                sx={{
                                    'width': 30,
                                    'height': 30,
                                    'borderRadius': '50%',
                                    'backgroundColor': '#ffe0b2',
                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                    'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                    'display': 'flex',
                                    'alignItems': 'center',
                                    'justifyContent': 'center',
                                    'flexShrink': 0,
                                    'cursor': 'pointer',
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
                            {presets.map((preset) => (
                                <SortablePresetChip key={preset.id} id={preset.id}>
                                    <Box
                                        onClick={() =>
                                            applyingPreset === null &&
                                            applyPreset(preset.id)
                                        }
                                        sx={{
                                            'px': 1.25,
                                            'py': 0.5,
                                            'backgroundColor':
                                                applyingPreset === preset.id
                                                    ? colors.primaryYellow
                                                    : colors.primaryWhite,
                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                            'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                            'borderRadius': '4px',
                                            'cursor':
                                                applyingPreset !== null
                                                    ? 'default'
                                                    : 'pointer',
                                            'opacity':
                                                applyingPreset !== null &&
                                                applyingPreset !== preset.id
                                                    ? 0.5
                                                    : 1,
                                            'transition': 'all 0.15s',
                                            '&:active':
                                                applyingPreset === null
                                                    ? {
                                                          boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                                          transform:
                                                              'translate(1px, 1px)',
                                                      }
                                                    : {},
                                        }}>
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}>
                                            {preset.name}
                                        </Typography>
                                    </Box>
                                </SortablePresetChip>
                            ))}
                        </Box>
                    </HorizontalSortableList>
                )}
            </HealthPageHeader>

            {/* Workout timeline */}
            {workouts.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: colors.primaryBrown,
                        textAlign: 'center',
                        py: 4,
                    }}>
                    No workouts logged yet.
                </Typography>
            ) : (
                <Box sx={{ position: 'relative' }}>
                    {/* Vertical timeline line */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 15, // center of 32px gutter
                            top: 6, // align with first node center
                            bottom: 6,
                            width: 2,
                            backgroundColor: `${colors.primaryBlack}25`,
                        }}
                    />

                    {workouts.map((workout, i) => {
                        const parentGroups = workout.muscleGroups.filter(
                            (mg) => !isTarget(mg.name)
                        )

                        const d = new Date(workout.date + 'T00:00:00')
                        const weekday = d.toLocaleDateString('en-US', {
                            weekday: 'short',
                        })
                        const monthDay = d.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                        })

                        // Days gap to next entry
                        const daysBetween =
                            i < workouts.length - 1
                                ? Math.round(
                                      (new Date(
                                          workout.date + 'T00:00:00'
                                      ).getTime() -
                                          new Date(
                                              workouts[i + 1].date + 'T00:00:00'
                                          ).getTime()) /
                                          86400000
                                  )
                                : 0

                        return (
                            <Box key={workout.id}>
                                {/* ── Card row with date aligned to top ── */}
                                <Box sx={{ display: 'flex' }}>
                                    {/* Timeline gutter with days-since node */}
                                    <Box
                                        sx={{
                                            width: 32,
                                            flexShrink: 0,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            pt: '1px',
                                        }}>
                                        {daysBetween >= 2 ? (
                                            (() => {
                                                const restDays = daysBetween - 1
                                                const bg =
                                                    restDays <= 2
                                                        ? '#e8f5e9'
                                                        : restDays <= 5
                                                          ? '#fff3e0'
                                                          : '#fbe9e7'
                                                const borderColor =
                                                    restDays <= 2
                                                        ? '#4caf50'
                                                        : restDays <= 5
                                                          ? '#f57c00'
                                                          : colors.primaryRed
                                                return (
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            justifyContent:
                                                                'center',
                                                            minWidth: 18,
                                                            height: 18,
                                                            borderRadius: '50%',
                                                            backgroundColor: bg,
                                                            border: `1.5px solid ${borderColor}`,
                                                            boxShadow: `1.5px 1.5px 0px ${borderColor}`,
                                                            zIndex: 1,
                                                        }}>
                                                        <Typography
                                                            sx={{
                                                                fontSize: 9,
                                                                fontWeight: 800,
                                                                lineHeight: 1,
                                                                color: borderColor,
                                                            }}>
                                                            {restDays}
                                                        </Typography>
                                                    </Box>
                                                )
                                            })()
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    backgroundColor:
                                                        colors.primaryYellow,
                                                    border: `1.5px solid ${colors.primaryBlack}`,
                                                    zIndex: 1,
                                                    mt: '5px',
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {/* Date label */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                mb: 1,
                                            }}>
                                            <Box
                                                sx={{
                                                    px: 0.75,
                                                    py: 0.25,
                                                    backgroundColor:
                                                        colors.primaryYellow,
                                                    border: `1px solid ${colors.primaryBlack}`,
                                                    boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                                    borderRadius: '3px',
                                                }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        textTransform:
                                                            'uppercase',
                                                        letterSpacing: 0.3,
                                                        lineHeight: 1.2,
                                                    }}>
                                                    {weekday}
                                                </Typography>
                                            </Box>
                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: colors.primaryBrown,
                                                }}>
                                                {monthDay}
                                            </Typography>
                                        </Box>
                                        {/* Card */}
                                        <Box
                                            sx={{
                                                ...cardSx,
                                                overflow: 'hidden',
                                            }}>
                                            <SwipeableRow
                                                canEdit
                                                canDelete
                                                onEdit={() => openEdit(workout)}
                                                onDelete={() =>
                                                    handleDelete(workout.id)
                                                }
                                                backgroundColor={
                                                    colors.primaryWhite
                                                }
                                                borderColor={colors.primaryBlack}>
                                                <Box
                                                    onClick={() =>
                                                        openDetail(workout)
                                                    }
                                                    sx={{
                                                        'p': 1.5,
                                                        'cursor': 'pointer',
                                                        'backgroundColor':
                                                            colors.primaryWhite,
                                                        '&:active': {
                                                            backgroundColor:
                                                                colors.secondaryYellow,
                                                        },
                                                        'transition':
                                                            'background-color 150ms ease',
                                                    }}>
                                                    {/* Muscle group chips */}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            flexWrap: 'wrap',
                                                            gap: 0.75,
                                                        }}>
                                                        {parentGroups.map(
                                                            (mg) => {
                                                                const workoutDays =
                                                                    daysSincePrevMap.get(
                                                                        workout.id
                                                                    )
                                                                const days =
                                                                    workoutDays?.get(
                                                                        mg.name
                                                                    )
                                                                return (
                                                                    <Box
                                                                        key={
                                                                            mg.id
                                                                        }
                                                                        sx={{
                                                                            position:
                                                                                'relative',
                                                                        }}>
                                                                        <Chip
                                                                            label={
                                                                                mg.name
                                                                            }
                                                                            size="small"
                                                                            sx={{
                                                                                'height': 22,
                                                                                'fontSize': 11,
                                                                                'fontWeight': 700,
                                                                                'backgroundColor':
                                                                                    selectedBg,
                                                                                'border': `1px solid ${selectedBorder}`,
                                                                                'boxShadow': `1px 1px 0px ${selectedBorder}`,
                                                                                'borderRadius':
                                                                                    '3px',
                                                                                'color':
                                                                                    colors.primaryBlack,
                                                                                '& .MuiChip-label':
                                                                                    {
                                                                                        px: 0.75,
                                                                                    },
                                                                            }}
                                                                        />
                                                                        {days !==
                                                                            undefined && (
                                                                            <Box
                                                                                sx={{
                                                                                    position:
                                                                                        'absolute',
                                                                                    bottom: -6,
                                                                                    right: -4,
                                                                                    display:
                                                                                        'flex',
                                                                                    alignItems:
                                                                                        'center',
                                                                                    justifyContent:
                                                                                        'center',
                                                                                    minWidth: 16,
                                                                                    height: 14,
                                                                                    px: 0.25,
                                                                                    borderRadius:
                                                                                        '7px',
                                                                                    backgroundColor:
                                                                                        colors.primaryWhite,
                                                                                    border: `1px solid ${colors.primaryBlack}`,
                                                                                    zIndex: 1,
                                                                                }}>
                                                                                <Typography
                                                                                    sx={{
                                                                                        fontSize: 8,
                                                                                        fontWeight: 800,
                                                                                        lineHeight: 1,
                                                                                        color: colors.primaryBlack,
                                                                                    }}>
                                                                                    {
                                                                                        days
                                                                                    }
                                                                                </Typography>
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                )
                                                            }
                                                        )}
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

            {/* Workout detail drawer — edit/duplicate hand off to the
                page-style form routes */}
            <WorkoutDetailDrawer
                workout={detailWorkout}
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false)
                    setDetailWorkout(null)
                }}
                onEdit={openEdit}
                onDuplicate={openDuplicate}
                onDelete={handleDelete}
                allWorkouts={workouts}
            />

        </HealthPageLayout>
    )
}

export default function Page() {
    // useSearchParams needs a Suspense boundary
    return (
        <Suspense fallback={<HealthPageLayout loading>{null}</HealthPageLayout>}>
            <ExercisePage />
        </Suspense>
    )
}
