'use client'

import { cardSx, colors } from '@/lib/colors'
import {
    fieldSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import type {
    DietDay,
    DietPreset,
    Food,
    FoodLogEntry,
    MealGroup,
} from '@/lib/health-types'
import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material'
import { IconBolt, IconMinus, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import FormDrawer from 'components/form-drawer'
import {
    arrayMove,
    SortableDragHandle,
    SortablePresetChip,
    SortablePresetRow,
    HorizontalSortableList,
    VerticalSortableList,
} from 'components/health/sortable-preset'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { SlidingToggle } from 'components/sliding-toggle'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

function getLocalDate(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })
}

// ── Chip styles ──────────────────────────────────────────────────────────────

const foodChipSx = {
    'height': 24,
    'fontSize': 12,
    'fontWeight': 500,
    'backgroundColor': colors.secondaryYellow,
    'border': `1px solid ${colors.primaryBlack}`,
    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
    'borderRadius': '3px',
    'color': colors.primaryBlack,
    '& .MuiChip-label': { px: 1 },
} as const

const mealChipSx = {
    'height': 24,
    'fontSize': 12,
    'fontWeight': 500,
    'backgroundColor': '#e3f2fd',
    'border': `1px solid ${colors.primaryBlue}`,
    'boxShadow': `1px 1px 0px ${colors.primaryBlue}`,
    'borderRadius': '3px',
    'color': colors.primaryBlack,
    '& .MuiChip-label': { px: 1 },
} as const

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatMonthDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Stacked chip row (shows chips that fit, stacked indicator for overflow) ──

const STACK_OFFSET = 8
const STACK_LAYERS = 2
const STACK_TOTAL = STACK_OFFSET * STACK_LAYERS
const CHIP_GAP = 4 // 0.5 spacing = 4px

function StackedChipRow({ labels }: { labels: string[] }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [visibleCount, setVisibleCount] = useState(labels.length)

    useLayoutEffect(() => {
        const el = containerRef.current
        if (!el) return
        const chips = Array.from(el.children) as HTMLElement[]
        if (chips.length === 0) return

        const containerWidth = el.getBoundingClientRect().width
        const containerLeft = el.getBoundingClientRect().left

        // Measure cumulative width of each chip
        let lastFittingFull = chips.length
        for (let i = 0; i < chips.length; i++) {
            const chipRight = chips[i].getBoundingClientRect().right - containerLeft
            // Does this chip + stack reserve + gap for one more truncated chip fit?
            if (chipRight > containerWidth) {
                lastFittingFull = i
                break
            }
        }

        if (lastFittingFull >= chips.length) {
            // All fit at natural width, no overflow
            setVisibleCount(chips.length)
        } else {
            // Find how many natural chips fit while leaving room for a truncated last chip + stack
            // Min truncated chip width ~40px + stack + gap
            const minLastChip = 40 + STACK_TOTAL + CHIP_GAP
            let naturalFit = lastFittingFull
            for (let i = lastFittingFull; i >= 1; i--) {
                const usedRight = chips[i - 1].getBoundingClientRect().right - containerLeft
                const remaining = containerWidth - usedRight - CHIP_GAP
                if (remaining >= minLastChip) {
                    naturalFit = i
                    break
                }
                naturalFit = i - 1
            }
            // Show naturalFit chips at full size + 1 truncated chip with stack
            setVisibleCount(Math.max(1, naturalFit + 1))
        }
    }, [labels])

    const hasOverflow = visibleCount < labels.length

    return (
        <Box ref={containerRef} sx={{ display: 'flex', gap: 0.5, overflow: 'hidden', flex: 1, minWidth: 0, alignItems: 'center' }}>
            {labels.map((label, i) => {
                if (i >= visibleCount) return null
                const isLast = hasOverflow && i === visibleCount - 1
                return (
                    <Box key={i} sx={{
                        position: 'relative',
                        flexShrink: isLast ? 1 : 0,
                        minWidth: isLast ? 40 : undefined,
                        mr: isLast ? `${STACK_TOTAL}px` : 0,
                    }}>
                        {isLast && (
                            <>
                                <Box sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: colors.secondaryYellow,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    borderRadius: '3px',
                                    transform: `translateX(${STACK_OFFSET * 2}px)`,
                                }} />
                                <Box sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundColor: colors.secondaryYellow,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    borderRadius: '3px',
                                    transform: `translateX(${STACK_OFFSET}px)`,
                                }} />
                            </>
                        )}
                        <Chip
                            label={label}
                            size="small"
                            sx={{
                                ...foodChipSx,
                                'position': 'relative',
                                'maxWidth': '100%',
                                '& .MuiChip-label': { px: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                            }}
                        />
                    </Box>
                )
            })}
        </Box>
    )
}

// ── Edit target type ─────────────────────────────────────────────────────────

type EditTarget = {
    date: string
    mealGroupId: number | null
    label: string
    foods: FoodLogEntry[]
}

