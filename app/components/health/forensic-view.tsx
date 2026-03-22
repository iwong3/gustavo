'use client'

import { cardSx, colors } from '@/lib/colors'
import type { DaySnapshot, SymptomForensicView } from '@/lib/health-types'
import { Box, Chip, CircularProgress, Typography } from '@mui/material'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useCallback, useState } from 'react'

// ── Exported sub-components for inline forensic view ─────────────────────────

export function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: colors.primaryBrown,
                mb: 1,
            }}>
            {children}
        </Typography>
    )
}

export function DaySnapshotCard({ snapshot, isSymptomDay }: { snapshot: DaySnapshot; isSymptomDay: boolean }) {
    const hasFoods = snapshot.foods.length > 0 || snapshot.mealGroups.length > 0
    const hasSupplements = snapshot.supplements.length > 0
    const hasWorkout = snapshot.workout !== null
    const isEmpty = !hasFoods && !hasSupplements && !hasWorkout

    return (
        <Box
            sx={{
                p: 1.5,
                ...cardSx,
                backgroundColor: isSymptomDay ? '#fff3e0' : colors.primaryWhite,
                borderColor: isSymptomDay ? '#ff9800' : colors.primaryBlack,
                boxShadow: isSymptomDay
                    ? '2px 2px 0px #ff9800'
                    : `2px 2px 0px ${colors.primaryBlack}`,
            }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75 }}>
                {formatDateShort(snapshot.date)}
                {isSymptomDay && (
                    <Box component="span" sx={{ color: '#e65100', ml: 0.75, fontWeight: 600 }}>
                        (symptom day)
                    </Box>
                )}
            </Typography>

            {isEmpty ? (
                <Typography sx={{ fontSize: 12, color: colors.primaryBrown, fontStyle: 'italic' }}>
                    No data logged
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {/* Diet */}
                    {hasFoods && (
                        <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown, mb: 0.25 }}>
                                Diet
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {snapshot.foods.map((f) => (
                                    <Chip
                                        key={f.id}
                                        label={f.quantity > 1 ? `${f.food.name} ×${f.quantity}` : f.food.name}
                                        size="small"
                                        sx={foodChipSx}
                                    />
                                ))}
                                {snapshot.mealGroups.map((mg) => (
                                    <Chip
                                        key={mg.id}
                                        label={`${mg.label} (${mg.foods.map((f) => f.food.name).join(', ')})`}
                                        size="small"
                                        sx={mealChipSx}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Supplements */}
                    {hasSupplements && (
                        <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown, mb: 0.25 }}>
                                Supplements
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {snapshot.supplements.map((s, i) => (
                                    <Chip
                                        key={i}
                                        label={s.quantity > 1 ? `${s.name} ×${s.quantity}` : s.name}
                                        size="small"
                                        sx={supplementChipSx}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Workout */}
                    {hasWorkout && snapshot.workout && (
                        <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown, mb: 0.25 }}>
                                Workout
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {snapshot.workout.muscleGroups.map((mg) => (
                                    <Chip
                                        key={mg}
                                        label={mg}
                                        size="small"
                                        sx={workoutChipSx}
                                    />
                                ))}
                            </Box>
                            {snapshot.workout.notes && (
                                <Typography sx={{ fontSize: 11, color: colors.primaryBrown, mt: 0.25 }}>
                                    {snapshot.workout.notes}
                                </Typography>
                            )}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    )
}

/** Inline forensic content — renders common factors, lookback, and past occurrences */
export function InlineForensicContent({ data }: { data: SymptomForensicView }) {
    const [expandedOccurrences, setExpandedOccurrences] = useState<Set<string>>(new Set())

    const toggleOccurrence = useCallback((date: string) => {
        setExpandedOccurrences((prev) => {
            const next = new Set(prev)
            if (next.has(date)) next.delete(date)
            else next.add(date)
            return next
        })
    }, [])

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Common factors banner */}
            {data.commonFoods.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: '4px',
                        backgroundColor: '#fff3e0',
                        border: '1.5px solid #ff9800',
                        boxShadow: '2px 2px 0px #ff9800',
                    }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75, color: '#e65100' }}>
                        Common Factors
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {data.commonFoods.map((cf) => (
                            <Chip
                                key={cf.foodName}
                                label={`${cf.foodName} (${cf.occurrenceCount}/${cf.totalOccurrences})`}
                                size="small"
                                sx={{
                                    'height': 24,
                                    'fontSize': 12,
                                    'fontWeight': 600,
                                    'backgroundColor': '#ffe0b2',
                                    'border': '1px solid #ff9800',
                                    'borderRadius': '3px',
                                    '& .MuiChip-label': { px: 1 },
                                }}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            {/* Current lookback */}
            <Box>
                <SectionHeader>Lookback</SectionHeader>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {data.lookback.map((snap) => (
                        <DaySnapshotCard key={snap.date} snapshot={snap} isSymptomDay={snap.date === data.currentDate} />
                    ))}
                </Box>
            </Box>

            {/* Past occurrences */}
            {data.pastOccurrences.length > 0 && (
                <Box>
                    <SectionHeader>
                        Past Occurrences ({data.pastOccurrences.length})
                    </SectionHeader>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {data.pastOccurrences.map((occ) => {
                            const isExpanded = expandedOccurrences.has(occ.date)
                            return (
                                <Box key={occ.date}>
                                    <Box
                                        onClick={() => toggleOccurrence(occ.date)}
                                        sx={{
                                            'display': 'flex',
                                            'alignItems': 'center',
                                            'gap': 1,
                                            'p': 1.5,
                                            ...cardSx,
                                            'cursor': 'pointer',
                                            '&:active': {
                                                backgroundColor: colors.secondaryYellow,
                                            },
                                        }}>
                                        {isExpanded ? (
                                            <IconChevronDown size={16} stroke={2} />
                                        ) : (
                                            <IconChevronRight size={16} stroke={2} />
                                        )}
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                                {formatDateShort(occ.date)}
                                            </Typography>
                                            {occ.notes && (
                                                <Typography
                                                    sx={{
                                                        fontSize: 12,
                                                        color: colors.primaryBrown,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                    {occ.notes}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                    {isExpanded && (
                                        <Box sx={{ pl: 2, mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {occ.lookback.map((snap) => (
                                                <DaySnapshotCard
                                                    key={snap.date}
                                                    snapshot={snap}
                                                    isSymptomDay={snap.date === occ.date}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            )
                        })}
                    </Box>
                </Box>
            )}

            {data.pastOccurrences.length === 0 && (
                <Typography sx={{ fontSize: 13, color: colors.primaryBrown, textAlign: 'center', py: 2 }}>
                    This is the first occurrence of this symptom.
                </Typography>
            )}
        </Box>
    )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })
}

const chipBase = {
    'height': 22,
    'fontSize': 11,
    'fontWeight': 500,
    'borderRadius': '3px',
    'color': colors.primaryBlack,
    '& .MuiChip-label': { px: 0.75 },
} as const

const foodChipSx = {
    ...chipBase,
    backgroundColor: '#f0e4d4',
    border: '1px solid #a1887f',
    boxShadow: '1px 1px 0px #a1887f',
} as const

const mealChipSx = {
    ...chipBase,
    backgroundColor: '#e3f2fd',
    border: '1px solid #42a5f5',
    boxShadow: '1px 1px 0px #42a5f5',
} as const

const supplementChipSx = {
    ...chipBase,
    backgroundColor: '#f1f8e9',
    border: '1px solid #4caf50',
    boxShadow: '1px 1px 0px #4caf50',
} as const

const workoutChipSx = {
    ...chipBase,
    backgroundColor: '#dae6a3',
    border: '1px solid #8bc34a',
    boxShadow: '1px 1px 0px #8bc34a',
} as const
