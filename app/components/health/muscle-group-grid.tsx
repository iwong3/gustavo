'use client'

/**
 * Muscle-group selection shared by the workout and routine forms: the 4-row
 * push / pull / legs / other grid of group cards (each with its target chips),
 * the selection colors, and the toggle rule (a target selects its parent
 * group; deselecting a group drops its targets).
 */
import { Box, Chip, Typography } from '@mui/material'

import { colors } from '@/lib/colors'
import type { MuscleGroup, MuscleGroupWithParents } from '@/lib/health-types'
import { getParents, GROUP_TARGETS, isTarget } from '@/lib/health/muscle-groups'

// Selected state colors — warm palette
export const selectedBorder = '#b57b00'
export const selectedBg = '#fff8e1'
export const selectedTargetBg = '#e8c196'
export const selectedTargetBorder = '#a0612a'

// Exercise colors — warm green palette (matches app theme)
export const exerciseBg = '#e8f0dc'
export const exerciseBorder = '#5a6e3c'

/**
 * Pure toggle rule for a muscle-group selection set. Returns a new Set.
 * Selecting a target also selects its parent group(s); deselecting a group
 * also deselects its targets.
 */
export function toggleMuscleSelection(
    prev: Set<number>,
    name: string,
    id: number,
    muscleGroups: MuscleGroupWithParents[]
): Set<number> {
    const numId = Number(id)
    const next = new Set(prev)
    const idOf = (groupName: string) => {
        const g = muscleGroups.find((mg) => mg.name === groupName)
        return g ? Number(g.id) : null
    }
    if (next.has(numId)) {
        next.delete(numId)
        if (!isTarget(name)) {
            for (const t of GROUP_TARGETS[name] || []) {
                const tid = idOf(t)
                if (tid !== null) next.delete(tid)
            }
        }
    } else {
        next.add(numId)
        if (isTarget(name)) {
            for (const p of getParents(name)) {
                const pid = idOf(p)
                if (pid !== null) next.add(pid)
            }
        }
    }
    return next
}

export function MuscleGroupCard({
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
                'backgroundColor': isGroupSelected
                    ? selectedBg
                    : colors.primaryWhite,
                'border': `1.5px solid ${isGroupSelected ? selectedBorder : colors.primaryBlack}`,
                'boxShadow': `2px 2px 0px ${isGroupSelected ? selectedBorder : colors.primaryBlack}`,
                'borderRadius': '4px',
                'cursor': 'pointer',
                'transition':
                    'background-color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s',
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
                        const target = muscleGroups.find(
                            (g) => g.name === targetName
                        )
                        if (!target) return null
                        const isTargetSelected = selectedIds.has(
                            Number(target.id)
                        )
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

const threeCol = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 1,
} as const

/** The push / pull / legs / other grid of group cards. */
export function MuscleGroupGrid({
    muscleGroups,
    selectedIds,
    onToggle,
}: {
    muscleGroups: MuscleGroupWithParents[]
    selectedIds: Set<number>
    onToggle: (name: string, id: number) => void
}) {
    const card = (groupName: string, sx?: Record<string, unknown>) => (
        <MuscleGroupCard
            groupName={groupName}
            muscleGroups={muscleGroups}
            selectedIds={selectedIds}
            onToggle={onToggle}
            sx={sx}
        />
    )
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Push */}
            <Box sx={threeCol}>
                {card('Chest')}
                {card('Shoulders')}
                {card('Triceps')}
            </Box>
            {/* Pull — Upper Back spans 2, Biceps/Forearms stack beside it */}
            <Box sx={threeCol}>
                {card('Upper Back', { gridColumn: 'span 2' })}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {card('Biceps', { flex: 1 })}
                    {card('Forearms', { flex: 1 })}
                </Box>
            </Box>
            {/* Legs */}
            <Box sx={threeCol}>
                {card('Legs', { gridColumn: 'span 2' })}
                {card('Lower Back')}
            </Box>
            {/* Other */}
            <Box sx={threeCol}>
                {card('Core', { gridColumn: 'span 2' })}
                {card('Cardio')}
            </Box>
        </Box>
    )
}

/** "BW" marker for bodyweight exercises. */
export function BodyweightChip() {
    return (
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
    )
}

/** Tiny muscle-group tags under an exercise row; lit when the group is selected. */
export function MuscleTagList({
    groups,
    selectedIds,
}: {
    groups: MuscleGroup[]
    selectedIds: Set<number>
}) {
    if (groups.length === 0) return null
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
            {groups.map((mg) => {
                const lit = selectedIds.has(Number(mg.id))
                return (
                    <Typography
                        key={mg.id}
                        sx={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: lit ? exerciseBorder : colors.primaryBrown,
                            backgroundColor: lit
                                ? `${exerciseBorder}15`
                                : `${colors.primaryBrown}10`,
                            border: `1px solid ${lit ? exerciseBorder : `${colors.primaryBrown}40`}`,
                            boxShadow: `1px 1px 0px ${lit ? exerciseBorder : `${colors.primaryBrown}30`}`,
                            borderRadius: '2px',
                            px: 0.5,
                            py: 0.125,
                            lineHeight: 1.3,
                        }}>
                        {mg.name}
                    </Typography>
                )
            })}
        </Box>
    )
}

/** Search box styling for the exercise picker's card header — borderless. */
export const inlineSearchSx = {
    'flex': 1,
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '& .MuiOutlinedInput-root': { boxShadow: 'none', padding: 0 },
    '& .MuiInputBase-input': { py: 0.5, fontSize: 13 },
} as const

/** Checkbox styling for exercise rows. */
export const exerciseCheckboxSx = {
    'width': '32px',
    'height': '32px',
    'color': `${colors.primaryBrown}60`,
    '&.Mui-checked': { color: selectedBorder },
} as const
