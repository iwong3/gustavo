'use client'

import { cardSx, colors } from '@/lib/colors'
import {
    errorFieldSx,
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
import { IconArrowLeft, IconBolt, IconCheck, IconChevronDown, IconMinus, IconPencil, IconPlus, IconSearch, IconTrash, IconX } from '@tabler/icons-react'
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
import { AlphabetIndex } from 'components/health/alphabet-index'
import Fuse from 'fuse.js'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

// ── Quantity badge ───────────────────────────────────────────────────────────

function QtyBadge({ n, alwaysShow }: { n: number; alwaysShow?: boolean }) {
    if (!alwaysShow && n <= 1) return null
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: colors.primaryWhite,
                border: `1px solid ${colors.primaryBlack}`,
                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                color: colors.primaryBlack,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: 1,
                flexShrink: 0,
            }}>
            {n}
        </Box>
    )
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
    '& .MuiChip-label': { px: 0.75, display: 'flex', alignItems: 'center', gap: '6px' },
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
    '& .MuiChip-label': { px: 0.75, display: 'flex', alignItems: 'center', gap: '6px' },
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

// ── Edit target type ─────────────────────────────────────────────────────────

type EditTarget = {
    date: string
    mealGroupId: number | null
    label: string
    quantity: number
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
    onDeleteMeal: (mealGroupId: number | null, logIds: number[]) => void
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
                    /* Collapsed: meal + food chips wrapping */
                    <Box
                        onClick={() => setExpanded(true)}
                        sx={{
                            'p': 1.25,
                            'cursor': 'pointer',
                            'display': 'flex',
                            'flexWrap': 'wrap',
                            'gap': 0.5,
                            '&:active': { backgroundColor: colors.secondaryYellow },
                            'transition': 'background-color 150ms ease',
                        }}>
                        {day.mealGroups.map((group) => {
                            return (
                                <Chip
                                    key={`meal-${group.id}`}
                                    label={<>{group.quantity > 1 && <QtyBadge n={group.quantity} />}{group.label}</>}
                                    size="small"
                                    sx={mealChipSx}
                                />
                            )
                        })}
                        {day.standaloneFoods.map((entry) => (
                            <Chip
                                key={`food-${entry.id}`}
                                label={<>{entry.quantity > 1 && <QtyBadge n={entry.quantity} />}{entry.food.name}</>}
                                size="small"
                                sx={foodChipSx}
                            />
                        ))}
                    </Box>
                ) : (
                    /* Expanded: trips-style rows with dividers inside the day card */
                    <Box>
                        {/* Collapse header — styled like DateGroupHeader */}
                        <Box
                            onClick={() => setExpanded(false)}
                            sx={{
                                'display': 'flex',
                                'alignItems': 'center',
                                'gap': 1,
                                'px': 1.5,
                                'py': 1,
                                'cursor': 'pointer',
                                'borderBottom': `1px solid ${colors.primaryBlack}`,
                                'backgroundColor': '#d4ddb6',
                                'userSelect': 'none',
                                '&:active': { backgroundColor: '#e2e8c8' },
                                'transition': 'background-color 150ms ease',
                            }}>
                            <IconChevronDown size={16} color={colors.primaryBlack} />
                        </Box>

                        {/* Meal group rows */}
                        {day.mealGroups.map((group, i) => {
                            const isLast = i === day.mealGroups.length - 1 && day.standaloneFoods.length === 0
                            return (
                                <SwipeableRow
                                    key={`meal-${group.id}`}
                                    canEdit
                                    canDelete
                                    onEdit={() => onEditMeal({
                                        date: day.date,
                                        mealGroupId: group.id,
                                        label: group.label,
                                        quantity: group.quantity,
                                        foods: group.foods,
                                    })}
                                    onDelete={() => onDeleteMeal(group.id, group.foods.map((f) => f.id))}
                                    backgroundColor={colors.primaryWhite}
                                    showBottomBorder={!isLast}>
                                    <Box
                                        onClick={() => onEditMeal({
                                            date: day.date,
                                            mealGroupId: group.id,
                                            label: group.label,
                                            quantity: group.quantity,
                                            foods: group.foods,
                                        })}
                                        sx={{
                                            'display': 'flex',
                                            'alignItems': 'center',
                                            'gap': 1.5,
                                            'px': 1.5,
                                            'py': 1.25,
                                            'cursor': 'pointer',
                                            '&:active': { backgroundColor: colors.secondaryYellow },
                                            'transition': 'background-color 150ms ease',
                                        }}>
                                        <Box
                                            component="span"
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                backgroundColor: colors.primaryWhite,
                                                border: `1.5px solid ${colors.primaryBlack}`,
                                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                                color: colors.primaryBlack,
                                                fontSize: 13,
                                                fontWeight: 700,
                                                lineHeight: 1,
                                                flexShrink: 0,
                                            }}>
                                            {group.quantity}
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{
                                                fontSize: 14,
                                                fontWeight: 700,
                                                lineHeight: 1.3,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {group.label}
                                            </Typography>
                                            <Typography sx={{
                                                fontSize: 12,
                                                color: colors.primaryBrown,
                                                lineHeight: 1.3,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                mt: 0.25,
                                            }}>
                                                {group.foods.map((f) => f.quantity > 1 ? `${f.food.name} \u00d7${f.quantity}` : f.food.name).join(', ')}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </SwipeableRow>
                            )
                        })}

                        {/* Standalone foods row */}
                        {day.standaloneFoods.length > 0 && (
                            <SwipeableRow
                                canEdit
                                canDelete
                                onEdit={() => onEditMeal({
                                    date: day.date,
                                    mealGroupId: null,
                                    label: '',
                                    quantity: 1,
                                    foods: day.standaloneFoods,
                                })}
                                onDelete={() => onDeleteMeal(null, day.standaloneFoods.map((f) => f.id))}
                                backgroundColor={colors.primaryWhite}>
                                <Box
                                    onClick={() => onEditMeal({
                                        date: day.date,
                                        mealGroupId: null,
                                        label: '',
                                        quantity: 1,
                                        foods: day.standaloneFoods,
                                    })}
                                    sx={{
                                        'display': 'flex',
                                        'alignItems': 'center',
                                        'gap': 1.5,
                                        'px': 1.5,
                                        'py': 1.25,
                                        'cursor': 'pointer',
                                        '&:active': { backgroundColor: colors.secondaryYellow },
                                        'transition': 'background-color 150ms ease',
                                    }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{
                                            fontSize: 12,
                                            color: colors.primaryBrown,
                                            lineHeight: 1.3,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {day.standaloneFoods.map((f) => f.quantity > 1 ? `${f.food.name} \u00d7${f.quantity}` : f.food.name).join(', ')}
                                        </Typography>
                                    </Box>
                                </Box>
                            </SwipeableRow>
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
        async (mealGroupId: number | null, logIds: number[]) => {
            try {
                if (mealGroupId) {
                    // Transactional delete — meal group + all food logs in one call
                    await fetch(`/api/health/meal-groups/${mealGroupId}`, { method: 'DELETE' })
                } else {
                    // Standalone foods — delete individually
                    await Promise.all(
                        logIds.map((id) =>
                            fetch(`/api/health/food-logs/${id}`, { method: 'DELETE' })
                        )
                    )
                }
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
                    onClick={() => setPresetDrawerOpen(true)}
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
                dietDays={dietDays}
                onDataChanged={fetchData}
            />

            {/* Diet preset drawer */}
            <DietPresetDrawer
                open={presetDrawerOpen}
                onClose={() => setPresetDrawerOpen(false)}
                foods={foods}
                existingPresets={presets}
                onSaved={fetchData}
                onDelete={async (id) => {
                    await fetch(`/api/health/presets/${id}`, {
                        method: 'DELETE',
                    })
                    fetchData()
                }}
                onReorder={reorderPresets}
                onApplyPreset={async (presetId) => {
                    const res = await fetch(`/api/health/presets/${presetId}/apply`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: getLocalDate() }),
                    })
                    if (res.ok) fetchData()
                }}
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
    dietDays: DietDay[]
    onDataChanged: () => void
}

function DietDrawer({
    open,
    onClose,
    foods,
    editTarget,
    dietDays,
    onDataChanged,
}: DietDrawerProps) {
    const [mode, setMode] = useState<DrawerMode>('log')
    const [date, setDate] = useState(getLocalDate)
    const [mealLabel, setMealLabel] = useState('')
    const [mealQuantity, setMealQuantity] = useState(1)
    const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
    const [saving, setSaving] = useState(false)

    // Manage mode state
    const [name, setName] = useState('')
    const [foodSearch, setFoodSearch] = useState('')
    const [inlineEditId, setInlineEditId] = useState<number | null>(null)
    const [inlineEditName, setInlineEditName] = useState('')
    const addInputRef = useRef<HTMLInputElement>(null)
    const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
    const selectedSummaryRef = useRef<HTMLDivElement>(null)
    const [selectedSummaryHeight, setSelectedSummaryHeight] = useState(0)

    const activeFoods = foods.filter((f) => f.isActive)

    // Fuse.js for fuzzy food search
    const foodFuse = useMemo(() => new Fuse(foods, {
        keys: ['name'],
        threshold: 0.4,
        ignoreLocation: true,
    }), [foods])

    const filteredFoods = useMemo(() => {
        if (!foodSearch) return null // null = no filter
        const results = foodFuse.search(foodSearch)
        return new Set(results.map((r) => r.item.id))
    }, [foodFuse, foodSearch])

    // Group foods by first letter for alphabet index (manage mode)
    const manageFoodGroups = useMemo(() => {
        const filtered = foods.filter((f) => !filteredFoods || filteredFoods.has(f.id))
        const groupMap: Record<string, Food[]> = {}
        for (const food of filtered) {
            const letter = food.name[0]?.toUpperCase() || '#'
            if (!groupMap[letter]) groupMap[letter] = []
            groupMap[letter].push(food)
        }
        return Object.entries(groupMap) as [string, Food[]][]
    }, [foods, filteredFoods])

    const manageFoodLetters = useMemo(
        () => new Set(manageFoodGroups.map(([letter]) => letter)),
        [manageFoodGroups],
    )

    // Group active foods by first letter for log mode alphabet index
    const logFoodGroups = useMemo(() => {
        const filtered = activeFoods.filter((f) => !filteredFoods || filteredFoods.has(f.id))
        const groupMap: Record<string, Food[]> = {}
        for (const food of filtered) {
            const letter = food.name[0]?.toUpperCase() || '#'
            if (!groupMap[letter]) groupMap[letter] = []
            groupMap[letter].push(food)
        }
        return Object.entries(groupMap) as [string, Food[]][]
    }, [activeFoods, filteredFoods])

    const logFoodLetters = useMemo(
        () => new Set(logFoodGroups.map(([letter]) => letter)),
        [logFoodGroups],
    )

    // Measure sticky selected summary height for alphabet index offset
    useEffect(() => {
        const el = selectedSummaryRef.current
        if (el) {
            setSelectedSummaryHeight(el.offsetHeight)
        } else {
            setSelectedSummaryHeight(0)
        }
    }, [quantities.size])

    const scrollToLetter = useCallback((letter: string) => {
        const el = sectionRefs.current.get(letter)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [])

    const prevOpenRef = useRef(false)

    // Reset on fresh open
    useEffect(() => {
        const justOpened = open && !prevOpenRef.current
        prevOpenRef.current = open

        if (justOpened) {
            setMode('log')
            setName('')
            setFoodSearch('')
            setInlineEditId(null)

            if (editTarget) {
                // Editing an existing meal
                setDate(editTarget.date)
                setMealLabel(editTarget.label)
                setMealQuantity(editTarget.quantity ?? 1)
                const qMap = new Map<number, number>()
                for (const l of editTarget.foods) {
                    qMap.set(l.food.id, l.quantity)
                }
                setQuantities(qMap)
            } else {
                // New meal defaults
                setDate(getLocalDate())
                setMealLabel('')
                setMealQuantity(1)
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
            const foodsList = Array.from(quantities.entries()).map(([foodId, qty]) => ({
                foodId,
                quantity: qty,
            }))

            if (editTarget?.mealGroupId) {
                // Editing an existing meal group — single transactional call
                await fetch(`/api/health/meal-groups/${editTarget.mealGroupId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date,
                        label: trimmedLabel,
                        quantity: mealQuantity,
                        foods: foodsList,
                    }),
                })
            } else if (editTarget) {
                // Editing standalone foods — individual operations
                const existingLogs = editTarget.foods
                const logMap = new Map<number, FoodLogEntry>()
                for (const l of existingLogs) logMap.set(l.food.id, l)

                const ops: Promise<Response>[] = []

                for (const food of foodsList) {
                    const existing = logMap.get(food.foodId)
                    if (existing) {
                        const needsUpdate = existing.quantity !== food.quantity || date !== editTarget.date
                        if (needsUpdate) {
                            ops.push(fetch(`/api/health/food-logs/${existing.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ quantity: food.quantity, date }),
                            }))
                        }
                    } else {
                        ops.push(fetch('/api/health/food-logs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                date,
                                foodId: food.foodId,
                                quantity: food.quantity,
                                mealLabel: trimmedLabel,
                            }),
                        }))
                    }
                }

                for (const [foodId, log] of Array.from(logMap.entries())) {
                    if (!quantities.has(foodId)) {
                        ops.push(fetch(`/api/health/food-logs/${log.id}`, { method: 'DELETE' }))
                    }
                }

                await Promise.all(ops)
            } else {
                // New meal — create food logs (POST creates meal group automatically)
                for (const food of foodsList) {
                    await fetch('/api/health/food-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            date,
                            foodId: food.foodId,
                            quantity: food.quantity,
                            mealLabel: trimmedLabel,
                        }),
                    })
                }
            }

            onDataChanged()
            onClose()
        } catch (err) {
            console.error('Failed to save food log:', err)
        } finally {
            setSaving(false)
        }
    }, [date, mealLabel, mealQuantity, quantities, editTarget, onDataChanged, onClose])


    const startInlineEdit = useCallback((food: Food) => {
        setInlineEditId(food.id)
        setInlineEditName(food.name)
    }, [])

    const cancelInlineEdit = useCallback(() => {
        setInlineEditId(null)
        setInlineEditName('')
    }, [])

    const handleInlineEditSave = useCallback(async () => {
        if (!inlineEditName.trim() || !inlineEditId || saving) return
        setSaving(true)
        try {
            const res = await fetch(`/api/health/foods/${inlineEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: inlineEditName.trim() }),
            })
            if (res.ok) {
                setInlineEditId(null)
                setInlineEditName('')
                onDataChanged()
            }
        } finally {
            setSaving(false)
        }
    }, [inlineEditId, inlineEditName, saving, onDataChanged])

    const handleAddFood = useCallback(async () => {
        if (!name.trim() || saving) return
        setSaving(true)
        try {
            const res = await fetch('/api/health/foods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            })
            if (res.ok) {
                setName('')
                onDataChanged()
                // Re-focus the add input for rapid entry
                setTimeout(() => addInputRef.current?.focus(), 50)
            }
        } finally {
            setSaving(false)
        }
    }, [name, saving, onDataChanged])


    const handleDeleteFood = useCallback(
        async (id: number) => {
            const res = await fetch(`/api/health/foods/${id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setInlineEditId(null)
                onDataChanged()
            }
        },
        [onDataChanged]
    )

    const isEditing = editTarget !== null

    // Label conflict check: does a meal with this label already exist on the selected date?
    const trimmedLabel = mealLabel.trim()
    const labelConflict = (() => {
        if (!trimmedLabel) return false
        const dayData = dietDays.find((d) => d.date === date)
        if (!dayData) return false
        return dayData.mealGroups.some(
            (g) => g.label.toLowerCase() === trimmedLabel.toLowerCase()
                && g.id !== editTarget?.mealGroupId
        )
    })()

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
                        onChange={(v) => { setMode(v as DrawerMode); setFoodSearch('') }}
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
                            {/* Date row */}
                            <Box sx={{ maxWidth: 160 }}>
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

                            {/* Name + Quantity row */}
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={labelSx}>Name</Typography>
                                    <TextField
                                        value={mealLabel}
                                        onChange={(e) => setMealLabel(e.target.value)}
                                        size="small"
                                        fullWidth
                                        placeholder="Optional"
                                        error={labelConflict}
                                        helperText={labelConflict ? 'Already exists for this date' : undefined}
                                        sx={labelConflict ? errorFieldSx : fieldSx}
                                    />
                                </Box>
                                {trimmedLabel && <Box sx={{ flexShrink: 0, pr: 1.5 }}>
                                    <Typography sx={labelSx}>Quantity</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: 40 }}>
                                        <Box
                                            onClick={() => setMealQuantity((q) => Math.max(1, q - 1))}
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
                                                '&:active': { boxShadow: 'none', transform: 'translate(1px, 1px)' },
                                            }}>
                                            <IconMinus size={12} stroke={2.5} />
                                        </Box>
                                        <Typography sx={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                                            {mealQuantity}
                                        </Typography>
                                        <Box
                                            onClick={() => setMealQuantity((q) => q + 1)}
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
                                                '&:active': { boxShadow: 'none', transform: 'translate(1px, 1px)' },
                                            }}>
                                            <IconPlus size={12} stroke={2.5} />
                                        </Box>
                                    </Box>
                                </Box>}
                            </Box>

                            {/* Food checklist */}
                            <Typography sx={{ ...labelSx, mb: -1 }}>Foods</Typography>
                            {activeFoods.length > 5 && (
                                <TextField
                                    value={foodSearch}
                                    onChange={(e) => setFoodSearch(e.target.value)}
                                    size="small"
                                    fullWidth
                                    placeholder="Search foods..."
                                    slotProps={{
                                        input: {
                                            startAdornment: <IconSearch size={16} stroke={2} color={colors.primaryBrown} style={{ marginRight: 6 }} />,
                                            endAdornment: foodSearch ? (
                                                <Box onClick={() => setFoodSearch('')} sx={{ cursor: 'pointer', display: 'flex' }}>
                                                    <IconX size={16} stroke={2} color={colors.primaryBrown} />
                                                </Box>
                                            ) : null,
                                        },
                                    }}
                                    sx={{ ...fieldSx, mt: 1 }}
                                />
                            )}
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
                                <>
                                    {/* Sticky selected summary */}
                                    {quantities.size > 0 && (
                                        <Box ref={selectedSummaryRef} sx={{
                                            position: 'sticky',
                                            top: -16, // offset parent's py:2 (16px)
                                            zIndex: 2,
                                            backgroundColor: colors.primaryWhite,
                                            borderBottom: `1px solid ${colors.primaryBlack}15`,
                                            pt: 1,
                                            pb: 1,
                                            mb: 0.5,
                                            mx: -2.5, // bleed to edges
                                            px: 2.5,
                                        }}>
                                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: colors.primaryBrown, mb: 0.5 }}>
                                                Selected ({quantities.size})
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {activeFoods
                                                    .filter((f) => quantities.has(f.id))
                                                    .map((food) => {
                                                        const qty = quantities.get(food.id) ?? 1
                                                        return (
                                                            <Chip
                                                                key={food.id}
                                                                label={`${food.name}${qty > 1 ? ` x${qty}` : ''}`}
                                                                size="small"
                                                                onDelete={() => toggleFoodSelection(food.id)}
                                                                sx={{
                                                                    'height': 24,
                                                                    'fontSize': 12,
                                                                    'fontWeight': 600,
                                                                    'backgroundColor': '#f1f8e9',
                                                                    'border': `1.5px solid #4caf50`,
                                                                    'borderRadius': '6px',
                                                                    '& .MuiChip-label': { px: 1 },
                                                                    '& .MuiChip-deleteIcon': {
                                                                        fontSize: 14,
                                                                        color: '#4caf50',
                                                                        marginRight: '4px',
                                                                    },
                                                                }}
                                                            />
                                                        )
                                                    })}
                                            </Box>
                                        </Box>
                                    )}
                                    {/* Alphabetical food list + index */}
                                    <Box sx={{ display: 'flex' }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1, minWidth: 0 }}>
                                            {logFoodGroups.map(([letter, groupFoods], gi) => (
                                                <Box key={letter}>
                                                    <Typography
                                                        ref={(el) => {
                                                            if (el) sectionRefs.current.set(letter, el)
                                                            else sectionRefs.current.delete(letter)
                                                        }}
                                                        sx={{
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            color: colors.primaryBrown,
                                                            px: 0.5,
                                                            pt: gi === 0 ? 0 : 1,
                                                            pb: 0.5,
                                                            scrollMarginTop: `${selectedSummaryHeight + 8}px`,
                                                        }}>
                                                        {letter}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                                        {groupFoods.map((food) => {
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
                                                                        'backgroundColor': isSelected ? '#f1f8e9' : colors.primaryWhite,
                                                                        'borderColor': isSelected ? '#4caf50' : colors.primaryBlack,
                                                                        'boxShadow': `2px 2px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                                        'transition': 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
                                                                    }}>
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
                                                                    <Box
                                                                        sx={{ flex: 1, cursor: 'pointer' }}
                                                                        onClick={() => toggleFoodSelection(food.id)}>
                                                                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                                                            {food.name}
                                                                        </Typography>
                                                                    </Box>
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
                                                                                '&:active': { boxShadow: 'none', transform: 'translate(1px, 1px)' },
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
                                                                                '&:active': { boxShadow: 'none', transform: 'translate(1px, 1px)' },
                                                                            }}>
                                                                            <IconPlus size={12} stroke={2.5} />
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            )
                                                        })}
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                        {!foodSearch && <AlphabetIndex availableLetters={logFoodLetters} onSelect={scrollToLetter} topOffset={selectedSummaryHeight} />}
                                    </Box>
                                </>
                            )}

                        </>
                    ) : mode === 'manage' ? (
                        <>
                            {/* Search filter */}
                            {foods.length > 5 && (
                                <TextField
                                    value={foodSearch}
                                    onChange={(e) => setFoodSearch(e.target.value)}
                                    size="small"
                                    fullWidth
                                    placeholder="Search foods..."
                                    slotProps={{
                                        input: {
                                            startAdornment: <IconSearch size={16} stroke={2} color={colors.primaryBrown} style={{ marginRight: 6 }} />,
                                            endAdornment: foodSearch ? (
                                                <Box onClick={() => setFoodSearch('')} sx={{ cursor: 'pointer', display: 'flex' }}>
                                                    <IconX size={16} stroke={2} color={colors.primaryBrown} />
                                                </Box>
                                            ) : null,
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            )}

                            {/* Add new food — compact row */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    alignItems: 'center',
                                    pb: 1.5,
                                    borderBottom: `1px solid ${colors.primaryBlack}15`,
                                }}>
                                <TextField
                                    inputRef={addInputRef}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleAddFood()
                                        }
                                    }}
                                    size="small"
                                    fullWidth
                                    placeholder="Add new food..."
                                    sx={fieldSx}
                                />
                                <Box
                                    onClick={handleAddFood}
                                    sx={{
                                        'flexShrink': 0,
                                        'width': 40,
                                        'height': 40,
                                        'borderRadius': '8px',
                                        'border': `2px solid ${colors.primaryBlack}`,
                                        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                                        'display': 'flex',
                                        'alignItems': 'center',
                                        'justifyContent': 'center',
                                        'cursor': name.trim() ? 'pointer' : 'default',
                                        'backgroundColor': name.trim() ? colors.primaryYellow : colors.primaryWhite,
                                        'opacity': name.trim() ? 1 : 0.4,
                                        '&:active': name.trim() ? { boxShadow: 'none', transform: 'translate(2px, 2px)' } : {},
                                    }}>
                                    <IconPlus size={18} stroke={2.5} />
                                </Box>
                            </Box>

                            {/* Existing foods list + alphabet index */}
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
                            <Box sx={{ display: 'flex' }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.75,
                                        flex: 1,
                                        minWidth: 0,
                                    }}>
                                    {manageFoodGroups.map(([letter, groupFoods], gi) => (
                                        <Box key={letter}>
                                            {/* Section header */}
                                            <Typography
                                                ref={(el) => {
                                                    if (el) sectionRefs.current.set(letter, el)
                                                    else sectionRefs.current.delete(letter)
                                                }}
                                                sx={{
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    color: colors.primaryBrown,
                                                    px: 0.5,
                                                    pt: gi === 0 ? 0 : 1,
                                                    pb: 0.5,
                                                    scrollMarginTop: 8,
                                                }}>
                                                {letter}
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                            {groupFoods.map((food) => (
                                        <Box
                                            key={food.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                minHeight: 40,
                                                padding: '8px 12px',
                                                ...cardSx,
                                                opacity: food.isActive ? 1 : 0.5,
                                                backgroundColor: inlineEditId === food.id
                                                    ? colors.secondaryYellow
                                                    : colors.primaryWhite,
                                            }}>
                                            {inlineEditId === food.id ? (
                                                /* Inline edit — native input keeps exact row height */
                                                <>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <input
                                                            // eslint-disable-next-line jsx-a11y/no-autofocus
                                                            autoFocus
                                                            value={inlineEditName}
                                                            onChange={(e) => setInlineEditName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault()
                                                                    handleInlineEditSave()
                                                                } else if (e.key === 'Escape') {
                                                                    cancelInlineEdit()
                                                                }
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                fontSize: 14,
                                                                fontWeight: 600,
                                                                fontFamily: 'inherit',
                                                                border: 'none',
                                                                outline: 'none',
                                                                background: 'transparent',
                                                                padding: 0,
                                                                margin: 0,
                                                                lineHeight: 'inherit',
                                                                borderBottom: `2px solid ${colors.primaryYellow}`,
                                                            }}
                                                        />
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 1 }}>
                                                        <Box
                                                            onClick={handleInlineEditSave}
                                                            sx={{
                                                                'cursor': 'pointer',
                                                                'display': 'flex',
                                                                'alignItems': 'center',
                                                                'justifyContent': 'center',
                                                                'width': 28,
                                                                'height': 28,
                                                                'borderRadius': '4px',
                                                                '&:active': { backgroundColor: '#c8e6c9' },
                                                            }}>
                                                            <IconCheck size={18} stroke={2.5} color="#4caf50" />
                                                        </Box>
                                                        <Box
                                                            onClick={cancelInlineEdit}
                                                            sx={{
                                                                'cursor': 'pointer',
                                                                'display': 'flex',
                                                                'alignItems': 'center',
                                                                'justifyContent': 'center',
                                                                'width': 28,
                                                                'height': 28,
                                                                'borderRadius': '4px',
                                                                '&:active': { backgroundColor: `${colors.primaryRed}20` },
                                                            }}>
                                                            <IconX size={18} stroke={2.5} color={colors.primaryBrown} />
                                                        </Box>
                                                    </Box>
                                                </>
                                            ) : (
                                                /* Display mode */
                                                <>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
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
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                        <Box
                                                            onClick={() => startInlineEdit(food)}
                                                            sx={{
                                                                'cursor': 'pointer',
                                                                'display': 'flex',
                                                                'alignItems': 'center',
                                                                'justifyContent': 'center',
                                                                'width': 28,
                                                                'height': 28,
                                                                'borderRadius': '4px',
                                                                '&:active': { backgroundColor: `${colors.primaryYellow}40` },
                                                            }}>
                                                            <IconPencil size={16} stroke={2} color={colors.primaryBrown} />
                                                        </Box>
                                                        <Box
                                                            onClick={() => handleDeleteFood(food.id)}
                                                            sx={{
                                                                'cursor': 'pointer',
                                                                'display': 'flex',
                                                                'alignItems': 'center',
                                                                'justifyContent': 'center',
                                                                'width': 28,
                                                                'height': 28,
                                                                'borderRadius': '4px',
                                                                '&:active': { backgroundColor: `${colors.primaryRed}20` },
                                                            }}>
                                                            <IconTrash size={16} stroke={2} color={colors.primaryRed} />
                                                        </Box>
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    ))}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                                {!foodSearch && <AlphabetIndex availableLetters={manageFoodLetters} onSelect={scrollToLetter} />}
                            </Box>
                            )}
                        </>
                    ) : null}
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
                        sx={mode === 'manage' ? primaryButtonSx : secondaryButtonSx}>
                        {mode === 'manage' ? 'Done' : 'Cancel'}
                    </Button>
                    {mode === 'log' && (
                        <Button
                            onClick={handleLogSubmit}
                            disabled={quantities.size === 0 || saving || labelConflict}
                            size="large"
                            sx={primaryButtonSx}>
                            {saving ? 'Saving...' : isEditing ? 'Save' : 'Log'}
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
    existingPresets: DietPreset[]
    onSaved: () => void
    onDelete: (id: number) => Promise<void>
    onReorder: (from: number, to: number) => void
    onApplyPreset: (presetId: number) => Promise<void>
}

type DietPresetView = 'list' | 'form'

function DietPresetDrawer({
    open,
    onClose,
    foods,
    existingPresets,
    onSaved,
    onDelete,
    onReorder,
    onApplyPreset,
}: DietPresetDrawerProps) {
    const [view, setView] = useState<DietPresetView>('list')
    const [editingPreset, setEditingPreset] = useState<DietPreset | null>(null)
    const [name, setName] = useState('')
    const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const activeFoods = foods.filter((f) => f.isActive)

    const resetForm = useCallback(() => {
        setName('')
        setQuantities(new Map())
        setError('')
    }, [])

    const openForm = useCallback((preset: DietPreset | null) => {
        setEditingPreset(preset)
        if (preset) {
            setName(preset.name)
            const qMap = new Map<number, number>()
            for (const item of preset.items) {
                qMap.set(item.foodId, item.quantity)
            }
            setQuantities(qMap)
        } else {
            resetForm()
        }
        setView('form')
    }, [resetForm])

    const goBack = useCallback(() => {
        setView('list')
        setEditingPreset(null)
        resetForm()
    }, [resetForm])

    useEffect(() => {
        if (open) {
            setView('list')
            setEditingPreset(null)
            resetForm()
        }
    }, [open, resetForm])

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
                    foodItems,
                }),
            })
            if (res.ok) {
                onSaved()
                goBack()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to save')
            }
        } catch {
            setError('Failed to save')
        } finally {
            setSaving(false)
        }
    }, [name, quantities, editingPreset, onSaved, goBack])

    return (
        <FormDrawer open={open} onClose={view === 'form' ? goBack : onClose}>
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
                        alignItems: 'center',
                        gap: 1,
                        px: 2.5,
                        py: 2,
                        borderBottom: `1px solid ${colors.primaryBlack}20`,
                    }}>
                    {view === 'form' && (
                        <Box
                            onClick={goBack}
                            sx={{
                                'cursor': 'pointer',
                                'display': 'flex',
                                'alignItems': 'center',
                                '&:active': { opacity: 0.5 },
                            }}>
                            <IconArrowLeft size={20} stroke={2} color={colors.primaryBlack} />
                        </Box>
                    )}
                    <Typography
                        sx={{
                            fontSize: 16,
                            fontWeight: 700,
                            fontFamily: 'var(--font-serif)',
                        }}>
                        {view === 'list'
                            ? 'Meals'
                            : editingPreset
                              ? 'Edit Meal'
                              : 'New Meal'}
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
                    {view === 'list' ? (
                        <>
                            {existingPresets.length > 0 ? (
                                <VerticalSortableList items={existingPresets} onReorder={onReorder}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                        {existingPresets.map((p) => (
                                            <SortablePresetRow key={p.id} id={p.id}>
                                                <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                                                    <SwipeableRow
                                                        canEdit
                                                        canDelete
                                                        onEdit={() => openForm(p)}
                                                        onDelete={() => onDelete(p.id)}
                                                        backgroundColor={colors.primaryWhite}>
                                                        <Box
                                                            onClick={async () => {
                                                                await onApplyPreset(p.id)
                                                                onClose()
                                                            }}
                                                            sx={{
                                                                'display': 'flex',
                                                                'alignItems': 'center',
                                                                'gap': 1.5,
                                                                'px': 1.5,
                                                                'py': 1.25,
                                                                'cursor': 'pointer',
                                                                '&:active': { backgroundColor: colors.secondaryYellow },
                                                                'transition': 'background-color 150ms ease',
                                                            }}>
                                                            <SortableDragHandle id={p.id} />
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Typography sx={{
                                                                    fontSize: 14,
                                                                    fontWeight: 700,
                                                                    lineHeight: 1.3,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    {p.name}
                                                                </Typography>
                                                                <Typography sx={{
                                                                    fontSize: 12,
                                                                    color: colors.primaryBrown,
                                                                    lineHeight: 1.3,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    mt: 0.25,
                                                                }}>
                                                                    {p.items.map((it) => it.quantity > 1 ? `${it.foodName} \u00d7${it.quantity}` : it.foodName).join(', ')}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </SwipeableRow>
                                                </Box>
                                            </SortablePresetRow>
                                        ))}
                                    </Box>
                                </VerticalSortableList>
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: colors.primaryBrown,
                                        textAlign: 'center',
                                        py: 2,
                                    }}>
                                    No meals yet. Create one to get started.
                                </Typography>
                            )}
                        </>
                    ) : (
                        /* New / Edit form */
                        <>
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
                                                    {/* Quantity controls */}
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
                    {view === 'form' ? (
                        <>
                            <Button
                                onClick={goBack}
                                disabled={saving}
                                size="large"
                                sx={secondaryButtonSx}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!name.trim() || quantities.size === 0 || saving}
                                size="large"
                                sx={primaryButtonSx}>
                                {saving ? 'Saving...' : editingPreset ? 'Save' : 'Create'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={onClose} size="large" sx={secondaryButtonSx}>
                                Close
                            </Button>
                            <Button
                                onClick={() => openForm(null)}
                                size="large"
                                sx={{ ...primaryButtonSx, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconPlus size={16} stroke={2} />
                                New
                            </Button>
                        </>
                    )}
                </Box>
            </Box>
        </FormDrawer>
    )
}