// ── Diet Day Card (expandable with per-meal rows) ────────────────────────────

function DietDayCard({
    day,
    onEditMeal,
    onDeleteMeal,
}: {
    day: DietDay
    onEditMeal: (target: EditTarget) => void
    onDeleteMeal: (logIds: number[]) => void
}) {
    const [expanded, setExpanded] = useState(false)

    return (
        <Box>
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
                        backgroundColor: colors.primaryYellow,
                        border: `1px solid ${colors.primaryBlack}`,
                        boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                        borderRadius: '3px',
                    }}>
                    <Typography
                        sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 0.3,
                            lineHeight: 1.2,
                        }}>
                        {formatWeekday(day.date)}
                    </Typography>
                </Box>
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: colors.primaryBrown,
                    }}>
                    {formatMonthDay(day.date)}
                </Typography>
            </Box>

            {/* Day card — outer container always visible */}
            <Box
                sx={{
                    ...cardSx,
                    overflow: 'hidden',
                }}>
                {!expanded ? (
                    /* Collapsed: card per meal with stacked chip overflow */
                    <Box
                        onClick={() => setExpanded(true)}
                        sx={{
                            'p': 1.25,
                            'cursor': 'pointer',
                            'display': 'flex',
                            'flexDirection': 'column',
                            'gap': 0.75,
                            '&:active': { backgroundColor: colors.secondaryYellow },
                            'transition': 'background-color 150ms ease',
                        }}>
                        {day.mealGroups.map((group, i) => {
                            const isLast = i === day.mealGroups.length - 1 && day.standaloneFoods.length === 0
                            return (
                                <Box key={`meal-${group.id}`}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            overflow: 'hidden',
                                        }}>
                                        <Chip
                                            label={group.label}
                                            size="small"
                                            sx={mealChipSx}
                                        />
                                        <StackedChipRow
                                            labels={group.foods.map((f) => f.quantity > 1 ? `${f.food.name} \u00d7${f.quantity}` : f.food.name)}
                                        />
                                    </Box>
                                    {!isLast && (
                                        <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}12`, mt: 0.75 }} />
                                    )}
                                </Box>
                            )
                        })}
                        {day.standaloneFoods.length > 0 && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    overflow: 'hidden',
                                }}>
                                <StackedChipRow
                                    labels={day.standaloneFoods.map((f) => f.quantity > 1 ? `${f.food.name} \u00d7${f.quantity}` : f.food.name)}
                                />
                            </Box>
                        )}
                    </Box>
                ) : (
                    /* Expanded: neo-brutalist card per meal inside the day card */
                    <Box
                        sx={{
                            p: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                        }}>
                        {/* Tap to collapse */}
                        <Box
                            onClick={() => setExpanded(false)}
                            sx={{
                                'cursor': 'pointer',
                                '&:active': { opacity: 0.6 },
                            }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: colors.primaryBrown }}>
                                {day.mealGroups.length + (day.standaloneFoods.length > 0 ? 1 : 0)} meal{(day.mealGroups.length + (day.standaloneFoods.length > 0 ? 1 : 0)) !== 1 ? 's' : ''} — tap to collapse
                            </Typography>
                        </Box>

                        {/* Meal group cards */}
                        {day.mealGroups.map((group) => (
                            <Box key={`meal-${group.id}`} sx={{ ...cardSx, overflow: 'hidden' }}>
                                <SwipeableRow
                                    canEdit
                                    canDelete
                                    onEdit={() => onEditMeal({
                                        date: day.date,
                                        mealGroupId: group.id,
                                        label: group.label,
                                        foods: group.foods,
                                    })}
                                    onDelete={() => onDeleteMeal(group.foods.map((f) => f.id))}
                                    backgroundColor={colors.primaryWhite}>
                                    <Box
                                        onClick={() => onEditMeal({
                                            date: day.date,
                                            mealGroupId: group.id,
                                            label: group.label,
                                            foods: group.foods,
                                        })}
                                        sx={{
                                            'p': 1.25,
                                            'cursor': 'pointer',
                                            '&:active': { backgroundColor: colors.secondaryYellow },
                                            'transition': 'background-color 150ms ease',
                                        }}>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.primaryBlue, mb: 0.5 }}>
                                            {group.label}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {group.foods.map((entry) => (
                                                <Chip
                                                    key={entry.id}
                                                    label={entry.quantity > 1 ? `${entry.food.name} \u00d7${entry.quantity}` : entry.food.name}
                                                    size="small"
                                                    sx={foodChipSx}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                </SwipeableRow>
                            </Box>
                        ))}

                        {/* Standalone foods card */}
                        {day.standaloneFoods.length > 0 && (
                            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                <SwipeableRow
                                    canEdit
                                    canDelete
                                    onEdit={() => onEditMeal({
                                        date: day.date,
                                        mealGroupId: null,
                                        label: '',
                                        foods: day.standaloneFoods,
                                    })}
                                    onDelete={() => onDeleteMeal(day.standaloneFoods.map((f) => f.id))}
                                    backgroundColor={colors.primaryWhite}>
                                    <Box
                                        onClick={() => onEditMeal({
                                            date: day.date,
                                            mealGroupId: null,
                                            label: '',
                                            foods: day.standaloneFoods,
                                        })}
                                        sx={{
                                            'p': 1.25,
                                            'cursor': 'pointer',
                                            '&:active': { backgroundColor: colors.secondaryYellow },
                                            'transition': 'background-color 150ms ease',
                                        }}>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {day.standaloneFoods.map((entry) => (
                                                <Chip
                                                    key={entry.id}
                                                    label={entry.quantity > 1 ? `${entry.food.name} \u00d7${entry.quantity}` : entry.food.name}
                                                    size="small"
                                                    sx={foodChipSx}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                </SwipeableRow>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    )
}

export default function DietPage() {
    const [foods, setFoods] = useState<Food[]>([])
    const [dietDays, setDietDays] = useState<DietDay[]>([])
    const [presets, setPresets] = useState<DietPreset[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
    const [applyingPreset, setApplyingPreset] = useState<number | null>(null)
    const [presetDrawerOpen, setPresetDrawerOpen] = useState(false)
    const [editingPreset, setEditingPreset] = useState<DietPreset | null>(null)

    const fetchData = useCallback(() => {
        Promise.all([
            fetch('/api/health/foods?all=true').then((r) => r.json()),
            fetch('/api/health/food-logs').then((r) => r.json()),
            fetch('/api/health/presets?type=diet').then((r) => r.json()),
        ])
            .then(([f, days, p]) => {
                setFoods(f)
                setDietDays(days)
                setPresets(p)
            })
            .catch((err) => console.error('Failed to load:', err))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const openAdd = useCallback(() => {
        setEditTarget(null)
        setDrawerOpen(true)
    }, [])

    const openEditMeal = useCallback((target: EditTarget) => {
        setEditTarget(target)
        setDrawerOpen(true)
    }, [])

    const handleDeleteMealLogs = useCallback(
        async (logIds: number[]) => {
            try {
                await Promise.all(
                    logIds.map((id) =>
                        fetch(`/api/health/food-logs/${id}`, { method: 'DELETE' })
                    )
                )
                fetchData()
            } catch (err) {
                console.error('Failed to delete logs:', err)
            }
        },
        [fetchData]
    )

    const applyPreset = useCallback(
        async (presetId: number) => {
            setApplyingPreset(presetId)
            try {
                const res = await fetch(
                    `/api/health/presets/${presetId}/apply`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: getLocalDate() }),
                    }
                )
                if (res.ok) fetchData()
            } catch (err) {
                console.error('Failed to apply preset:', err)
            } finally {
                setApplyingPreset(null)
            }
        },
        [fetchData]
    )

    const reorderPresets = useCallback((from: number, to: number) => {
        setPresets((prev) => {
            const next = arrayMove(prev, from, to)
            fetch('/api/health/presets/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presetIds: next.map((p) => p.id) }),
            }).catch((err) => console.error('Failed to save preset order:', err))
            return next
        })
    }, [])

    useRegisterFab(openAdd)

    const sortedDays = [...dietDays].sort((a, b) => b.date.localeCompare(a.date))

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress
                    size={24}
                    sx={{ color: colors.primaryYellow }}
                />
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
                paddingBottom: 2,
                gap: 2,
            }}>
            {/* Header */}
            <Typography
                sx={{
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: 'var(--font-serif)',
                }}>
                Diet
            </Typography>

            {/* Preset quick-actions */}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    alignItems: 'center',
                }}>
                {/* Lightning circle icon — opens preset drawer */}
                <Box
                    onClick={() => {
                        setEditingPreset(null)
                        setPresetDrawerOpen(true)
                    }}
                    sx={{
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
                        'cursor': 'pointer',
                        '&:active': {
                            boxShadow: 'none',
                            transform: 'translate(2px, 2px)',
                        },
                    }}>
                    <IconBolt
                        size={14}
                        stroke={2.5}
                        fill={colors.primaryWhite}
                        color={colors.primaryBlack}
                    />
                </Box>
                <HorizontalSortableList items={presets} onReorder={reorderPresets}>
                    {presets.map((preset) => (
                        <SortablePresetChip key={preset.id} id={preset.id}>
                            <Box
                                onClick={() =>
                                    applyingPreset === null && applyPreset(preset.id)
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
                                        applyingPreset !== null ? 'default' : 'pointer',
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
                                                  transform: 'translate(1px, 1px)',
                                              }
                                            : {},
                                }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                    {preset.name}
                                </Typography>
                            </Box>
                        </SortablePresetChip>
                    ))}
                </HorizontalSortableList>
            </Box>

            {/* Log history */}
            {sortedDays.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: colors.primaryBrown,
                        textAlign: 'center',
                        py: 4,
                    }}>
                    No food logged yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sortedDays.map((day) => (
                        <DietDayCard
                            key={day.date}
                            day={day}
                            onEditMeal={openEditMeal}
                            onDeleteMeal={handleDeleteMealLogs}
                        />
                    ))}
                </Box>
            )}

            {/* Diet drawer — per-meal editing */}
            <DietDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false)
                    setEditTarget(null)
                }}
                foods={foods}
                editTarget={editTarget}
                onDataChanged={fetchData}
            />

            {/* Diet preset drawer */}
            <DietPresetDrawer
                open={presetDrawerOpen}
                onClose={() => {
                    setPresetDrawerOpen(false)
                    setEditingPreset(null)
                }}
                foods={foods}
                editingPreset={editingPreset}
                existingPresets={presets}
                onSaved={() => {
                    fetchData()
                    setPresetDrawerOpen(false)
                    setEditingPreset(null)
                }}
                onEdit={(p) => {
                    setEditingPreset(p)
                    setPresetDrawerOpen(true)
                }}
                onDelete={async (id) => {
                    await fetch(`/api/health/presets/${id}`, {
                        method: 'DELETE',
                    })
                    fetchData()
                }}
                onReorder={reorderPresets}
            />
        </Box>
    )
}

// ── Unified Diet Drawer (per-meal) ───────────────────────────────────────────

type DrawerMode = 'log' | 'manage'

type DietDrawerProps = {
    open: boolean
    onClose: () => void
    foods: Food[]
    editTarget: EditTarget | null
    onDataChanged: () => void
}

function DietDrawer({
    open,
    onClose,
    foods,
    editTarget,
    onDataChanged,
}: DietDrawerProps) {
    const [mode, setMode] = useState<DrawerMode>('log')
    const [date, setDate] = useState(getLocalDate)
    const [mealLabel, setMealLabel] = useState('')
    const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
    const [saving, setSaving] = useState(false)

    // Manage mode state
    const [editingFood, setEditingFood] = useState<Food | null>(null)
    const [name, setName] = useState('')
    const [isActive, setIsActive] = useState(true)

    const activeFoods = foods.filter((f) => f.isActive)
    const prevOpenRef = useRef(false)

    // Reset on fresh open
    useEffect(() => {
        const justOpened = open && !prevOpenRef.current
        prevOpenRef.current = open

        if (justOpened) {
            setMode('log')
            setEditingFood(null)
            setName('')
            setIsActive(true)

            if (editTarget) {
                // Editing an existing meal
                setDate(editTarget.date)
                setMealLabel(editTarget.label)
                const qMap = new Map<number, number>()
                for (const l of editTarget.foods) {
                    qMap.set(l.food.id, l.quantity)
                }
                setQuantities(qMap)
            } else {
                // New meal
                setDate(getLocalDate())
                setMealLabel('')
                setQuantities(new Map())
            }
        }
    }, [open, editTarget])

    const toggleFoodSelection = useCallback((foodId: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (next.has(foodId)) {
                next.delete(foodId)
            } else {
                next.set(foodId, 1)
            }
            return next
        })
    }, [])

    const setFoodQuantity = useCallback((foodId: number, qty: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (qty <= 0) {
                next.delete(foodId)
            } else {
                next.set(foodId, qty)
            }
            return next
        })
    }, [])

    const handleLogSubmit = useCallback(async () => {
        setSaving(true)
        try {
            const trimmedLabel = mealLabel.trim() || null

            // Build map of existing logs for THIS meal only
            const existingLogs = editTarget?.foods ?? []
            const logMap = new Map<number, FoodLogEntry>()
            for (const l of existingLogs) logMap.set(l.food.id, l)

            const ops: Promise<Response>[] = []

            // Add new or update quantity for selected foods
            for (const [foodId, qty] of Array.from(quantities.entries())) {
                const existing = logMap.get(foodId)
                if (existing) {
                    // Update if quantity changed or meal label changed
                    const needsUpdate = existing.quantity !== qty || trimmedLabel !== (editTarget?.label || null)
                    if (needsUpdate) {
                        ops.push(fetch(`/api/health/food-logs/${existing.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                quantity: qty,
                                ...(trimmedLabel ? { mealLabel: trimmedLabel, date } : {}),
                            }),
                        }))
                    }
                } else {
                    // New food log
                    ops.push(
                        fetch('/api/health/food-logs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                date,
                                foodId,
                                quantity: qty,
                                mealLabel: trimmedLabel,
                            }),
                        })
                    )
                }
            }

            // Remove deselected foods (only from this meal's logs)
            for (const [foodId, log] of Array.from(logMap.entries())) {
                if (!quantities.has(foodId)) {
                    ops.push(fetch(`/api/health/food-logs/${log.id}`, { method: 'DELETE' }))
                }
            }

            await Promise.all(ops)
            onDataChanged()
            onClose()
        } catch (err) {
            console.error('Failed to save food log:', err)
        } finally {
            setSaving(false)
        }
    }, [date, mealLabel, quantities, editTarget, onDataChanged, onClose])

    const startEdit = useCallback((food: Food) => {
        setEditingFood(food)
        setName(food.name)
        setIsActive(food.isActive)
    }, [])

    const startAdd = useCallback(() => {
        setEditingFood(null)
        setName('')
        setIsActive(true)
    }, [])

    const handleSaveFood = useCallback(async () => {
        if (!name.trim()) return
        setSaving(true)
        try {
            const url = editingFood
                ? `/api/health/foods/${editingFood.id}`
                : '/api/health/foods'
            const method = editingFood ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    ...(editingFood ? { isActive } : {}),
                }),
            })

            if (res.ok) {
                setEditingFood(null)
                setName('')
                setIsActive(true)
                onDataChanged()
            }
        } finally {
            setSaving(false)
        }
    }, [name, isActive, editingFood, onDataChanged])

    const handleDeleteFood = useCallback(
        async (id: number) => {
            const res = await fetch(`/api/health/foods/${id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setEditingFood(null)
                onDataChanged()
            }
        },
        [onDataChanged]
    )

    const isEditing = editTarget !== null

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
                    <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1.5 }}>
                        {isEditing ? 'Edit Meal' : 'Log Meal'}
                    </Typography>

                    {/* Mode toggle */}
                    <SlidingToggle
                        value={mode}
                        options={[
                            { value: 'log', label: isEditing ? 'Edit' : 'Log' },
                            { value: 'manage', label: 'Manage foods' },
                        ]}
                        onChange={(v) => setMode(v as DrawerMode)}
                        fontSize={13}
                        borderWidth={1}
                    />
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
                        gap: 2,
                    }}>
                    {mode === 'log' ? (
                        <>
                            {/* Meal label + Date row */}
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={labelSx}>Meal Label</Typography>
                                    <TextField
                                        value={mealLabel}
                                        onChange={(e) => setMealLabel(e.target.value)}
                                        size="small"
                                        fullWidth
                                        placeholder="Optional"
                                        sx={fieldSx}
                                    />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={labelSx}>Date</Typography>
                                    <TextField
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        size="small"
                                        fullWidth
                                        sx={fieldSx}
                                    />
                                </Box>
                            </Box>

                            {/* Food checklist */}
                            {activeFoods.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            color: colors.primaryBrown,
                                            mb: 1,
                                        }}>
                                        No foods added yet.
                                    </Typography>
                                    <Button
                                        onClick={() => setMode('manage')}
                                        size="small"
                                        sx={primaryButtonSx}>
                                        Add Foods
                                    </Button>
                                </Box>
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.75,
                                    }}>
                                    {[...activeFoods].sort((a, b) => {
                                        const aSelected = quantities.has(a.id) ? 0 : 1
                                        const bSelected = quantities.has(b.id) ? 0 : 1
                                        return aSelected - bSelected
                                    }).map((food) => {
                                        const qty = quantities.get(food.id) ?? 0
                                        const isSelected = qty > 0
                                        return (
                                            <Box
                                                key={food.id}
                                                sx={{
                                                    'display': 'flex',
                                                    'alignItems': 'center',
                                                    'gap': 1,
                                                    'padding': '8px 12px',
                                                    ...cardSx,
                                                    'backgroundColor':
                                                        isSelected
                                                            ? '#f1f8e9'
                                                            : colors.primaryWhite,
                                                    'borderColor': isSelected
                                                        ? '#4caf50'
                                                        : colors.primaryBlack,
                                                    'boxShadow': `2px 2px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                    'transition':
                                                        'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
                                                }}>
                                                {/* Checkbox toggles selection */}
                                                <Checkbox
                                                    checked={isSelected}
                                                    onClick={() => toggleFoodSelection(food.id)}
                                                    size="small"
                                                    sx={{
                                                        'padding': 0,
                                                        'color': colors.primaryBlack,
                                                        '&.Mui-checked': { color: '#4caf50' },
                                                    }}
                                                />
                                                {/* Name */}
                                                <Box
                                                    sx={{ flex: 1, cursor: 'pointer' }}
                                                    onClick={() => toggleFoodSelection(food.id)}>
                                                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                                        {food.name}
                                                    </Typography>
                                                </Box>
                                                {/* Quantity controls — always rendered, hidden when not selected */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, visibility: isSelected ? 'visible' : 'hidden' }}>
                                                    <Box
                                                        onClick={() => setFoodQuantity(food.id, qty - 1)}
                                                        sx={{
                                                            'width': 24,
                                                            'height': 24,
                                                            'borderRadius': '50%',
                                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                                            'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                            'display': 'flex',
                                                            'alignItems': 'center',
                                                            'justifyContent': 'center',
                                                            'cursor': 'pointer',
                                                            'backgroundColor': colors.primaryWhite,
                                                            '&:active': {
                                                                boxShadow: 'none',
                                                                transform: 'translate(1px, 1px)',
                                                            },
                                                        }}>
                                                        <IconMinus size={12} stroke={2.5} />
                                                    </Box>
                                                    <Typography sx={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                                                        {qty || 1}
                                                    </Typography>
                                                    <Box
                                                        onClick={() => setFoodQuantity(food.id, qty + 1)}
                                                        sx={{
                                                            'width': 24,
                                                            'height': 24,
                                                            'borderRadius': '50%',
                                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                                            'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                            'display': 'flex',
                                                            'alignItems': 'center',
                                                            'justifyContent': 'center',
                                                            'cursor': 'pointer',
                                                            'backgroundColor': colors.primaryWhite,
                                                            '&:active': {
                                                                boxShadow: 'none',
                                                                transform: 'translate(1px, 1px)',
                                                            },
                                                        }}>
                                                        <IconPlus size={12} stroke={2.5} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            )}

                        </>
                    ) : (
                        <>
                            {/* Add / Edit form */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5,
                                    pb: 2,
                                    borderBottom: `1px solid ${colors.primaryBlack}15`,
                                }}>
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: colors.primaryBrown,
                                    }}>
                                    {editingFood
                                        ? 'Edit Food'
                                        : 'New Food'}
                                </Typography>
                                <Box>
                                    <Typography sx={labelSx}>Name</Typography>
                                    <TextField
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        size="small"
                                        fullWidth
                                        placeholder="Eggs, Rice, Chicken..."
                                        sx={fieldSx}
                                    />
                                </Box>
                                {editingFood && (
                                    <Box
                                        onClick={() => setIsActive(!isActive)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            cursor: 'pointer',
                                        }}>
                                        <Checkbox
                                            checked={isActive}
                                            size="small"
                                            sx={{
                                                'padding': 0,
                                                'color': colors.primaryBlack,
                                                '&.Mui-checked': {
                                                    color: colors.primaryBlack,
                                                },
                                            }}
                                            tabIndex={-1}
                                        />
                                        <Typography sx={{ fontSize: 14 }}>
                                            Active
                                        </Typography>
                                    </Box>
                                )}
                                {editingFood && (
                                    <Button
                                        onClick={() => startAdd()}
                                        size="small"
                                        sx={secondaryButtonSx}>
                                        Cancel Edit
                                    </Button>
                                )}
                            </Box>

                            {/* Existing foods list */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                }}>
                                {foods.length === 0 ? (
                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            color: colors.primaryBrown,
                                            textAlign: 'center',
                                            py: 2,
                                        }}>
                                        No foods yet. Add one above.
                                    </Typography>
                                ) : (
                                    foods.map((food) => (
                                        <Box
                                            key={food.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                ...cardSx,
                                                opacity: food.isActive
                                                    ? 1
                                                    : 0.5,
                                                backgroundColor:
                                                    editingFood?.id === food.id
                                                        ? colors.secondaryYellow
                                                        : colors.primaryWhite,
                                            }}>
                                            <Box>
                                                <Typography
                                                    sx={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                    }}>
                                                    {food.name}
                                                </Typography>
                                                {!food.isActive && (
                                                    <Typography
                                                        sx={{
                                                            fontSize: 11,
                                                            color: colors.primaryBrown,
                                                            fontStyle: 'italic',
                                                        }}>
                                                        Inactive
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 0.5,
                                                }}>
                                                <Box
                                                    onClick={() =>
                                                        startEdit(food)
                                                    }
                                                    sx={{
                                                        'cursor': 'pointer',
                                                        'p': 0.5,
                                                        'borderRadius': '4px',
                                                        '&:active': {
                                                            backgroundColor: `${colors.primaryYellow}40`,
                                                        },
                                                    }}>
                                                    <IconPencil
                                                        size={16}
                                                        stroke={2}
                                                        color={
                                                            colors.primaryBrown
                                                        }
                                                    />
                                                </Box>
                                                <Box
                                                    onClick={() =>
                                                        handleDeleteFood(
                                                            food.id
                                                        )
                                                    }
                                                    sx={{
                                                        'cursor': 'pointer',
                                                        'p': 0.5,
                                                        'borderRadius': '4px',
                                                        '&:active': {
                                                            backgroundColor: `${colors.primaryRed}20`,
                                                        },
                                                    }}>
                                                    <IconTrash
                                                        size={16}
                                                        stroke={2}
                                                        color={
                                                            colors.primaryRed
                                                        }
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </>
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
                    <Button
                        onClick={onClose}
                        disabled={saving}
                        size="large"
                        sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    {mode === 'log' ? (
                        <Button
                            onClick={handleLogSubmit}
                            disabled={quantities.size === 0 || saving}
                            size="large"
                            sx={primaryButtonSx}>
                            {saving ? 'Saving...' : isEditing ? 'Save' : 'Log'}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSaveFood}
                            disabled={!name.trim() || saving}
                            size="large"
                            sx={primaryButtonSx}>
                            {saving
                                ? 'Saving...'
                                : editingFood
                                  ? 'Save'
                                  : 'Add'}
                        </Button>
                    )}
                </Box>
            </Box>
        </FormDrawer>
    )
}

