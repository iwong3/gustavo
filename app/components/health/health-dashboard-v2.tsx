'use client'

import { cardSx, colors, hardShadow } from '@/lib/colors'
import type {
    DaysSince,
    DietDay,
    DietPreset,
    SupplementLog,
    SupplementPreset,
    SymptomLog,
    WeightLog,
    WorkoutPreset,
} from '@/lib/health-types'
import type { HealthSection } from '@/lib/health-section-order'
import { getSectionOrder, saveSectionOrder } from '@/lib/health-section-order'
import { DAYS_SINCE_ROWS } from '@/lib/health/muscle-groups'
import { Box, Chip, Typography } from '@mui/material'
import {
    IconBarbell,
    IconBolt,
    IconFirstAidKit,
    IconGripVertical,
    IconPill,
    IconSalad,
    IconScale,
    IconStretching,
} from '@tabler/icons-react'
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import Link from 'next/link'
import React, { useCallback, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type HealthDashboardProps = {
    loading: boolean
    daysSince: DaysSince[]
    daysSinceMap: Map<string, DaysSince>
    workoutPresets: WorkoutPreset[]
    dietPresets: DietPreset[]
    supplementPresets: SupplementPreset[]
    recentDiet: DietDay[]
    recentSupplementDays: { date: string; logs: SupplementLog[] }[]
    topExercises: { name: string; count: number }[]
    recentSymptomDays: { date: string; logs: SymptomLog[] }[]
    recentWeightLogs: WeightLog[]
    workoutStats: { streak: number; workoutDays: number; restDays: number }
    applyingId: number | null
    appliedId: number | null
    applyPreset: (presetId: number, type: 'workout' | 'diet' | 'supplement') => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDaysSinceColor(days: number | null): string {
    if (days === null) return '#9e9e9e'
    if (days <= 3) return '#4caf50'
    if (days <= 6) return '#ff9800'
    return '#f44336'
}

function getDaysSinceBorder(days: number | null): string {
    if (days === null) return '#9e9e9ecc'
    if (days <= 3) return '#4caf50cc'
    if (days <= 6) return '#ff9800cc'
    return '#f44336cc'
}

function getDaysSinceBg(days: number | null): string {
    if (days === null) return '#f5f5f5'
    if (days <= 3) return '#e8f5e9'
    if (days <= 6) return '#fff3e0'
    return '#fce4ec'
}

function formatDaysSince(days: number | null): string {
    if (days === null) return 'Never'
    if (days === 0) return 'Today'
    if (days === 1) return '1d ago'
    return `${days}d ago`
}

function formatWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatMonthDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Constants ────────────────────────────────────────────────────────────────

const daysSinceCardWidth = 'calc((100% - 12px) / 3)'


const badgeSx = {
    'display': 'inline-flex',
    'alignItems': 'center',
    'gap': 1,
    'px': 1.5,
    'py': 0.75,
    ...hardShadow,
    'borderRadius': '4px',
    'alignSelf': 'flex-start' as const,
    'textDecoration': 'none',
    'mb': 1.5,
}

const badgeTextSx = {
    fontSize: 15,
    fontWeight: 700,
    color: colors.primaryBlack,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
}

const boltCircleSx = {
    'width': 30,
    'height': 30,
    'borderRadius': '50%',
    'backgroundColor': colors.primaryYellow,
    'border': `1.5px solid ${colors.primaryBlack}`,
    'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'flexShrink': 0,
}

const presetItemSx = {
    'px': 1.25,
    'height': 28,
    'display': 'flex',
    'alignItems': 'center',
    'flexShrink': 0, // keep chip full-size when the row scrolls horizontally
    'whiteSpace': 'nowrap',
    'border': `1.5px solid ${colors.primaryBlack}`,
    'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
    'borderRadius': '4px',
    'transition': 'all 0.15s',
    '&:active': {
        boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
        transform: 'translate(1px, 1px)',
    },
}

// Horizontal scroll container for preset rows. Hides the scrollbar visually
// (these rows sit in a mobile-first layout where a scrollbar looks out of
// place) while still allowing horizontal swipe/scroll.
const presetRowScrollSx = {
    'display': 'flex',
    'gap': 1,
    'alignItems': 'center',
    'mb': 1.5,
    'overflowX': 'auto',
    'flexWrap': 'nowrap',
    'scrollbarWidth': 'none',
    '&::-webkit-scrollbar': { display: 'none' },
    // Leave a bit of shadow room at the bottom so chip shadows aren't clipped
    'pb': 0.5,
}

const logChipSx = {
    'height': 22,
    'fontSize': 11,
    'fontWeight': 500,
    'borderRadius': '3px',
    'flexShrink': 0,
    '& .MuiChip-label': { px: 0.75 },
}

// ── Skeleton Placeholders ─────────────────────────────────────────────────────

const skeletonSx = {
    backgroundColor: `${colors.primaryBlack}08`,
}

function PresetsSkeleton() {
    return (
        <Box sx={presetRowScrollSx}>
            <Box sx={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, ...skeletonSx }} />
            <Box sx={{ width: 70, height: 28, flexShrink: 0, ...skeletonSx }} />
            <Box sx={{ width: 80, height: 28, flexShrink: 0, ...skeletonSx }} />
            <Box sx={{ width: 60, height: 28, flexShrink: 0, ...skeletonSx }} />
        </Box>
    )
}

function DaysSinceSkeleton() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {DAYS_SINCE_ROWS.map((row) => (
                <Box key={row.label} sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                    {row.groups.map((g) => (
                        <Box
                            key={g}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                width: daysSinceCardWidth,
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: `1.5px solid ${colors.primaryBlack}15`,
                                ...skeletonSx,
                            }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, backgroundColor: `${colors.primaryBlack}15` }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 11, lineHeight: 1.2, color: 'transparent', backgroundColor: `${colors.primaryBlack}10`, width: '70%' }}>·</Typography>
                                <Typography sx={{ fontSize: 10, lineHeight: 1.2, color: 'transparent', backgroundColor: `${colors.primaryBlack}08`, width: '50%' }}>·</Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>
    )
}

function StreakRestSkeleton() {
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'stretch',
            height: 34,
            width: 110,
            borderRadius: '4px',
            ...skeletonSx,
        }} />
    )
}

