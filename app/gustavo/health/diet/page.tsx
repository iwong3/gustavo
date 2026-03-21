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
    SortablePresetChip,
    SortablePresetRow,
    HorizontalSortableList,
    VerticalSortableList,
} from 'components/health/sortable-preset'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect, useState } from 'react'

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

// ── Swipeable Diet Day Card ─────────────────────────────────────────────────

const DELETE_WIDTH = 64

function DietDayCard({
    day,
    onEdit,
    onDelete,
}: {
    day: DietDay
    onEdit: () => void
    onDelete: () => void
}) {
    const [offsetX, setOffsetX] = useState(0)
    const [startX, setStartX] = useState<number | null>(null)
    const [swiping, setSwiping] = useState(false)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX)
    }, [])

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (startX === null) return
            const dx = e.touches[0].clientX - startX
            // Only allow left swipe
            if (dx < -5) setSwiping(true)
            if (swiping) {
                setOffsetX(Math.max(-DELETE_WIDTH, Math.min(0, dx)))
            }
        },
        [startX, swiping]
    )

    const handleTouchEnd = useCallback(() => {
        if (offsetX < -DELETE_WIDTH / 2) {
            setOffsetX(-DELETE_WIDTH)
        } else {
            setOffsetX(0)
        }
        setStartX(null)
        setSwiping(false)
    }, [offsetX])

    const handleClick = useCallback(() => {
        if (offsetX < 0) {
            // Close swipe
            setOffsetX(0)
        } else {
            onEdit()
        }
    }, [offsetX, onEdit])

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.primaryBlack}`, boxShadow: `2px 2px 0px ${colors.primaryBlack}` }}>
            {/* Delete button — part of the card surface */}
            <Box
                onClick={onDelete}
                sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: DELETE_WIDTH,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primaryRed,
                    cursor: 'pointer',
                    borderRadius: '0 3px 3px 0',
                }}>
                <IconTrash size={18} stroke={2} color={colors.primaryWhite} />
            </Box>
            {/* Card content — slides left */}
            <Box
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleClick}
                sx={{
                    position: 'relative',
                    transform: `translateX(${offsetX}px)`,
                    transition: startX !== null ? 'none' : 'transform 0.2s ease',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    backgroundColor: colors.primaryWhite,
                    '&:active': offsetX === 0 ? { backgroundColor: colors.secondaryYellow } : {},
                }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>
                    {formatDate(day.date)}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {/* Standalone foods */}
                    {day.standaloneFoods.map((entry) => (
                        <Chip
                            key={entry.id}
                            label={
                                entry.quantity > 1
                                    ? `${entry.food.name} \u00d7${entry.quantity}`
                                    : entry.food.name
                            }
                            size="small"
                            sx={{
                                'height': 24,
                                'fontSize': 12,
                                'fontWeight': 500,
                                'backgroundColor': '#f1f8e9',
                                'border': '1px solid #4caf50',
                                'boxShadow': '1px 1px 0px #4caf50',
                                'borderRadius': '3px',
                                'color': colors.primaryBlack,
                                '& .MuiChip-label': { px: 1 },
                            }}
                        />
                    ))}
                    {/* Meal groups */}
                    {day.mealGroups.map((group) => (
                        <Chip
                            key={`meal-${group.id}`}
                            label={`${group.label} (${group.foods.map((f) => f.quantity > 1 ? `${f.food.name} \u00d7${f.quantity}` : f.food.name).join(', ')})`}
                            size="small"
                            sx={{
                                'height': 24,
                                'fontSize': 12,
                                'fontWeight': 500,
                                'backgroundColor': '#e3f2fd',
                                'border': `1px solid ${colors.primaryBlue}`,
                                'boxShadow': `1px 1px 0px ${colors.primaryBlue}`,
                                'borderRadius': '3px',
                                'color': colors.primaryBlack,
                                '& .MuiChip-label': { px: 1 },
                            }}
                        />
                    ))}
                </Box>
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
    const [drawerInitialDate, setDrawerInitialDate] = useState<string | null>(
        null
    )
    const [applyingPreset, setApplyingPreset] = useState<number | null>(null)
    const [presetDrawerOpen, setPresetDrawerOpen] = useState(false)
    const [editingPreset, setEditingPreset] = useState<DietPreset | null>(
        null
    )

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
        setDrawerInitialDate(null)
        setDrawerOpen(true)
    }, [])

    const openEditDate = useCallback((date: string) => {
        setDrawerInitialDate(date)
        setDrawerOpen(true)
    }, [])

    const handleDeleteDate = useCallback(
        async (date: string) => {
            const day = dietDays.find((d) => d.date === date)
            if (!day) return
            const allLogIds = [
                ...day.standaloneFoods.map((f) => f.id),
                ...day.mealGroups.flatMap((g) => g.foods.map((f) => f.id)),
            ]
            try {
                await Promise.all(
                    allLogIds.map((id) =>
                        fetch(`/api/health/food-logs/${id}`, {
                            method: 'DELETE',
                        })
                    )
                )
                fetchData()
            } catch (err) {
                console.error('Failed to delete logs:', err)
            }
        },
        [dietDays, fetchData]
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

    const activeFoods = foods.filter((f) => f.isActive)
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

            {/* Horizontal food chips */}
            {activeFoods.length > 0 && (
                <Box
                    sx={{
                        'display': 'flex',
                        'gap': 0.75,
                        'overflowX': 'auto',
                        'pb': 0.5,
                        '&::-webkit-scrollbar': { display: 'none' },
                        'scrollbarWidth': 'none',
                    }}>
                    {activeFoods.map((food) => (
                        <Chip
                            key={food.id}
                            label={food.name}
                            size="small"
                            sx={{
                                'height': 28,
                                'fontSize': 12,
                                'fontWeight': 600,
                                'backgroundColor': colors.primaryWhite,
                                'border': `1.5px solid ${colors.primaryBlack}`,
                                'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                'borderRadius': '4px',
                                'flexShrink': 0,
                                '& .MuiChip-label': { px: 1.25 },
                            }}
                        />
                    ))}
                </Box>
            )}

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
                            onEdit={() => openEditDate(day.date)}
                            onDelete={() => handleDeleteDate(day.date)}
                        />
                    ))}
                </Box>
            )}

            {/* Unified drawer — Log mode / Manage mode */}
            <DietDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false)
                    setDrawerInitialDate(null)
                }}
                foods={foods}
                dietDays={dietDays}
                initialDate={drawerInitialDate}
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

// ── Helper: collect all log entries for a given date from DietDay[] ─────────

function getLogsForDate(dietDays: DietDay[], date: string): FoodLogEntry[] {
    const day = dietDays.find((d) => d.date === date)
    if (!day) return []
    return [
        ...day.standaloneFoods,
        ...day.mealGroups.flatMap((g) => g.foods),
    ]
}

// ── Unified Diet Drawer ─────────────────────────────────────────────────────

type DrawerMode = 'log' | 'manage'

type DietDrawerProps = {
    open: boolean
    onClose: () => void
    foods: Food[]
    dietDays: DietDay[]
    initialDate: string | null
    onDataChanged: () => void
}

function DietDrawer({
    open,
    onClose,
    foods,
    dietDays,
    initialDate,
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

    // Logs for selected date (from DB)
    const dateLogs = getLogsForDate(dietDays, date)

    // Reset when opened
    useEffect(() => {
        if (open) {
            const d = initialDate || getLocalDate()
            setMode('log')
            setDate(d)
            setMealLabel('')
            setEditingFood(null)
            setName('')
            setIsActive(true)
            // Pre-fill quantities from existing standalone logs for this date
            const logsForDate = getLogsForDate(dietDays, d)
            const qMap = new Map<number, number>()
            for (const l of logsForDate) {
                // Aggregate quantity per food (a food might appear in multiple meal groups)
                const existing = qMap.get(l.food.id) ?? 0
                qMap.set(l.food.id, existing + l.quantity)
            }
            setQuantities(qMap)
        }
    }, [open, initialDate, dietDays])

    // Change date but keep current selections
    const handleDateChange = useCallback((newDate: string) => {
        setDate(newDate)
    }, [])

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
            const logMap = new Map<number, FoodLogEntry>()
            for (const l of dateLogs) logMap.set(l.food.id, l)

            const ops: Promise<Response>[] = []
            const trimmedLabel = mealLabel.trim() || null

            // Add new or update quantity for selected foods
            for (const [foodId, qty] of Array.from(quantities.entries())) {
                const existing = logMap.get(foodId)
                if (existing) {
                    // Update quantity if changed
                    if (existing.quantity !== qty) {
                        ops.push(fetch(`/api/health/food-logs/${existing.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ quantity: qty }),
                        }))
                    }
                } else {
                    // New log
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
            // Remove deselected foods
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
    }, [date, mealLabel, quantities, dateLogs, onDataChanged, onClose])

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

    const toggleSx = (active: boolean) =>
        ({
            'flex': 1,
            'py': 0.75,
            'fontSize': 13,
            'fontWeight': active ? 700 : 500,
            'color': colors.primaryBlack,
            'backgroundColor': active ? colors.primaryYellow : 'transparent',
            'border': `1.5px solid ${colors.primaryBlack}`,
            'boxShadow': active ? `2px 2px 0px ${colors.primaryBlack}` : 'none',
            'borderRadius': '4px',
            'textTransform': 'none',
            '&:hover': {
                backgroundColor: active
                    ? colors.primaryYellow
                    : `${colors.primaryYellow}30`,
            },
        }) as const

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
                        Diet
                    </Typography>

                    {/* Mode toggle */}
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <Button
                            onClick={() => setMode('log')}
                            sx={toggleSx(mode === 'log')}>
                            Log
                        </Button>
                        <Button
                            onClick={() => setMode('manage')}
                            sx={toggleSx(mode === 'manage')}>
                            Manage
                        </Button>
                    </Box>
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
                            {/* Date picker */}
                            <Box>
                                <Typography sx={labelSx}>Date</Typography>
                                <TextField
                                    type="date"
                                    value={date}
                                    onChange={(e) =>
                                        handleDateChange(e.target.value)
                                    }
                                    size="small"
                                    sx={{ ...fieldSx, maxWidth: 180 }}
                                />
                            </Box>

                            {/* Meal label */}
                            <Box>
                                <Typography sx={labelSx}>Meal Label</Typography>
                                <TextField
                                    value={mealLabel}
                                    onChange={(e) => setMealLabel(e.target.value)}
                                    size="small"
                                    fullWidth
                                    placeholder="Meal label (optional)"
                                    sx={fieldSx}
                                />
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
                                                {/* Quantity controls — only when selected */}
                                                {isSelected && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
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
                                                            {qty}
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
                                                )}
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
                            {saving ? 'Saving...' : 'Log'}
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
                        {editingPreset ? 'Edit Group' : 'Diet Groups'}
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
                                        <Box sx={{ ...cardSx, p: 1.5 }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                }}>
                                                <Box sx={{ flex: 1 }}>
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
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        gap: 0.5,
                                                        flexShrink: 0,
                                                    }}>
                                                    <Box
                                                        onClick={() => onEdit(p)}
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
                                                            color={colors.primaryBrown}
                                                        />
                                                    </Box>
                                                    <Box
                                                        onClick={() => onDelete(p.id)}
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
                                                            color={colors.primaryRed}
                                                        />
                                                    </Box>
                                                </Box>
                                            </Box>
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
                        }}>
                        {editingPreset ? 'Edit' : 'New Group'}
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
                                            {/* Quantity controls — only when selected */}
                                            {isSelected && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
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
                                                        {qty}
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
                                            )}
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