// ── Diet Preset Drawer ──────────────────────────────────────────────────────

type DietPresetDrawerProps = {
    open: boolean
    onClose: () => void
    foods: Food[]
    editingPreset: DietPreset | null
    existingPresets: DietPreset[]
    onSaved: () => void
    onEdit: (preset: DietPreset) => void
    onDelete: (id: number) => Promise<void>
    onReorder: (from: number, to: number) => void
}

function DietPresetDrawer({
    open,
    onClose,
    foods,
    editingPreset,
    existingPresets,
    onSaved,
    onEdit,
    onDelete,
    onReorder,
}: DietPresetDrawerProps) {
    const [name, setName] = useState('')
    const [presetMealLabel, setPresetMealLabel] = useState('')
    const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const activeFoods = foods.filter((f) => f.isActive)

    useEffect(() => {
        if (open) {
            if (editingPreset) {
                setName(editingPreset.name)
                setPresetMealLabel(editingPreset.mealLabel || '')
                const qMap = new Map<number, number>()
                for (const item of editingPreset.items) {
                    qMap.set(item.foodId, item.quantity)
                }
                setQuantities(qMap)
            } else {
                setName('')
                setPresetMealLabel('')
                setQuantities(new Map())
            }
            setError('')
        }
    }, [open, editingPreset])

    const toggleFood = useCallback((foodId: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (next.has(foodId)) {
                next.delete(foodId)
            } else {
                next.set(foodId, 1)
            }
            return next
        })
    }, [])

    const setFoodQty = useCallback((foodId: number, qty: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (qty <= 0) {
                next.delete(foodId)
            } else {
                next.set(foodId, qty)
            }
            return next
        })
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!name.trim() || quantities.size === 0) return
        setSaving(true)
        setError('')

        const url = editingPreset
            ? `/api/health/presets/${editingPreset.id}`
            : '/api/health/presets'
        const method = editingPreset ? 'PUT' : 'POST'

        const foodItems = Array.from(quantities.entries()).map(([foodId, quantity]) => ({
            foodId,
            quantity,
        }))

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    type: 'diet',
                    mealLabel: presetMealLabel.trim() || null,
                    foodItems,
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
    }, [name, presetMealLabel, quantities, editingPreset, onSaved])

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
                    <Typography
                        sx={{
                            fontSize: 16,
                            fontWeight: 700,
                            fontFamily: 'var(--font-serif)',
                        }}>
                        {editingPreset ? 'Edit Meal' : 'Meals'}
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
                        gap: 2,
                    }}>
                    {/* Existing presets list */}
                    {!editingPreset && existingPresets.length > 0 && (
                        <VerticalSortableList items={existingPresets} onReorder={onReorder}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                }}>
                                {existingPresets.map((p) => (
                                    <SortablePresetRow key={p.id} id={p.id}>
                                        <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                            <SwipeableRow
                                                canEdit
                                                canDelete
                                                onEdit={() => onEdit(p)}
                                                onDelete={() => onDelete(p.id)}
                                                backgroundColor={colors.primaryWhite}>
                                                <Box sx={{ p: 1.5, display: 'flex', gap: 1.5 }}>
                                                    <SortableDragHandle id={p.id} />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 14,
                                                            fontWeight: 600,
                                                            mb: 0.5,
                                                        }}>
                                                        {p.name}
                                                    </Typography>
                                                    {p.mealLabel && (
                                                        <Typography
                                                            sx={{
                                                                fontSize: 11,
                                                                color: colors.primaryBlue,
                                                                fontWeight: 600,
                                                                mb: 0.25,
                                                            }}>
                                                            Meal: {p.mealLabel}
                                                        </Typography>
                                                    )}
                                                    <Typography
                                                        sx={{
                                                            fontSize: 12,
                                                            color: colors.primaryBrown,
                                                        }}>
                                                        {p.items
                                                            .map((item) =>
                                                                item.quantity > 1
                                                                    ? `${item.foodName} \u00d7${item.quantity}`
                                                                    : item.foodName
                                                            )
                                                            .join(', ')}
                                                    </Typography>
                                                    </Box>
                                                </Box>
                                            </SwipeableRow>
                                        </Box>
                                    </SortablePresetRow>
                                ))}
                            </Box>
                        </VerticalSortableList>
                    )}

                    {!editingPreset && existingPresets.length > 0 && (
                        <Box
                            sx={{
                                borderBottom: `1px solid ${colors.primaryBlack}15`,
                                my: 0.5,
                            }}
                        />
                    )}

                    {/* Form */}
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: colors.primaryBrown,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            mb: -1,
                        }}>
                        {editingPreset ? 'Edit' : 'New Meal'}
                    </Typography>

                    <Box>
                        <Typography sx={labelSx}>Name</Typography>
                        <TextField
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="Breakfast, Lunch, Snack..."
                            sx={fieldSx}
                        />
                    </Box>

                    <Box>
                        <Typography sx={labelSx}>Meal Label</Typography>
                        <TextField
                            value={presetMealLabel}
                            onChange={(e) => setPresetMealLabel(e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="Creates a meal group when applied"
                            sx={fieldSx}
                        />
                    </Box>

                    {/* Food selection with quantity */}
                    <Box>
                        <Typography sx={labelSx}>Foods</Typography>
                        {activeFoods.length === 0 ? (
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    color: colors.primaryBrown,
                                }}>
                                No active foods. Add some first.
                            </Typography>
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                }}>
                                {activeFoods.map((food) => {
                                    const qty = quantities.get(food.id) ?? 0
                                    const isSelected = qty > 0
                                    return (
                                        <Box
                                            key={food.id}
                                            sx={{
                                                'display': 'flex',
                                                'alignItems': 'center',
                                                'gap': 1,
                                                'padding': '8px 12px',
                                                ...cardSx,
                                                'cursor': 'pointer',
                                                'backgroundColor': isSelected
                                                    ? '#f1f8e9'
                                                    : colors.primaryWhite,
                                                'borderColor': isSelected
                                                    ? '#4caf50'
                                                    : colors.primaryBlack,
                                                'boxShadow': `2px 2px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                'transition': 'all 0.15s',
                                                '&:active': {
                                                    boxShadow: `1px 1px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                    transform:
                                                        'translate(1px, 1px)',
                                                },
                                            }}>
                                            <Checkbox
                                                checked={isSelected}
                                                onClick={() => toggleFood(food.id)}
                                                size="small"
                                                sx={{
                                                    'padding': 0,
                                                    'color':
                                                        colors.primaryBlack,
                                                    '&.Mui-checked': {
                                                        color: '#4caf50',
                                                    },
                                                }}
                                                tabIndex={-1}
                                            />
                                            <Box
                                                sx={{ flex: 1 }}
                                                onClick={() => toggleFood(food.id)}>
                                                <Typography
                                                    sx={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                    }}>
                                                    {food.name}
                                                </Typography>
                                            </Box>
                                            {/* Quantity controls — always rendered, hidden when not selected */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, visibility: isSelected ? 'visible' : 'hidden' }}>
                                                <Box
                                                    onClick={(e) => { e.stopPropagation(); setFoodQty(food.id, qty - 1) }}
                                                    sx={{
                                                        'width': 24,
                                                        'height': 24,
                                                        'borderRadius': '50%',
                                                        'border': `1.5px solid ${colors.primaryBlack}`,
                                                        'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                        'display': 'flex',
                                                        'alignItems': 'center',
                                                        'justifyContent': 'center',
                                                        'cursor': 'pointer',
                                                        'backgroundColor': colors.primaryWhite,
                                                        '&:active': {
                                                            boxShadow: 'none',
                                                            transform: 'translate(1px, 1px)',
                                                        },
                                                    }}>
                                                    <IconMinus size={12} stroke={2.5} />
                                                </Box>
                                                <Typography sx={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                                                    {qty || 1}
                                                </Typography>
                                                <Box
                                                    onClick={(e) => { e.stopPropagation(); setFoodQty(food.id, qty + 1) }}
                                                    sx={{
                                                        'width': 24,
                                                        'height': 24,
                                                        'borderRadius': '50%',
                                                        'border': `1.5px solid ${colors.primaryBlack}`,
                                                        'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                        'display': 'flex',
                                                        'alignItems': 'center',
                                                        'justifyContent': 'center',
                                                        'cursor': 'pointer',
                                                        'backgroundColor': colors.primaryWhite,
                                                        '&:active': {
                                                            boxShadow: 'none',
                                                            transform: 'translate(1px, 1px)',
                                                        },
                                                    }}>
                                                    <IconPlus size={12} stroke={2.5} />
                                                </Box>
                                            </Box>
                                        </Box>
                                    )
                                })}
                            </Box>
                        )}
                    </Box>

                    {error && (
                        <Typography
                            sx={{ fontSize: 13, color: colors.primaryRed }}>
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
                    <Button
                        onClick={onClose}
                        disabled={saving}
                        size="large"
                        sx={secondaryButtonSx}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            !name.trim() || quantities.size === 0 || saving
                        }
                        size="large"
                        sx={primaryButtonSx}>
                        {saving
                            ? 'Saving...'
                            : editingPreset
                              ? 'Save'
                              : 'Create'}
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
    )
}