function LogCardSkeleton({ rows = 2 }: { rows?: number }) {
    return (
        <Box sx={{ ...cardSx, overflow: 'hidden' }}>
            {Array.from({ length: rows }).map((_, i) => (
                <Box key={i}>
                    {i > 0 && <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}`, mx: 0 }} />}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.25, py: 1 }}>
                        <Box sx={{ flexShrink: 0, minWidth: 44 }}>
                            <Typography sx={{ fontSize: 10, lineHeight: 1.2, color: 'transparent', backgroundColor: `${colors.primaryBlack}10`, width: '70%' }}>·</Typography>
                            <Typography sx={{ fontSize: 12, lineHeight: 1.3, color: 'transparent', backgroundColor: `${colors.primaryBlack}08`, width: '90%' }}>·</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                            <Box sx={{ width: 60, height: 22, ...skeletonSx }} />
                            <Box sx={{ width: 50, height: 22, ...skeletonSx }} />
                            <Box sx={{ width: 70, height: 22, ...skeletonSx }} />
                        </Box>
                    </Box>
                </Box>
            ))}
        </Box>
    )
}

// ── Sortable Section Wrapper ─────────────────────────────────────────────────

function toCssTransform(
    transform: { x: number; y: number; scaleX: number; scaleY: number } | null
): string | undefined {
    if (!transform) return undefined
    return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
}

function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <Box
            ref={setNodeRef}
            {...attributes}
            sx={{
                transform: toCssTransform(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
                zIndex: isDragging ? 10 : 'auto',
            }}>
            {/* Wrap children, passing drag handle ref via context */}
            <DragHandleContext.Provider value={{ listeners, setActivatorNodeRef }}>
                {children}
            </DragHandleContext.Provider>
        </Box>
    )
}

// Context to pass drag listeners down to badge components
const DragHandleContext = React.createContext<{
    listeners: ReturnType<typeof useSortable>['listeners']
    setActivatorNodeRef: ReturnType<typeof useSortable>['setActivatorNodeRef']
} | null>(null)

/** Small grip icon — dedicated drag handle that doesn't interfere with badge tap/scroll */
function DragGrip() {
    const ctx = React.useContext(DragHandleContext)
    if (!ctx) return null
    return (
        <Box
            ref={ctx.setActivatorNodeRef}
            {...ctx.listeners}
            sx={{
                touchAction: 'none',
                cursor: 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                flexShrink: 0,
                color: colors.primaryBrown,
            }}>
            <IconGripVertical size={18} stroke={2} />
        </Box>
    )
}

/** Wrap the section — grip is pinned to the top-right and does not affect layout. */
function DragHandleBadge({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ position: 'relative' }}>
            {children}
            <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 1 }}>
                <DragGrip />
            </Box>
        </Box>
    )
}

// ── Component ────────────────────────────────────────────────────────────────

export function HealthDashboardV2({
    loading,
    daysSince,
    daysSinceMap,
    workoutPresets,
    dietPresets,
    supplementPresets,
    recentDiet,
    recentSupplementDays,
    topExercises,
    recentSymptomDays,
    recentWeightLogs,
    workoutStats,
    applyingId,
    appliedId,
    applyPreset,
}: HealthDashboardProps) {
    const [sectionOrder, setSectionOrder] = useState<HealthSection[]>(getSectionOrder)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    )

    const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        setSectionOrder((prev) => {
            const oldIndex = prev.indexOf(active.id as HealthSection)
            const newIndex = prev.indexOf(over.id as HealthSection)
            const next = arrayMove(prev, oldIndex, newIndex)
            saveSectionOrder(next)
            return next
        })
    }, [])

    // Section renderers keyed by ID
    const sections: Record<HealthSection, React.ReactNode> = {
        workouts: (
            <Box>
                <DragHandleBadge>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, pr: 4 }}>
                    <Box component={Link} href="/gustavo/health/exercise" sx={{ ...badgeSx, backgroundColor: '#ffe0b2', mb: 0 }}>
                        <IconBarbell size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />
                        <Typography sx={badgeTextSx}>Workouts</Typography>
                    </Box>
                    {loading ? (
                        <StreakRestSkeleton />
                    ) : daysSince.length > 0 && (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'stretch',
                            height: 34,
                            borderRadius: '4px',
                            ...hardShadow,
                            overflow: 'hidden',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, pl: 0.5, pr: 0.75, background: 'linear-gradient(135deg, #ffe0b2, #ffccbc)' }}>
                                <Typography sx={{ fontSize: 16, lineHeight: 1 }}>
                                    💪
                                </Typography>
                                <Typography sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1, minWidth: '1.2em', textAlign: 'center' }}>
                                    {workoutStats.workoutDays}
                                </Typography>
                            </Box>
                            <Box sx={{ width: '1px', backgroundColor: colors.primaryBlack }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, pl: 0.5, pr: 0.75, background: 'linear-gradient(135deg, #d1c4e9, #bbdefb)' }}>
                                <Typography sx={{ fontSize: 16, lineHeight: 1 }}>
                                    🛋️
                                </Typography>
                                <Typography sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1, minWidth: '1.2em', textAlign: 'center' }}>
                                    {workoutStats.restDays}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
                </DragHandleBadge>

                {loading ? (
                    <PresetsSkeleton />
                ) : workoutPresets.length > 0 ? (
                    <Box sx={presetRowScrollSx}>
                        <Box
                            component={Link}
                            href="/gustavo/health/exercise?presets=open"
                            sx={{ ...boltCircleSx, backgroundColor: '#ffe0b2', cursor: 'pointer' }}>
                            <IconBolt size={14} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
                        </Box>
                        {workoutPresets.map((preset) => (
                            <Box
                                key={preset.id}
                                onClick={() => applyingId === null && applyPreset(preset.id, 'workout')}
                                sx={{
                                    ...presetItemSx,
                                    backgroundColor: applyingId === preset.id
                                        ? colors.primaryYellow
                                        : appliedId === preset.id
                                            ? '#c8e6c9'
                                            : colors.primaryWhite,
                                    cursor: applyingId !== null ? 'default' : 'pointer',
                                    opacity: applyingId !== null && applyingId !== preset.id ? 0.5 : 1,
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                    {preset.name}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                ) : null}

                {loading ? (
                    <DaysSinceSkeleton />
                ) : daysSince.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>
                        No workouts logged yet.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {DAYS_SINCE_ROWS.map((row) => (
                            <Box key={row.label} sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                                {row.groups.map((groupName) => {
                                    const item = daysSinceMap.get(groupName)
                                    const days = item?.daysSince ?? null
                                    return (
                                        <Box
                                            key={groupName}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                width: daysSinceCardWidth,
                                                padding: '5px 8px',
                                                borderRadius: '4px',
                                                border: `1.5px solid ${getDaysSinceBorder(days)}`,
                                                boxShadow: `1.5px 1.5px 0px ${getDaysSinceBorder(days)}`,
                                                backgroundColor: getDaysSinceBg(days),
                                                transition: 'background-color 0.3s, border-color 0.3s, box-shadow 0.3s',
                                            }}>
                                            <Box sx={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: '50%',
                                                backgroundColor: getDaysSinceColor(days),
                                                border: `1px solid ${colors.primaryBlack}`,
                                                flexShrink: 0,
                                                transition: 'background-color 0.3s',
                                            }} />
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {groupName}
                                                </Typography>
                                                <Typography sx={{ fontSize: 10, color: colors.primaryBrown, lineHeight: 1.2 }}>
                                                    {formatDaysSince(days)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )
                                })}
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        ),
        diet: (
            <Box>
                <DragHandleBadge>
                <Box component={Link} href="/gustavo/health/diet" sx={{ ...badgeSx, backgroundColor: '#c8e6c9' }}>
                    <IconSalad size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />
                    <Typography sx={badgeTextSx}>Diet</Typography>
                </Box>
                </DragHandleBadge>
                {loading ? <PresetsSkeleton /> : dietPresets.length > 0 ? (
                    <Box sx={presetRowScrollSx}>
                        <Box
                            component={Link}
                            href="/gustavo/health/diet?presets=open"
                            sx={{ ...boltCircleSx, backgroundColor: '#c8e6c9', cursor: 'pointer' }}>
                            <IconBolt size={14} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
                        </Box>
                        {dietPresets.map((preset) => (
                            <Box
                                key={preset.id}
                                onClick={() => applyingId === null && applyPreset(preset.id, 'diet')}
                                sx={{
                                    ...presetItemSx,
                                    backgroundColor: applyingId === preset.id ? colors.primaryYellow : appliedId === preset.id ? '#c8e6c9' : colors.primaryWhite,
                                    cursor: applyingId !== null ? 'default' : 'pointer',
                                    opacity: applyingId !== null && applyingId !== preset.id ? 0.5 : 1,
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{preset.name}</Typography>
                            </Box>
                        ))}
                    </Box>
                ) : null}
                {loading ? <LogCardSkeleton rows={3} /> : recentDiet.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown, opacity: 0.6 }}>No food logged yet</Typography>
                ) : (
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                        {recentDiet.map((day, i) => (
                            <Box key={day.date}>
                                {i > 0 && <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}`, mx: 0 }} />}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.25, py: 1 }}>
                                    <Box sx={{ flexShrink: 0, minWidth: 44 }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: colors.primaryBrown, lineHeight: 1.2 }}>{formatWeekday(day.date)}</Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{formatMonthDay(day.date)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', flex: 1, minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
                                        {day.mealGroups.map((group) => (
                                            <Chip key={`meal-${group.id}`} label={`${group.quantity > 1 ? `${group.quantity}× ` : ''}${group.label}`} size="small" sx={{ ...logChipSx, backgroundColor: '#e3f2fd', border: '1px solid #4b6981' }} />
                                        ))}
                                        {day.standaloneFoods.map((entry) => (
                                            <Chip key={`food-${entry.id}`} label={`${entry.quantity > 1 ? `${entry.quantity}× ` : ''}${entry.food.name}`} size="small" sx={{ ...logChipSx, backgroundColor: colors.secondaryYellow, border: `1px solid ${colors.primaryBlack}` }} />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        ),
        supplements: (
            <Box>
                <DragHandleBadge>
                <Box component={Link} href="/gustavo/health/supplements" sx={{ ...badgeSx, backgroundColor: '#cdbfdb' }}>
                    <IconPill size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />
                    <Typography sx={badgeTextSx}>Supplements</Typography>
                </Box>
                </DragHandleBadge>
                {loading ? <PresetsSkeleton /> : supplementPresets.length > 0 ? (
                    <Box sx={presetRowScrollSx}>
                        <Box
                            component={Link}
                            href="/gustavo/health/supplements?presets=open"
                            sx={{ ...boltCircleSx, backgroundColor: '#cdbfdb', cursor: 'pointer' }}>
                            <IconBolt size={14} stroke={2.5} fill={colors.primaryWhite} color={colors.primaryBlack} />
                        </Box>
                        {supplementPresets.map((preset) => (
                            <Box
                                key={preset.id}
                                onClick={() => applyingId === null && applyPreset(preset.id, 'supplement')}
                                sx={{
                                    ...presetItemSx,
                                    backgroundColor: applyingId === preset.id ? colors.primaryYellow : appliedId === preset.id ? '#c8e6c9' : colors.primaryWhite,
                                    cursor: applyingId !== null ? 'default' : 'pointer',
                                    opacity: applyingId !== null && applyingId !== preset.id ? 0.5 : 1,
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{preset.name}</Typography>
                            </Box>
                        ))}
                    </Box>
                ) : null}
                {loading ? <LogCardSkeleton rows={3} /> : recentSupplementDays.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown, opacity: 0.6 }}>No supplements logged yet</Typography>
                ) : (
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                        {recentSupplementDays.map((group, i) => (
                            <Box key={group.date}>
                                {i > 0 && <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}`, mx: 0 }} />}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.25, py: 1 }}>
                                    <Box sx={{ flexShrink: 0, minWidth: 44 }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: colors.primaryBrown, lineHeight: 1.2 }}>{formatWeekday(group.date)}</Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{formatMonthDay(group.date)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', flex: 1, minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
                                        {group.logs.map((log) => (
                                            <Chip key={log.id} label={log.quantity > 1 ? `${log.supplementName} ×${log.quantity}` : log.supplementName} size="small" sx={{ ...logChipSx, backgroundColor: '#f1f8e9', border: '1px solid #4caf50' }} />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        ),
        exercises: (
            <Box>
                <DragHandleBadge>
                <Box component={Link} href="/gustavo/health/exercises" sx={{ ...badgeSx, backgroundColor: '#fff9c4' }}>
                    <IconStretching size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />
                    <Typography sx={badgeTextSx}>Exercises</Typography>
                </Box>
                </DragHandleBadge>
                {loading ? <LogCardSkeleton rows={3} /> : topExercises.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown, opacity: 0.6 }}>No exercises logged yet</Typography>
                ) : (
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                        {topExercises.map((ex, i) => (
                            <Box key={ex.name}>
                                {i > 0 && <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}`, mx: 0 }} />}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.25, py: 1 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{ex.name}</Typography>
                                    <Chip label={`${ex.count}`} size="small" sx={{ ...logChipSx, backgroundColor: '#fff9c4', border: '1px solid #b57b00' }} />
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        ),
        symptoms: (
            <Box>
                <DragHandleBadge>
                <Box component={Link} href="/gustavo/health/symptoms" sx={{ ...badgeSx, backgroundColor: '#ffcdd2' }}>
                    <IconFirstAidKit size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />
                    <Typography sx={badgeTextSx}>Symptoms</Typography>
                </Box>
                </DragHandleBadge>
                {loading ? <LogCardSkeleton rows={3} /> : recentSymptomDays.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: colors.primaryBrown, opacity: 0.6 }}>No symptoms logged yet</Typography>
                ) : (
                    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                        {recentSymptomDays.map((group, i) => (
                            <Box key={group.date}>
                                {i > 0 && <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}`, mx: 0 }} />}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.25, py: 1 }}>
                                    <Box sx={{ flexShrink: 0, minWidth: 44 }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: colors.primaryBrown, lineHeight: 1.2 }}>{formatWeekday(group.date)}</Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{formatMonthDay(group.date)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', flex: 1, minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
                                        {group.logs.map((log) => (
                                            <Chip key={log.id} label={log.symptomName} size="small" sx={{ ...logChipSx, backgroundColor: '#ffebee', border: '1px solid #e57373' }} />
                                        ))}
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        ),
        weight: (() => {
            const recent = recentWeightLogs.slice(0, 3)
            // Compute deltas and find widest delta label for fixed-width column
            const deltas = recent.map((log, i) => {
                const idx = recentWeightLogs.indexOf(log)
                const prev = recentWeightLogs[idx + 1] ?? null
                return prev ? log.weightLbs - prev.weightLbs : null
            })
            const hasDelta = deltas.some((d) => d !== null && d !== 0)

            return (
                <Box>
                    <DragHandleBadge>
                    <Box component={Link} href="/gustavo/health/weight" sx={{ ...badgeSx, backgroundColor: '#b3e5fc' }}>
                        <IconScale size={20} stroke={2} color={colors.primaryBlack} />
                        <Typography sx={badgeTextSx}>Weight</Typography>
                    </Box>
                    </DragHandleBadge>
                    {loading ? <LogCardSkeleton rows={3} /> : recent.length === 0 ? (
                        <Typography sx={{ fontSize: 13, color: colors.primaryBrown, opacity: 0.6 }}>No weight logged yet</Typography>
                    ) : (
                        <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                            {recent.map((log, i) => {
                                const delta = deltas[i]
                                const deltaStr = delta !== null && delta !== 0
                                    ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`
                                    : null
                                return (
                                    <Box key={log.id}>
                                        {i > 0 && <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}`, mx: 0 }} />}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.25, py: 1 }}>
                                            {/* Date — left */}
                                            <Box sx={{ flexShrink: 0, minWidth: 44 }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: colors.primaryBrown, lineHeight: 1.2 }}>{formatWeekday(log.date)}</Typography>
                                                <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{formatMonthDay(log.date)}</Typography>
                                            </Box>
                                            {/* Delta + Weight — right-aligned, delta in fixed-width slot */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                {hasDelta && (
                                                    <Box sx={{ mr: 0.75, minWidth: 32, textAlign: 'right' }}>
                                                        {deltaStr && (
                                                            <Typography sx={{
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                lineHeight: 1,
                                                                color: delta! < 0 ? '#2e7d32' : '#c62828',
                                                                whiteSpace: 'nowrap',
                                                            }}>
                                                                {deltaStr}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                                <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', lineHeight: 1, minWidth: 36, textAlign: 'right' }}>
                                                    {log.weightLbs}
                                                </Typography>
                                                <Typography sx={{ fontSize: 10, fontWeight: 600, color: colors.primaryBrown, ml: 0.5 }}>
                                                    lbs
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                )
                            })}
                        </Box>
                    )}
                </Box>
            )
        })(),
    }

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 450,
            px: 2,
            py: 2,
            gap: 3,
        }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    {sectionOrder.map((key) => (
                        <SortableSection key={key} id={key}>
                            {sections[key]}
                        </SortableSection>
                    ))}
                </SortableContext>
            </DndContext>
        </Box>
    )
}
