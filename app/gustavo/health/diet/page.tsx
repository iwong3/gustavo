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
    FoodGroup,
    FoodLogEntry,
    MealGroup,
} from '@/lib/health-types'
import {
    Box,
    Button,
    Checkbox,
    Chip,
    TextField,
    Typography,
} from '@mui/material'
import {
    IconArrowLeft,
    IconBolt,
    IconCheck,
    IconMinus,
    IconPencil,
    IconPlus,
    IconSalad,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react'
import FormDrawer from 'components/form-drawer'
import { AlphabetIndex } from 'components/health/alphabet-index'
import { FoodPicker } from 'components/health/food-picker'
import { HealthPageLayout, HealthPageHeader } from 'components/health/health-page-layout'
import {
    arrayMove,
    HorizontalSortableList,
    SortableDragHandle,
    SortablePresetChip,
    SortablePresetRow,
    VerticalSortableList,
} from 'components/health/sortable-preset'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { SlidingToggle } from 'components/sliding-toggle'
import Fuse from 'fuse.js'
import { useRegisterFab } from 'providers/fab-provider'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'

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
    'transition': 'opacity 150ms ease',
    '& .MuiChip-label': {
        px: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
} as const

const foodChipDimSx = {
    ...foodChipSx,
    opacity: 0.3,
} as const

const mealChipSx = {
    'height': 24,
    'fontSize': 12,
    'fontWeight': 600,
    'backgroundColor': '#e3f2fd',
    'border': `1px solid ${colors.primaryBlue}`,
    'boxShadow': `1px 1px 0px ${colors.primaryBlue}`,
    'borderRadius': '3px',
    'color': colors.primaryBlack,
    'cursor': 'pointer',
    'transition': 'all 150ms ease',
    '& .MuiChip-label': {
        px: 0.5,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
} as const

const mealChipActiveSx = {
    ...mealChipSx,
    backgroundColor: '#c2d9ea',
    boxShadow: `1.5px 1.5px 0px ${colors.primaryBlue}`,
} as const

// ── Food group mini card ────────────────────────────────────────────────────

function FoodGroupChip({ name, color }: { name: string; color: string }) {
    return (
        <Box component="span" sx={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 24,
            px: 0.75,
            fontSize: 12,
            fontWeight: 600,
            color: colors.primaryBlack,
            backgroundColor: `${color}35`,
            border: `1px solid ${color}`,
            boxShadow: `1px 1px 0px ${color}`,
            borderRadius: '3px',
            whiteSpace: 'nowrap',
        }}>
            {name}
        </Box>
    )
}

// ── Food chip with group colors ─────────────────────────────────────────────

function getFoodChipSx(groupColors: string[], dimmed: boolean) {
    const base = dimmed ? foodChipDimSx : foodChipSx
    if (groupColors.length === 0) return base

    // Lighten colors for background (mix with white at ~35% opacity)
    const lightColors = groupColors.map((c) => `${c}60`)

    const background = groupColors.length === 1
        ? lightColors[0]
        : `linear-gradient(135deg, ${lightColors.map((c, i) => `${c} ${(i / (lightColors.length - 1)) * 100}%`).join(', ')})`

    return {
        ...base,
        background,
        backgroundColor: undefined,
    }
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatMonthDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Edit target type (day-level) ─────────────────────────────────────────────

type EditTarget = {
    date: string
    mealGroups: MealGroup[]
    standaloneFoods: FoodLogEntry[]
}

// Staged meal — editable meal group card shown in the form during day edit
type StagedMeal = {
    key: string // unique React key
    mealGroupId: number | null // null = new (from preset)
    label: string
    quantity: number
    foods: { foodId: number; quantity: number }[]
}

// ── Diet Day Card ────────────────────────────────────────────────────────────

function DietDayCard({
    day,
    onEdit,
    onDelete,
}: {
    day: DietDay
    onEdit: (day: DietDay) => void
    onDelete: (day: DietDay) => void
}) {
    const [activeMealId, setActiveMealId] = useState<number | null>(null)

    // Build set of food log IDs belonging to the active meal
    const activeFoodIds = useMemo(() => {
        if (activeMealId === null) return null
        const group = day.mealGroups.find((g) => g.id === activeMealId)
        if (!group) return null
        return new Set(group.foods.map((f) => f.id))
    }, [activeMealId, day.mealGroups])

    // All food entries: meal foods first, then standalone
    const allFoods = useMemo(() => {
        const mealFoods = day.mealGroups.flatMap((g) => g.foods)
        return [...mealFoods, ...day.standaloneFoods]
    }, [day.mealGroups, day.standaloneFoods])

    return (
        <SwipeableRow
            canEdit
            canDelete
            onEdit={() => onEdit(day)}
            onDelete={() => onDelete(day)}
            borderRadius="4px"
            border={`1px solid ${colors.primaryBlack}`}
            borderColor={colors.primaryBlack}
            boxShadow={`2px 2px 0px ${colors.primaryBlack}`}>
            <Box sx={{ backgroundColor: colors.primaryWhite }}>
                {/* Date header row */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 1.25,
                        py: 1.25,
                        backgroundColor: '#d4ddb6',
                        borderBottom: `1px solid ${colors.primaryBlack}`,
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
                            color: colors.primaryBlack,
                        }}>
                        {formatMonthDay(day.date)}
                    </Typography>
                </Box>

                {/* Meals zone */}
                {day.mealGroups.length > 0 && (
                    <Box
                        sx={{
                            px: 1.25,
                            py: 1,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            borderBottom: `1px solid ${colors.primaryBlack}15`,
                        }}>
                        {day.mealGroups.map((group) => (
                            <Chip
                                key={`meal-${group.id}`}
                                label={
                                    <>
                                        {group.quantity > 1 && (
                                            <QtyBadge
                                                n={group.quantity}
                                                alwaysShow
                                            />
                                        )}
                                        {group.label}
                                    </>
                                }
                                size="small"
                                sx={
                                    activeMealId === group.id
                                        ? mealChipActiveSx
                                        : mealChipSx
                                }
                                onClick={() =>
                                    setActiveMealId(
                                        activeMealId === group.id
                                            ? null
                                            : group.id
                                    )
                                }
                            />
                        ))}
                    </Box>
                )}

                {/* Foods zone */}
                <Box
                    sx={{
                        px: 1.25,
                        py: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                    }}>
                    {allFoods.map((entry) => {
                        const dimmed =
                            activeFoodIds !== null &&
                            !activeFoodIds.has(entry.id)
                        return (
                            <Chip
                                key={`food-${entry.id}`}
                                label={
                                    <>
                                        {entry.quantity > 1 && (
                                            <QtyBadge n={entry.quantity} />
                                        )}
                                        {entry.food.name}
                                    </>
                                }
                                size="small"
                                sx={getFoodChipSx(entry.food.groups.map((g) => g.color), dimmed)}
                            />
                        )
                    })}
                </Box>
            </Box>
        </SwipeableRow>
    )
}

export default function DietPage() {
    const queryClient = useQueryClient()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
    const [applyingPreset, setApplyingPreset] = useState<number | null>(null)
    const [presetDrawerOpen, setPresetDrawerOpen] = useState(false)

    const searchParams = useSearchParams()
    useEffect(() => {
        if (searchParams.get('presets') === 'open') setPresetDrawerOpen(true)
    }, [searchParams])

    const queries = useQueries({
        queries: [
            {
                queryKey: [...queryKeys.health.foods, 'all'] as const,
                queryFn: async () => {
                    const r = await fetch('/api/health/foods?all=true')
                    if (!r.ok) throw new Error('Failed to fetch foods')
                    return r.json() as Promise<Food[]>
                },
            },
            {
                queryKey: queryKeys.health.foodLogs.all,
                queryFn: async () => {
                    const r = await fetch('/api/health/food-logs')
                    if (!r.ok) throw new Error('Failed to fetch food logs')
                    return r.json() as Promise<DietDay[]>
                },
            },
            {
                queryKey: queryKeys.health.presets.byType('diet'),
                queryFn: async () => {
                    const r = await fetch('/api/health/presets?type=diet')
                    if (!r.ok) throw new Error('Failed to fetch presets')
                    return r.json() as Promise<DietPreset[]>
                },
            },
            {
                queryKey: queryKeys.users.preferences,
                queryFn: async () => {
                    const r = await fetch('/api/users/me/preferences')
                    if (!r.ok) throw new Error('Failed to fetch prefs')
                    return r.json() as Promise<{ alphabetIndexSide?: 'left' | 'right' }>
                },
            },
            {
                queryKey: queryKeys.health.foodGroups,
                queryFn: async () => {
                    const r = await fetch('/api/health/food-groups')
                    if (!r.ok) throw new Error('Failed to fetch food groups')
                    return r.json() as Promise<FoodGroup[]>
                },
            },
        ],
    })
    const foods = queries[0].data ?? []
    const dietDays = queries[1].data ?? []
    const presets = queries[2].data ?? []
    const prefs = queries[3].data
    const foodGroups = queries[4].data ?? []
    const loading = queries.some((q) => q.isLoading)
    const alphabetIndexSide: 'left' | 'right' = prefs?.alphabetIndexSide ?? 'right'

    const fetchData = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.health.foods })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.foodLogs.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.presets.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.foodGroups })
    }, [queryClient])

    // setPresets shim used by reorderPresets — writes to cache for instant feedback
    const setPresets = useCallback(
        (updater: (prev: DietPreset[]) => DietPreset[]) => {
            const key = queryKeys.health.presets.byType('diet')
            const current = queryClient.getQueryData<DietPreset[]>(key) ?? presets
            queryClient.setQueryData(key, updater(current))
        },
        [queryClient, presets],
    )

    const openAdd = useCallback(() => {
        setEditTarget(null)
        setDrawerOpen(true)
    }, [])

    const openEditDay = useCallback((day: DietDay) => {
        setEditTarget({
            date: day.date,
            mealGroups: day.mealGroups,
            standaloneFoods: day.standaloneFoods,
        })
        setDrawerOpen(true)
    }, [])

    const handleDeleteDay = useCallback(
        async (day: DietDay) => {
            try {
                const ops: Promise<Response>[] = []
                // Delete all meal groups (cascade deletes their food logs)
                for (const group of day.mealGroups) {
                    ops.push(
                        fetch(`/api/health/meal-groups/${group.id}`, {
                            method: 'DELETE',
                        })
                    )
                }
                // Delete standalone food logs
                for (const entry of day.standaloneFoods) {
                    ops.push(
                        fetch(`/api/health/food-logs/${entry.id}`, {
                            method: 'DELETE',
                        })
                    )
                }
                await Promise.all(ops)
                fetchData()
            } catch (err) {
                console.error('Failed to delete day logs:', err)
            }
        },
        [fetchData]
    )

    const applyPreset = useCallback(
        async (presetId: number, date?: string) => {
            setApplyingPreset(presetId)
            try {
                const res = await fetch(
                    `/api/health/presets/${presetId}/apply`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: date ?? getLocalDate() }),
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
            }).catch((err) =>
                console.error('Failed to save preset order:', err)
            )
            return next
        })
    }, [])

    useRegisterFab(openAdd)

    const sortedDays = [...dietDays].sort((a, b) =>
        b.date.localeCompare(a.date)
    )

    return (
        <HealthPageLayout loading={loading} onRefresh={fetchData}>
            <HealthPageHeader
                icon={<IconSalad size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />}
                title="Diet"
                color="#c8e6c9">
                {/* Food group legend */}
                {foodGroups.length > 0 && (
                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        alignItems: 'center',
                    }}>
                        {foodGroups.map((g) => (
                            <FoodGroupChip key={g.id} name={g.name} color={g.color} />
                        ))}
                    </Box>
                )}

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
                            'backgroundColor': '#c8e6c9',
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
                    <HorizontalSortableList
                        items={presets}
                        onReorder={reorderPresets}>
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
                                        sx={{ fontSize: 12, fontWeight: 600 }}>
                                        {preset.name}
                                    </Typography>
                                </Box>
                            </SortablePresetChip>
                        ))}
                    </HorizontalSortableList>
                </Box>
            </HealthPageHeader>

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
                            onEdit={openEditDay}
                            onDelete={handleDeleteDay}
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
                foodGroups={foodGroups}
                editTarget={editTarget}
                dietDays={dietDays}
                presets={presets}
                onReorderPresets={reorderPresets}
                onDataChanged={fetchData}
                alphabetIndexSide={alphabetIndexSide}
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
                    const res = await fetch(
                        `/api/health/presets/${presetId}/apply`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ date: getLocalDate() }),
                        }
                    )
                    if (res.ok) fetchData()
                }}
            />
        </HealthPageLayout>
    )
}

// ── Unified Diet Drawer (per-meal) ───────────────────────────────────────────

type DrawerMode = 'log' | 'manage' | 'groups'

type DietDrawerProps = {
    open: boolean
    onClose: () => void
    foods: Food[]
    foodGroups: FoodGroup[]
    editTarget: EditTarget | null
    dietDays: DietDay[]
    presets: DietPreset[]
    onReorderPresets: (from: number, to: number) => void
    onDataChanged: () => void
    alphabetIndexSide: 'left' | 'right'
}

function DietDrawer({
    open,
    onClose,
    foods,
    foodGroups,
    editTarget,
    dietDays,
    presets,
    onReorderPresets,
    onDataChanged,
    alphabetIndexSide,
}: DietDrawerProps) {
    const [mode, setMode] = useState<DrawerMode>('log')
    const [date, setDate] = useState(getLocalDate)
    const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
    const [saving, setSaving] = useState(false)
    // Staged presets — presetId → quantity to apply (new logs only)
    const [stagedPresets, setStagedPresets] = useState<Map<number, number>>(
        new Map()
    )
    // Staged meals — existing meal groups being edited (day-level edit only)
    const [stagedMeals, setStagedMeals] = useState<StagedMeal[]>([])
    // Track meal groups marked for deletion during day-level edit
    const [deletedMealGroupIds, setDeletedMealGroupIds] = useState<Set<number>>(
        new Set()
    )

    // Manage mode state
    const [name, setName] = useState('')
    const [foodSearch, setFoodSearch] = useState('')
    const [inlineEditId, setInlineEditId] = useState<number | null>(null)
    const [inlineEditName, setInlineEditName] = useState('')
    const addInputRef = useRef<HTMLInputElement>(null)

    // Groups mode state
    const [groupName, setGroupName] = useState('')
    const [groupColor, setGroupColor] = useState('#e57373')
    const [editingGroup, setEditingGroup] = useState<FoodGroup | null>(null)
    const [editingGroupName, setEditingGroupName] = useState('')
    const [editingGroupColor, setEditingGroupColor] = useState('')
    const [editingGroupMembers, setEditingGroupMembers] = useState<Set<number>>(new Set())
    const [groupFoodSearch, setGroupFoodSearch] = useState('')

    const activeFoods = foods.filter((f) => f.isActive)

    // Fuse.js for fuzzy food search
    const foodFuse = useMemo(
        () =>
            new Fuse(foods, {
                keys: ['name'],
                threshold: 0.4,
                ignoreLocation: true,
            }),
        [foods]
    )

    const filteredFoods = useMemo(() => {
        if (!foodSearch) return null // null = no filter
        const results = foodFuse.search(foodSearch)
        return new Set(results.map((r) => r.item.id))
    }, [foodFuse, foodSearch])

    // Group foods by first letter for alphabet index (manage mode)
    const manageFoodGroups = useMemo(() => {
        const filtered = foods.filter(
            (f) => !filteredFoods || filteredFoods.has(f.id)
        )
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
        [manageFoodGroups]
    )

    // Manage tab uses its own sectionRefs (Log/Groups use FoodPicker internally)
    const manageSectionRefs = useRef<Map<string, HTMLElement>>(new Map())
    const manageSearchRef = useRef<HTMLDivElement>(null)
    const [manageSearchHeight, setManageSearchHeight] = useState(0)
    useEffect(() => {
        const el = manageSearchRef.current
        setManageSearchHeight(el ? el.offsetHeight : 0)
    }, [mode])

    const scrollToManageLetter = useCallback((letter: string) => {
        const el = manageSectionRefs.current.get(letter)
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
            setStagedPresets(new Map())
            setDeletedMealGroupIds(new Set())
            if (editTarget) {
                // Editing a day — populate staged meals + standalone foods
                setDate(editTarget.date)
                // Meal groups → staged meals
                setStagedMeals(
                    editTarget.mealGroups.map((g) => ({
                        key: `existing-${g.id}`,
                        mealGroupId: g.id,
                        label: g.label,
                        quantity: g.quantity,
                        foods: g.foods.map((f) => ({
                            foodId: f.food.id,
                            quantity: f.quantity,
                        })),
                    }))
                )
                // Standalone foods → quantities map
                const qMap = new Map<number, number>()
                for (const l of editTarget.standaloneFoods) {
                    qMap.set(l.food.id, l.quantity)
                }
                setQuantities(qMap)
            } else {
                // New meal defaults
                setDate(getLocalDate())
                setStagedMeals([])
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
            const standaloneFoodsList = Array.from(quantities.entries()).map(
                ([foodId, qty]) => ({
                    foodId,
                    quantity: qty,
                })
            )

            if (editTarget) {
                const dateChanged = date !== editTarget.date

                if (dateChanged) {
                    // Date changed — nuke both source and target, then recreate from form state.
                    // The form already merged source + target data when the date was changed.

                    // 1. Delete everything on source day
                    const deleteOps: Promise<Response>[] = []
                    for (const g of editTarget.mealGroups) {
                        deleteOps.push(
                            fetch(`/api/health/meal-groups/${g.id}`, {
                                method: 'DELETE',
                            })
                        )
                    }
                    for (const f of editTarget.standaloneFoods) {
                        deleteOps.push(
                            fetch(`/api/health/food-logs/${f.id}`, {
                                method: 'DELETE',
                            })
                        )
                    }
                    // 2. Delete everything on target day
                    const targetDay = dietDays.find((d) => d.date === date)
                    if (targetDay) {
                        for (const g of targetDay.mealGroups) {
                            deleteOps.push(
                                fetch(`/api/health/meal-groups/${g.id}`, {
                                    method: 'DELETE',
                                })
                            )
                        }
                        for (const f of targetDay.standaloneFoods) {
                            deleteOps.push(
                                fetch(`/api/health/food-logs/${f.id}`, {
                                    method: 'DELETE',
                                })
                            )
                        }
                    }
                    await Promise.all(deleteOps)

                    // 3. Recreate staged meals — POST foods with mealLabel, then set quantity
                    for (const meal of stagedMeals) {
                        let mealGroupId: number | null = null
                        for (const food of meal.foods) {
                            const res = await fetch('/api/health/food-logs', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    date,
                                    foodId: food.foodId,
                                    quantity: food.quantity,
                                    mealLabel: meal.label,
                                }),
                            })
                            if (!mealGroupId && res.ok) {
                                const data = await res.json()
                                mealGroupId = data.mealGroupId
                            }
                        }
                        // Set meal quantity if > 1
                        if (mealGroupId && meal.quantity > 1) {
                            await fetch(
                                `/api/health/meal-groups/${mealGroupId}`,
                                {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        quantity: meal.quantity,
                                    }),
                                }
                            )
                        }
                    }

                    // 4. Create standalone foods
                    const createOps: Promise<Response>[] = []
                    for (const food of standaloneFoodsList) {
                        createOps.push(
                            fetch('/api/health/food-logs', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    date,
                                    foodId: food.foodId,
                                    quantity: food.quantity,
                                }),
                            })
                        )
                    }
                    await Promise.all(createOps)
                } else {
                    // Same date — per-item reconciliation
                    const ops: Promise<Response>[] = []

                    // 1. Delete removed meal groups
                    for (const id of Array.from(deletedMealGroupIds)) {
                        ops.push(
                            fetch(`/api/health/meal-groups/${id}`, {
                                method: 'DELETE',
                            })
                        )
                    }

                    // 2. Update existing meal groups / create new ones
                    for (const meal of stagedMeals) {
                        if (meal.mealGroupId) {
                            ops.push(
                                fetch(
                                    `/api/health/meal-groups/${meal.mealGroupId}`,
                                    {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            date,
                                            label: meal.label || null,
                                            quantity: meal.quantity,
                                            foods: meal.foods,
                                        }),
                                    }
                                )
                            )
                        } else {
                            for (const food of meal.foods) {
                                ops.push(
                                    fetch('/api/health/food-logs', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            date,
                                            foodId: food.foodId,
                                            quantity: food.quantity,
                                            mealLabel: meal.label,
                                        }),
                                    })
                                )
                            }
                        }
                    }

                    // 3. Reconcile standalone foods
                    const existingStandalone = editTarget.standaloneFoods
                    const logMap = new Map<number, FoodLogEntry>()
                    for (const l of existingStandalone) logMap.set(l.food.id, l)

                    for (const food of standaloneFoodsList) {
                        const existing = logMap.get(food.foodId)
                        if (existing) {
                            if (existing.quantity !== food.quantity) {
                                ops.push(
                                    fetch(
                                        `/api/health/food-logs/${existing.id}`,
                                        {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type':
                                                    'application/json',
                                            },
                                            body: JSON.stringify({
                                                quantity: food.quantity,
                                                date,
                                            }),
                                        }
                                    )
                                )
                            }
                        } else {
                            ops.push(
                                fetch('/api/health/food-logs', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        date,
                                        foodId: food.foodId,
                                        quantity: food.quantity,
                                    }),
                                })
                            )
                        }
                    }

                    for (const [foodId, log] of Array.from(logMap.entries())) {
                        if (!quantities.has(foodId)) {
                            ops.push(
                                fetch(`/api/health/food-logs/${log.id}`, {
                                    method: 'DELETE',
                                })
                            )
                        }
                    }

                    await Promise.all(ops)
                }
            } else {
                // New log — apply staged presets, then create standalone food logs

                // Apply each staged preset (each call handles meal group creation/quantity increment)
                for (const [presetId, qty] of Array.from(
                    stagedPresets.entries()
                )) {
                    for (let i = 0; i < qty; i++) {
                        await fetch(`/api/health/presets/${presetId}/apply`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ date }),
                        })
                    }
                }

                // Create standalone food logs (no meal label)
                for (const food of standaloneFoodsList) {
                    await fetch('/api/health/food-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            date,
                            foodId: food.foodId,
                            quantity: food.quantity,
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
    }, [
        date,
        quantities,
        stagedPresets,
        stagedMeals,
        deletedMealGroupIds,
        editTarget,
        onDataChanged,
        onClose,
    ])

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

    const saveGroupMembers = useCallback(async () => {
        if (!editingGroup) return
        // Save name/color if changed
        const nameChanged = editingGroupName.trim() && editingGroupName.trim() !== editingGroup.name
        const colorChanged = editingGroupColor && editingGroupColor !== editingGroup.color
        if (nameChanged || colorChanged) {
            const updates: Record<string, string> = {}
            if (nameChanged) updates.name = editingGroupName.trim()
            if (colorChanged) updates.color = editingGroupColor
            await fetch(`/api/health/food-groups/${editingGroup.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            })
        }
        await fetch(`/api/health/food-groups/${editingGroup.id}/members`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foodIds: Array.from(editingGroupMembers) }),
        })
        onDataChanged()
        setEditingGroup(null)
        setEditingGroupName('')
        setEditingGroupColor('')
        setEditingGroupMembers(new Set())
        setGroupFoodSearch('')
    }, [editingGroup, editingGroupName, editingGroupColor, editingGroupMembers, onDataChanged])

    const handleAddGroup = useCallback(async () => {
        if (!groupName.trim() || saving) return
        setSaving(true)
        try {
            const res = await fetch('/api/health/food-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: groupName.trim(), color: groupColor }),
            })
            if (res.ok) {
                setGroupName('')
                onDataChanged()
            }
        } finally {
            setSaving(false)
        }
    }, [groupName, groupColor, saving, onDataChanged])

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

    // When date changes during edit, rebuild form from source + target day data
    const handleEditDateChange = useCallback(
        (newDate: string) => {
            setDate(newDate)
            if (!editTarget) return

            // Start with source day data
            const meals: StagedMeal[] = editTarget.mealGroups.map((g) => ({
                key: `existing-${g.id}`,
                mealGroupId: g.id,
                label: g.label,
                quantity: g.quantity,
                foods: g.foods.map((f) => ({
                    foodId: f.food.id,
                    quantity: f.quantity,
                })),
            }))
            const qMap = new Map<number, number>()
            for (const l of editTarget.standaloneFoods) {
                qMap.set(l.food.id, l.quantity)
            }

            // Merge target day data if moving to a different date
            if (newDate !== editTarget.date) {
                const targetDay = dietDays.find((d) => d.date === newDate)
                if (targetDay) {
                    for (const g of targetDay.mealGroups) {
                        const match = meals.find(
                            (m) =>
                                m.label.toLowerCase() === g.label.toLowerCase()
                        )
                        if (match) {
                            // Same label — sum quantities
                            match.quantity += g.quantity
                        } else {
                            meals.push({
                                key: `target-${g.id}`,
                                mealGroupId: g.id,
                                label: g.label,
                                quantity: g.quantity,
                                foods: g.foods.map((f) => ({
                                    foodId: f.food.id,
                                    quantity: f.quantity,
                                })),
                            })
                        }
                    }
                    for (const l of targetDay.standaloneFoods) {
                        qMap.set(
                            l.food.id,
                            (qMap.get(l.food.id) ?? 0) + l.quantity
                        )
                    }
                }
            }

            setStagedMeals(meals)
            setQuantities(qMap)
            setDeletedMealGroupIds(new Set())
            setStagedPresets(new Map())
        },
        [editTarget, dietDays]
    )

    const removeStagedMeal = useCallback(
        (key: string, mealGroupId: number | null) => {
            setStagedMeals((prev) => prev.filter((m) => m.key !== key))
            if (mealGroupId) {
                setDeletedMealGroupIds((prev) => {
                    const next = new Set(prev)
                    next.add(mealGroupId)
                    return next
                })
            }
        },
        []
    )

    const setStagedMealQuantity = useCallback((key: string, qty: number) => {
        setStagedMeals((prev) =>
            prev.map((m) =>
                m.key === key ? { ...m, quantity: Math.max(1, qty) } : m
            )
        )
    }, [])

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
                        pt: 0,
                        pb: 1.5,
                        mt: -0.5,
                        borderBottom: `1px solid ${colors.primaryBlack}20`,
                    }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>
                        {isEditing ? 'Edit Day' : 'Log Meal'}
                    </Typography>

                    {/* Mode toggle */}
                    <SlidingToggle
                        value={mode}
                        options={[
                            { value: 'log', label: isEditing ? 'Edit' : 'Log' },
                            { value: 'manage', label: 'Foods' },
                            { value: 'groups', label: 'Groups' },
                        ]}
                        onChange={(v) => {
                            setMode(v as DrawerMode)
                            setFoodSearch('')
                        }}
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
                                    onChange={(e) =>
                                        isEditing
                                            ? handleEditDateChange(
                                                  e.target.value
                                              )
                                            : setDate(e.target.value)
                                    }
                                    size="small"
                                    fullWidth
                                    sx={fieldSx}
                                />
                            </Box>

                            {/* Preset chips — available in both new and edit modes */}
                            {presets.length > 0 && (
                                <Box>
                                    <Typography sx={{ ...labelSx, mb: 0.75 }}>
                                        Presets
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 1,
                                            alignItems: 'center',
                                        }}>
                                        <Box
                                            sx={{
                                                width: 30,
                                                height: 30,
                                                borderRadius: '50%',
                                                backgroundColor: '#c8e6c9',
                                                border: `1.5px solid ${colors.primaryBlack}`,
                                                boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                            <IconBolt
                                                size={14}
                                                stroke={2.5}
                                                fill={colors.primaryWhite}
                                                color={colors.primaryBlack}
                                            />
                                        </Box>
                                        <HorizontalSortableList
                                            items={presets}
                                            onReorder={onReorderPresets}>
                                            {presets.map((preset) => {
                                                const staged = isEditing
                                                    ? stagedMeals.filter(
                                                          (m) =>
                                                              !m.mealGroupId &&
                                                              m.label ===
                                                                  preset.name
                                                      ).length
                                                    : (stagedPresets.get(
                                                          preset.id
                                                      ) ?? 0)
                                                return (
                                                    <SortablePresetChip
                                                        key={preset.id}
                                                        id={preset.id}>
                                                        <Box
                                                            onClick={() => {
                                                                if (isEditing) {
                                                                    // Add preset as a new staged meal
                                                                    setStagedMeals(
                                                                        (
                                                                            prev
                                                                        ) => [
                                                                            ...prev,
                                                                            {
                                                                                key: `preset-${preset.id}-${Date.now()}`,
                                                                                mealGroupId:
                                                                                    null,
                                                                                label: preset.name,
                                                                                quantity: 1,
                                                                                foods: preset.items.map(
                                                                                    (
                                                                                        item
                                                                                    ) => ({
                                                                                        foodId: item.foodId,
                                                                                        quantity:
                                                                                            item.quantity,
                                                                                    })
                                                                                ),
                                                                            },
                                                                        ]
                                                                    )
                                                                } else {
                                                                    setStagedPresets(
                                                                        (
                                                                            prev
                                                                        ) => {
                                                                            const next =
                                                                                new Map(
                                                                                    prev
                                                                                )
                                                                            next.set(
                                                                                preset.id,
                                                                                (next.get(
                                                                                    preset.id
                                                                                ) ??
                                                                                    0) +
                                                                                    1
                                                                            )
                                                                            return next
                                                                        }
                                                                    )
                                                                }
                                                            }}
                                                            sx={{
                                                                'px': 1.25,
                                                                'py': 0.5,
                                                                'backgroundColor':
                                                                    staged > 0
                                                                        ? '#f1f8e9'
                                                                        : colors.primaryWhite,
                                                                'border': `1.5px solid ${colors.primaryBlack}`,
                                                                'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                                                'borderRadius':
                                                                    '4px',
                                                                'cursor':
                                                                    'pointer',
                                                                'transition':
                                                                    'all 0.15s',
                                                                '&:active': {
                                                                    boxShadow: `0.5px 0.5px 0px ${colors.primaryBlack}`,
                                                                    transform:
                                                                        'translate(1px, 1px)',
                                                                },
                                                            }}>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                }}>
                                                                {preset.name}
                                                                {staged > 0
                                                                    ? ` x${staged}`
                                                                    : ''}
                                                            </Typography>
                                                        </Box>
                                                    </SortablePresetChip>
                                                )
                                            })}
                                        </HorizontalSortableList>
                                    </Box>
                                    {/* Staged preset summary — new log only */}
                                    {!isEditing && stagedPresets.size > 0 && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.75,
                                                mt: 1.5,
                                            }}>
                                            {Array.from(
                                                stagedPresets.entries()
                                            ).map(([presetId, qty]) => {
                                                const preset = presets.find(
                                                    (p) => p.id === presetId
                                                )
                                                if (!preset) return null
                                                return (
                                                    <Box
                                                        key={presetId}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 1,
                                                            width: '100%',
                                                        }}>
                                                        <Box
                                                            sx={{
                                                                padding:
                                                                    '6px 12px',
                                                                ...cardSx,
                                                                backgroundColor:
                                                                    '#f1f8e9',
                                                                borderColor:
                                                                    colors.primaryBlack,
                                                            }}>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    whiteSpace:
                                                                        'nowrap',
                                                                }}>
                                                                {preset.name}
                                                            </Typography>
                                                        </Box>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: 0.5,
                                                                flexShrink: 0,
                                                                ml: 'auto',
                                                            }}>
                                                            <Box
                                                                onClick={() => {
                                                                    setStagedPresets(
                                                                        (
                                                                            prev
                                                                        ) => {
                                                                            const next =
                                                                                new Map(
                                                                                    prev
                                                                                )
                                                                            if (
                                                                                qty <=
                                                                                1
                                                                            )
                                                                                next.delete(
                                                                                    presetId
                                                                                )
                                                                            else
                                                                                next.set(
                                                                                    presetId,
                                                                                    qty -
                                                                                        1
                                                                                )
                                                                            return next
                                                                        }
                                                                    )
                                                                }}
                                                                sx={{
                                                                    'width': 24,
                                                                    'height': 24,
                                                                    'borderRadius':
                                                                        '50%',
                                                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                                                    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                                    'display':
                                                                        'flex',
                                                                    'alignItems':
                                                                        'center',
                                                                    'justifyContent':
                                                                        'center',
                                                                    'cursor':
                                                                        'pointer',
                                                                    'backgroundColor':
                                                                        colors.primaryWhite,
                                                                    '&:active':
                                                                        {
                                                                            boxShadow:
                                                                                'none',
                                                                            transform:
                                                                                'translate(1px, 1px)',
                                                                        },
                                                                }}>
                                                                <IconMinus
                                                                    size={12}
                                                                    stroke={2.5}
                                                                />
                                                            </Box>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 14,
                                                                    fontWeight: 700,
                                                                    minWidth: 20,
                                                                    textAlign:
                                                                        'center',
                                                                }}>
                                                                {qty}
                                                            </Typography>
                                                            <Box
                                                                onClick={() => {
                                                                    setStagedPresets(
                                                                        (
                                                                            prev
                                                                        ) => {
                                                                            const next =
                                                                                new Map(
                                                                                    prev
                                                                                )
                                                                            next.set(
                                                                                presetId,
                                                                                qty +
                                                                                    1
                                                                            )
                                                                            return next
                                                                        }
                                                                    )
                                                                }}
                                                                sx={{
                                                                    'width': 24,
                                                                    'height': 24,
                                                                    'borderRadius':
                                                                        '50%',
                                                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                                                    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                                    'display':
                                                                        'flex',
                                                                    'alignItems':
                                                                        'center',
                                                                    'justifyContent':
                                                                        'center',
                                                                    'cursor':
                                                                        'pointer',
                                                                    'backgroundColor':
                                                                        colors.primaryWhite,
                                                                    '&:active':
                                                                        {
                                                                            boxShadow:
                                                                                'none',
                                                                            transform:
                                                                                'translate(1px, 1px)',
                                                                        },
                                                                }}>
                                                                <IconPlus
                                                                    size={12}
                                                                    stroke={2.5}
                                                                />
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Staged meals — day-level edit shows existing + newly-added meal groups */}
                            {isEditing && stagedMeals.length > 0 && (
                                <Box>
                                    <Typography sx={{ ...labelSx, mb: 0.75 }}>
                                        Meals
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.75,
                                        }}>
                                        {stagedMeals.map((meal) => (
                                            <Box
                                                key={meal.key}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    width: '100%',
                                                }}>
                                                <Box
                                                    sx={{
                                                        padding: '6px 12px',
                                                        ...cardSx,
                                                        backgroundColor:
                                                            '#e3f2fd',
                                                        borderColor:
                                                            colors.primaryBlue,
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            whiteSpace:
                                                                'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow:
                                                                'ellipsis',
                                                        }}>
                                                        {meal.label}
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 11,
                                                            color: colors.primaryBrown,
                                                            whiteSpace:
                                                                'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow:
                                                                'ellipsis',
                                                            mt: 0.25,
                                                        }}>
                                                        {meal.foods
                                                            .map((f) => {
                                                                const food =
                                                                    foods.find(
                                                                        (fd) =>
                                                                            fd.id ===
                                                                            f.foodId
                                                                    )
                                                                return f.quantity >
                                                                    1
                                                                    ? `${food?.name ?? '?'} \u00d7${f.quantity}`
                                                                    : (food?.name ??
                                                                          '?')
                                                            })
                                                            .join(', ')}
                                                    </Typography>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        flexShrink: 0,
                                                    }}>
                                                    <Box
                                                        onClick={() =>
                                                            setStagedMealQuantity(
                                                                meal.key,
                                                                meal.quantity -
                                                                    1
                                                            )
                                                        }
                                                        sx={{
                                                            'width': 24,
                                                            'height': 24,
                                                            'borderRadius':
                                                                '50%',
                                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                                            'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                            'display': 'flex',
                                                            'alignItems':
                                                                'center',
                                                            'justifyContent':
                                                                'center',
                                                            'cursor': 'pointer',
                                                            'backgroundColor':
                                                                colors.primaryWhite,
                                                            '&:active': {
                                                                boxShadow:
                                                                    'none',
                                                                transform:
                                                                    'translate(1px, 1px)',
                                                            },
                                                        }}>
                                                        <IconMinus
                                                            size={12}
                                                            stroke={2.5}
                                                        />
                                                    </Box>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 14,
                                                            fontWeight: 700,
                                                            minWidth: 20,
                                                            textAlign: 'center',
                                                        }}>
                                                        {meal.quantity}
                                                    </Typography>
                                                    <Box
                                                        onClick={() =>
                                                            setStagedMealQuantity(
                                                                meal.key,
                                                                meal.quantity +
                                                                    1
                                                            )
                                                        }
                                                        sx={{
                                                            'width': 24,
                                                            'height': 24,
                                                            'borderRadius':
                                                                '50%',
                                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                                            'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                            'display': 'flex',
                                                            'alignItems':
                                                                'center',
                                                            'justifyContent':
                                                                'center',
                                                            'cursor': 'pointer',
                                                            'backgroundColor':
                                                                colors.primaryWhite,
                                                            '&:active': {
                                                                boxShadow:
                                                                    'none',
                                                                transform:
                                                                    'translate(1px, 1px)',
                                                            },
                                                        }}>
                                                        <IconPlus
                                                            size={12}
                                                            stroke={2.5}
                                                        />
                                                    </Box>
                                                    <Box
                                                        onClick={() =>
                                                            removeStagedMeal(
                                                                meal.key,
                                                                meal.mealGroupId
                                                            )
                                                        }
                                                        sx={{
                                                            'width': 24,
                                                            'height': 24,
                                                            'borderRadius':
                                                                '50%',
                                                            'display': 'flex',
                                                            'alignItems':
                                                                'center',
                                                            'justifyContent':
                                                                'center',
                                                            'cursor': 'pointer',
                                                            'ml': 0.25,
                                                            '&:active': {
                                                                backgroundColor: `${colors.primaryRed}20`,
                                                            },
                                                        }}>
                                                        <IconX
                                                            size={14}
                                                            stroke={2.5}
                                                            color={
                                                                colors.primaryRed
                                                            }
                                                        />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Food checklist (standalone foods — not part of meal groups) */}
                            <Typography sx={{ ...labelSx, mb: -1 }}>
                                {isEditing ? 'Individual Foods' : 'Foods'}
                            </Typography>
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
                                <FoodPicker
                                    foods={activeFoods}
                                    selectedIds={new Set(quantities.keys())}
                                    onToggle={toggleFoodSelection}
                                    search={foodSearch}
                                    onSearchChange={setFoodSearch}
                                    alphabetIndexSide={alphabetIndexSide}
                                    accentColor="#4caf50"
                                    renderChip={(food) => {
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
                                    }}
                                    renderItem={(food, isSelected) => {
                                        const qty = quantities.get(food.id) ?? 0
                                        return (
                                            <Box
                                                key={food.id}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    padding: '8px 12px',
                                                    ...cardSx,
                                                    backgroundColor: isSelected ? '#f1f8e9' : colors.primaryWhite,
                                                    borderColor: isSelected ? '#4caf50' : colors.primaryBlack,
                                                    boxShadow: `2px 2px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                    transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
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
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        flexShrink: 0,
                                                        visibility: isSelected ? 'visible' : 'hidden',
                                                    }}>
                                                    <Box
                                                        onClick={() => setFoodQuantity(food.id, qty - 1)}
                                                        sx={{
                                                            'width': 24, 'height': 24, 'borderRadius': '50%',
                                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                                            'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                            'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center',
                                                            'cursor': 'pointer', 'backgroundColor': colors.primaryWhite,
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
                                                            'width': 24, 'height': 24, 'borderRadius': '50%',
                                                            'border': `1.5px solid ${colors.primaryBlack}`,
                                                            'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                            'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center',
                                                            'cursor': 'pointer', 'backgroundColor': colors.primaryWhite,
                                                            '&:active': { boxShadow: 'none', transform: 'translate(1px, 1px)' },
                                                        }}>
                                                        <IconPlus size={12} stroke={2.5} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        )
                                    }}
                                />
                            )}
                        </>
                    ) : mode === 'manage' ? (
                        <>
                            {/* Sticky search filter */}
                            {foods.length > 5 && (
                                <Box
                                    ref={manageSearchRef}
                                    sx={{
                                        position: 'sticky',
                                        top: -16,
                                        zIndex: 2,
                                        backgroundColor: colors.primaryWhite,
                                        pb: 0.5,
                                        mb: 0,
                                        mx: -2.5,
                                        px: 2.5,
                                    }}>
                                    <TextField
                                        value={foodSearch}
                                        onChange={(e) =>
                                            setFoodSearch(e.target.value)
                                        }
                                        size="small"
                                        fullWidth
                                        placeholder="Search foods..."
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <IconSearch
                                                        size={16}
                                                        stroke={2}
                                                        color={colors.primaryBrown}
                                                        style={{ marginRight: 6 }}
                                                    />
                                                ),
                                                endAdornment: foodSearch ? (
                                                    <Box
                                                        onClick={() =>
                                                            setFoodSearch('')
                                                        }
                                                        sx={{
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                        }}>
                                                        <IconX
                                                            size={16}
                                                            stroke={2}
                                                            color={
                                                                colors.primaryBrown
                                                            }
                                                        />
                                                    </Box>
                                                ) : null,
                                            },
                                        }}
                                        sx={fieldSx}
                                    />
                                </Box>
                            )}

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
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection:
                                            alphabetIndexSide === 'left'
                                                ? 'row-reverse'
                                                : 'row',
                                    }}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.75,
                                            flex: 1,
                                            minWidth: 0,
                                        }}>
                                        {manageFoodGroups.map(
                                            ([letter, groupFoods], gi) => (
                                                <Box key={letter}>
                                                    {/* Section header */}
                                                    <Typography
                                                        ref={(el) => {
                                                            if (el)
                                                                manageSectionRefs.current.set(
                                                                    letter,
                                                                    el
                                                                )
                                                            else
                                                                manageSectionRefs.current.delete(
                                                                    letter
                                                                )
                                                        }}
                                                        sx={{
                                                            fontSize: 12,
                                                            fontWeight: 800,
                                                            color: colors.primaryBrown,
                                                            px: 0.5,
                                                            pt:
                                                                gi === 0
                                                                    ? 0
                                                                    : 1,
                                                            pb: 0.5,
                                                            scrollMarginTop: 8,
                                                        }}>
                                                        {letter}
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection:
                                                                'column',
                                                            gap: 0.75,
                                                        }}>
                                                        {groupFoods.map(
                                                            (food) => (
                                                                <Box
                                                                    key={
                                                                        food.id
                                                                    }
                                                                    sx={{
                                                                        display:
                                                                            'flex',
                                                                        alignItems:
                                                                            'center',
                                                                        minHeight: 40,
                                                                        padding:
                                                                            '8px 12px',
                                                                        ...cardSx,
                                                                        opacity:
                                                                            food.isActive
                                                                                ? 1
                                                                                : 0.5,
                                                                        backgroundColor:
                                                                            inlineEditId ===
                                                                            food.id
                                                                                ? colors.secondaryYellow
                                                                                : colors.primaryWhite,
                                                                    }}>
                                                                    {inlineEditId ===
                                                                    food.id ? (
                                                                        /* Inline edit — native input keeps exact row height */
                                                                        <>
                                                                            <Box
                                                                                sx={{
                                                                                    flex: 1,
                                                                                    minWidth: 0,
                                                                                }}>
                                                                                <input
                                                                                    // eslint-disable-next-line jsx-a11y/no-autofocus
                                                                                    autoFocus
                                                                                    value={
                                                                                        inlineEditName
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        setInlineEditName(
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    onKeyDown={(
                                                                                        e
                                                                                    ) => {
                                                                                        if (
                                                                                            e.key ===
                                                                                            'Enter'
                                                                                        ) {
                                                                                            e.preventDefault()
                                                                                            handleInlineEditSave()
                                                                                        } else if (
                                                                                            e.key ===
                                                                                            'Escape'
                                                                                        ) {
                                                                                            cancelInlineEdit()
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        fontSize: 14,
                                                                                        fontWeight: 600,
                                                                                        fontFamily:
                                                                                            'inherit',
                                                                                        border: 'none',
                                                                                        outline:
                                                                                            'none',
                                                                                        background:
                                                                                            'transparent',
                                                                                        padding: 0,
                                                                                        margin: 0,
                                                                                        lineHeight:
                                                                                            'inherit',
                                                                                        borderBottom: `2px solid ${colors.primaryYellow}`,
                                                                                    }}
                                                                                />
                                                                            </Box>
                                                                            <Box
                                                                                sx={{
                                                                                    display:
                                                                                        'flex',
                                                                                    alignItems:
                                                                                        'center',
                                                                                    gap: 0.5,
                                                                                    flexShrink: 0,
                                                                                    ml: 1,
                                                                                }}>
                                                                                <Box
                                                                                    onClick={
                                                                                        handleInlineEditSave
                                                                                    }
                                                                                    sx={{
                                                                                        'cursor':
                                                                                            'pointer',
                                                                                        'display':
                                                                                            'flex',
                                                                                        'alignItems':
                                                                                            'center',
                                                                                        'justifyContent':
                                                                                            'center',
                                                                                        'width': 28,
                                                                                        'height': 28,
                                                                                        'borderRadius':
                                                                                            '4px',
                                                                                        '&:active':
                                                                                            {
                                                                                                backgroundColor:
                                                                                                    '#c8e6c9',
                                                                                            },
                                                                                    }}>
                                                                                    <IconCheck
                                                                                        size={
                                                                                            18
                                                                                        }
                                                                                        stroke={
                                                                                            2.5
                                                                                        }
                                                                                        color="#4caf50"
                                                                                    />
                                                                                </Box>
                                                                                <Box
                                                                                    onClick={
                                                                                        cancelInlineEdit
                                                                                    }
                                                                                    sx={{
                                                                                        'cursor':
                                                                                            'pointer',
                                                                                        'display':
                                                                                            'flex',
                                                                                        'alignItems':
                                                                                            'center',
                                                                                        'justifyContent':
                                                                                            'center',
                                                                                        'width': 28,
                                                                                        'height': 28,
                                                                                        'borderRadius':
                                                                                            '4px',
                                                                                        '&:active':
                                                                                            {
                                                                                                backgroundColor: `${colors.primaryRed}20`,
                                                                                            },
                                                                                    }}>
                                                                                    <IconX
                                                                                        size={
                                                                                            18
                                                                                        }
                                                                                        stroke={
                                                                                            2.5
                                                                                        }
                                                                                        color={
                                                                                            colors.primaryBrown
                                                                                        }
                                                                                    />
                                                                                </Box>
                                                                            </Box>
                                                                        </>
                                                                    ) : (
                                                                        /* Display mode */
                                                                        <>
                                                                            <Box
                                                                                sx={{
                                                                                    flex: 1,
                                                                                    minWidth: 0,
                                                                                }}>
                                                                                <Typography
                                                                                    sx={{
                                                                                        fontSize: 14,
                                                                                        fontWeight: 600,
                                                                                    }}>
                                                                                    {
                                                                                        food.name
                                                                                    }
                                                                                </Typography>
                                                                                {!food.isActive && (
                                                                                    <Typography
                                                                                        sx={{
                                                                                            fontSize: 11,
                                                                                            color: colors.primaryBrown,
                                                                                            fontStyle:
                                                                                                'italic',
                                                                                        }}>
                                                                                        Inactive
                                                                                    </Typography>
                                                                                )}
                                                                            </Box>
                                                                            <Box
                                                                                sx={{
                                                                                    display:
                                                                                        'flex',
                                                                                    alignItems:
                                                                                        'center',
                                                                                    gap: 0.5,
                                                                                    flexShrink: 0,
                                                                                }}>
                                                                                <Box
                                                                                    onClick={() =>
                                                                                        startInlineEdit(
                                                                                            food
                                                                                        )
                                                                                    }
                                                                                    sx={{
                                                                                        'cursor':
                                                                                            'pointer',
                                                                                        'display':
                                                                                            'flex',
                                                                                        'alignItems':
                                                                                            'center',
                                                                                        'justifyContent':
                                                                                            'center',
                                                                                        'width': 28,
                                                                                        'height': 28,
                                                                                        'borderRadius':
                                                                                            '4px',
                                                                                        '&:active':
                                                                                            {
                                                                                                backgroundColor: `${colors.primaryYellow}40`,
                                                                                            },
                                                                                    }}>
                                                                                    <IconPencil
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                        stroke={
                                                                                            2
                                                                                        }
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
                                                                                        'cursor':
                                                                                            'pointer',
                                                                                        'display':
                                                                                            'flex',
                                                                                        'alignItems':
                                                                                            'center',
                                                                                        'justifyContent':
                                                                                            'center',
                                                                                        'width': 28,
                                                                                        'height': 28,
                                                                                        'borderRadius':
                                                                                            '4px',
                                                                                        '&:active':
                                                                                            {
                                                                                                backgroundColor: `${colors.primaryRed}20`,
                                                                                            },
                                                                                    }}>
                                                                                    <IconTrash
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                        stroke={
                                                                                            2
                                                                                        }
                                                                                        color={
                                                                                            colors.primaryRed
                                                                                        }
                                                                                    />
                                                                                </Box>
                                                                            </Box>
                                                                        </>
                                                                    )}
                                                                </Box>
                                                            )
                                                        )}
                                                    </Box>
                                                </Box>
                                            )
                                        )}
                                    </Box>
                                    {!foodSearch && (
                                        <AlphabetIndex
                                            availableLetters={manageFoodLetters}
                                            onSelect={scrollToManageLetter}
                                            topOffset={manageSearchHeight}
                                            side={alphabetIndexSide}
                                        />
                                    )}
                                </Box>
                            )}

                            {/* Floating add-food input — sticky at bottom */}
                            <Box sx={{
                                position: 'sticky',
                                bottom: -16, // offset parent py:2
                                zIndex: 2,
                                mx: -2.5,
                                px: 2.5,
                                mb: -2, // eat parent py:2 so no scroll shift
                                pb: 2,
                                pt: 1,
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
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <Box
                                                    onClick={handleAddFood}
                                                    sx={{
                                                        'display': 'flex',
                                                        'cursor': name.trim() ? 'pointer' : 'default',
                                                        'opacity': name.trim() ? 1 : 0.3,
                                                        '&:active': name.trim() ? { transform: 'scale(0.9)' } : {},
                                                    }}>
                                                    <IconPlus size={18} stroke={2.5} color={colors.primaryBlack} />
                                                </Box>
                                            ),
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            </Box>
                        </>
                    ) : mode === 'groups' ? (
                        editingGroup ? (
                            /* Editing a group — assign foods */
                            <>
                                <FoodPicker
                                    foods={activeFoods}
                                    selectedIds={editingGroupMembers}
                                    onToggle={(foodId) => {
                                        const next = new Set(editingGroupMembers)
                                        if (next.has(foodId)) next.delete(foodId)
                                        else next.add(foodId)
                                        setEditingGroupMembers(next)
                                    }}
                                    search={groupFoodSearch}
                                    onSearchChange={setGroupFoodSearch}
                                    alphabetIndexSide={alphabetIndexSide}
                                    accentColor={editingGroupColor}
                                    headerContent={
                                        <Box sx={{ mb: 1.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Box
                                                component="label"
                                                sx={{
                                                    width: 40, height: 40, borderRadius: '4px',
                                                    border: `1px solid ${colors.primaryBlack}`,
                                                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                                    backgroundColor: editingGroupColor,
                                                    cursor: 'pointer', flexShrink: 0, display: 'block',
                                                    position: 'relative', overflow: 'hidden',
                                                }}>
                                                <Box
                                                    component="input"
                                                    type="color"
                                                    value={editingGroupColor}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingGroupColor(e.target.value)}
                                                    sx={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                                />
                                            </Box>
                                            <TextField
                                                value={editingGroupName}
                                                onChange={(e) => setEditingGroupName(e.target.value)}
                                                size="small"
                                                fullWidth
                                                placeholder="Group name..."
                                                sx={{
                                                    ...fieldSx,
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: editingGroupColor },
                                                    '& .MuiOutlinedInput-root': { boxShadow: `2px 2px 0px ${editingGroupColor}` },
                                                    'backgroundColor': `${editingGroupColor}15`,
                                                }}
                                            />
                                        </Box>
                                    }
                                    renderChip={(food) => (
                                        <Chip
                                            key={food.id}
                                            label={food.name}
                                            size="small"
                                            onDelete={() => {
                                                const next = new Set(editingGroupMembers)
                                                next.delete(food.id)
                                                setEditingGroupMembers(next)
                                            }}
                                            sx={{
                                                'height': 24, 'fontSize': 12, 'fontWeight': 600,
                                                'backgroundColor': `${editingGroupColor}20`,
                                                'border': `1.5px solid ${editingGroupColor}`,
                                                'borderRadius': '6px',
                                                '& .MuiChip-label': { px: 1 },
                                                '& .MuiChip-deleteIcon': { fontSize: 14, color: editingGroupColor, marginRight: '4px' },
                                            }}
                                        />
                                    )}
                                    renderItem={(food, isMember) => (
                                        <Box
                                            key={food.id}
                                            onClick={() => {
                                                const next = new Set(editingGroupMembers)
                                                if (isMember) next.delete(food.id)
                                                else next.add(food.id)
                                                setEditingGroupMembers(next)
                                            }}
                                            sx={{
                                                'display': 'flex', 'alignItems': 'center', 'minHeight': 40,
                                                'padding': '8px 12px',
                                                ...cardSx,
                                                'backgroundColor': isMember ? `${editingGroupColor}20` : colors.primaryWhite,
                                                'borderColor': isMember ? editingGroupColor : colors.primaryBlack,
                                                'boxShadow': isMember ? `2px 2px 0px ${editingGroupColor}` : cardSx.boxShadow,
                                                'cursor': 'pointer',
                                                '&:active': { backgroundColor: `${editingGroupColor}30` },
                                                'transition': 'all 100ms ease',
                                            }}>
                                            <Checkbox
                                                checked={isMember}
                                                size="small"
                                                sx={{
                                                    'p': 0, 'mr': 1,
                                                    'color': colors.primaryBrown,
                                                    '&.Mui-checked': { color: editingGroupColor },
                                                }}
                                            />
                                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{food.name}</Typography>
                                        </Box>
                                    )}
                                />
                            </>
                        ) : (
                            /* Group list + create */
                            <>
                                {/* Add new group */}
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pb: 1.5, borderBottom: `1px solid ${colors.primaryBlack}15` }}>
                                    {/* Color picker */}
                                    <Box
                                        component="label"
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '4px',
                                            border: `1px solid ${colors.primaryBlack}`,
                                            boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                                            backgroundColor: groupColor,
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            display: 'block',
                                            position: 'relative',
                                            overflow: 'hidden',
                                        }}>
                                        <Box
                                            component="input"
                                            type="color"
                                            value={groupColor}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroupColor(e.target.value)}
                                            sx={{
                                                position: 'absolute',
                                                opacity: 0,
                                                width: '100%',
                                                height: '100%',
                                                cursor: 'pointer',
                                            }}
                                        />
                                    </Box>
                                    <TextField
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && groupName.trim()) {
                                                e.preventDefault()
                                                handleAddGroup()
                                            }
                                        }}
                                        size="small"
                                        fullWidth
                                        placeholder="New group name..."
                                        slotProps={{
                                            input: {
                                                endAdornment: (
                                                    <Box
                                                        onClick={handleAddGroup}
                                                        sx={{
                                                            'display': 'flex',
                                                            'cursor': groupName.trim() ? 'pointer' : 'default',
                                                            'opacity': groupName.trim() ? 1 : 0.3,
                                                            '&:active': groupName.trim() ? { transform: 'scale(0.9)' } : {},
                                                        }}>
                                                        <IconPlus size={18} stroke={2.5} color={colors.primaryBlack} />
                                                    </Box>
                                                ),
                                            },
                                        }}
                                        sx={fieldSx}
                                    />
                                </Box>

                                {/* Existing groups */}
                                {foodGroups.length === 0 ? (
                                    <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 2 }}>
                                        No food groups yet. Create one above.
                                    </Typography>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
                                        {foodGroups.map((group) => (
                                            <SwipeableRow
                                                key={group.id}
                                                canEdit={false}
                                                canDelete
                                                onEdit={() => {}}
                                                onDelete={async () => {
                                                    await fetch(`/api/health/food-groups/${group.id}`, { method: 'DELETE' })
                                                    onDataChanged()
                                                }}
                                                borderRadius="4px"
                                                border={`1px solid ${group.color}`}
                                                borderColor={group.color}
                                                boxShadow={`2px 2px 0px ${group.color}`}>
                                                <Box
                                                    onClick={() => {
                                                        setEditingGroup(group)
                                                        setEditingGroupName(group.name)
                                                        setEditingGroupColor(group.color)
                                                        setEditingGroupMembers(new Set(group.foodIds))
                                                    }}
                                                    sx={{
                                                        'display': 'flex',
                                                        'alignItems': 'center',
                                                        'gap': 1.25,
                                                        'px': 1.25,
                                                        'py': 1,
                                                        'cursor': 'pointer',
                                                        'backgroundColor': `${group.color}15`,
                                                        '&:active': { backgroundColor: `${group.color}30` },
                                                        'transition': 'background-color 100ms ease',
                                                    }}>
                                                    <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0 }}>
                                                        {group.name}
                                                    </Typography>
                                                    <Box sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        backgroundColor: colors.primaryWhite,
                                                        border: `1px solid ${group.color}`,
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                    }}>
                                                        {group.foodIds.length}
                                                    </Box>
                                                </Box>
                                            </SwipeableRow>
                                        ))}
                                    </Box>
                                )}
                            </>
                        )
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
                    {mode === 'log' ? (
                        <>
                            <Button
                                onClick={onClose}
                                disabled={saving}
                                size="large"
                                sx={secondaryButtonSx}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleLogSubmit}
                                disabled={
                                    (quantities.size === 0 &&
                                        stagedPresets.size === 0 &&
                                        stagedMeals.length === 0) ||
                                    saving
                                }
                                size="large"
                                sx={primaryButtonSx}>
                                {saving ? 'Saving...' : isEditing ? 'Save' : 'Log'}
                            </Button>
                        </>
                    ) : mode === 'groups' && editingGroup ? (
                        <>
                            <Button
                                onClick={() => {
                                    setEditingGroup(null)
                                    setEditingGroupColor('')
                                    setEditingGroupMembers(new Set())
                                    setGroupFoodSearch('')
                                }}
                                disabled={saving}
                                size="large"
                                sx={secondaryButtonSx}>
                                Back
                            </Button>
                            <Button
                                onClick={saveGroupMembers}
                                disabled={saving}
                                size="large"
                                sx={primaryButtonSx}>
                                Done
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={onClose}
                            disabled={saving}
                            size="large"
                            sx={{ ...primaryButtonSx, ml: 'auto' }}>
                            Done
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

    const openForm = useCallback(
        (preset: DietPreset | null) => {
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
        },
        [resetForm]
    )

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

        const foodItems = Array.from(quantities.entries()).map(
            ([foodId, quantity]) => ({
                foodId,
                quantity,
            })
        )

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
                            <IconArrowLeft
                                size={20}
                                stroke={2}
                                color={colors.primaryBlack}
                            />
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
                                <VerticalSortableList
                                    items={existingPresets}
                                    onReorder={onReorder}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.75,
                                        }}>
                                        {existingPresets.map((p) => (
                                            <SortablePresetRow
                                                key={p.id}
                                                id={p.id}>
                                                <Box
                                                    sx={{
                                                        ...cardSx,
                                                        overflow: 'hidden',
                                                    }}>
                                                    <SwipeableRow
                                                        canEdit
                                                        canDelete
                                                        onEdit={() =>
                                                            openForm(p)
                                                        }
                                                        onDelete={() =>
                                                            onDelete(p.id)
                                                        }
                                                        backgroundColor={
                                                            colors.primaryWhite
                                                        }
                                                        borderColor={
                                                            colors.primaryBlack
                                                        }>
                                                        <Box
                                                            onClick={async () => {
                                                                await onApplyPreset(
                                                                    p.id
                                                                )
                                                                onClose()
                                                            }}
                                                            sx={{
                                                                'display':
                                                                    'flex',
                                                                'alignItems':
                                                                    'center',
                                                                'gap': 1.5,
                                                                'px': 1.5,
                                                                'py': 1.25,
                                                                'cursor':
                                                                    'pointer',
                                                                '&:active': {
                                                                    backgroundColor:
                                                                        colors.secondaryYellow,
                                                                },
                                                                'transition':
                                                                    'background-color 150ms ease',
                                                            }}>
                                                            <SortableDragHandle
                                                                id={p.id}
                                                            />
                                                            <Box
                                                                sx={{
                                                                    flex: 1,
                                                                    minWidth: 0,
                                                                }}>
                                                                <Typography
                                                                    sx={{
                                                                        fontSize: 14,
                                                                        fontWeight: 700,
                                                                        lineHeight: 1.3,
                                                                        overflow:
                                                                            'hidden',
                                                                        textOverflow:
                                                                            'ellipsis',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                    }}>
                                                                    {p.name}
                                                                </Typography>
                                                                <Typography
                                                                    sx={{
                                                                        fontSize: 12,
                                                                        color: colors.primaryBrown,
                                                                        lineHeight: 1.3,
                                                                        overflow:
                                                                            'hidden',
                                                                        textOverflow:
                                                                            'ellipsis',
                                                                        whiteSpace:
                                                                            'nowrap',
                                                                        mt: 0.25,
                                                                    }}>
                                                                    {p.items
                                                                        .map(
                                                                            (
                                                                                it
                                                                            ) =>
                                                                                it.quantity >
                                                                                1
                                                                                    ? `${it.foodName} \u00d7${it.quantity}`
                                                                                    : it.foodName
                                                                        )
                                                                        .join(
                                                                            ', '
                                                                        )}
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
                                        {[...activeFoods]
                                            .sort((a, b) => {
                                                const aSelected =
                                                    quantities.has(a.id) ? 0 : 1
                                                const bSelected =
                                                    quantities.has(b.id) ? 0 : 1
                                                return aSelected - bSelected
                                            })
                                            .map((food) => {
                                                const qty =
                                                    quantities.get(food.id) ?? 0
                                                const isSelected = qty > 0
                                                return (
                                                    <Box
                                                        key={food.id}
                                                        sx={{
                                                            'display': 'flex',
                                                            'alignItems':
                                                                'center',
                                                            'gap': 1,
                                                            'padding':
                                                                '8px 12px',
                                                            ...cardSx,
                                                            'cursor': 'pointer',
                                                            'backgroundColor':
                                                                isSelected
                                                                    ? '#f1f8e9'
                                                                    : colors.primaryWhite,
                                                            'borderColor':
                                                                isSelected
                                                                    ? '#4caf50'
                                                                    : colors.primaryBlack,
                                                            'boxShadow': `2px 2px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                            'transition':
                                                                'all 0.15s',
                                                            '&:active': {
                                                                boxShadow: `1px 1px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                                transform:
                                                                    'translate(1px, 1px)',
                                                            },
                                                        }}>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onClick={() =>
                                                                toggleFood(
                                                                    food.id
                                                                )
                                                            }
                                                            size="small"
                                                            sx={{
                                                                'padding': 0,
                                                                'color':
                                                                    colors.primaryBlack,
                                                                '&.Mui-checked':
                                                                    {
                                                                        color: '#4caf50',
                                                                    },
                                                            }}
                                                            tabIndex={-1}
                                                        />
                                                        <Box
                                                            sx={{ flex: 1 }}
                                                            onClick={() =>
                                                                toggleFood(
                                                                    food.id
                                                                )
                                                            }>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 14,
                                                                    fontWeight: 600,
                                                                }}>
                                                                {food.name}
                                                            </Typography>
                                                        </Box>
                                                        {/* Quantity controls */}
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: 0.5,
                                                                flexShrink: 0,
                                                                visibility:
                                                                    isSelected
                                                                        ? 'visible'
                                                                        : 'hidden',
                                                            }}>
                                                            <Box
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation()
                                                                    setFoodQty(
                                                                        food.id,
                                                                        qty - 1
                                                                    )
                                                                }}
                                                                sx={{
                                                                    'width': 24,
                                                                    'height': 24,
                                                                    'borderRadius':
                                                                        '50%',
                                                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                                                    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                                    'display':
                                                                        'flex',
                                                                    'alignItems':
                                                                        'center',
                                                                    'justifyContent':
                                                                        'center',
                                                                    'cursor':
                                                                        'pointer',
                                                                    'backgroundColor':
                                                                        colors.primaryWhite,
                                                                    '&:active':
                                                                        {
                                                                            boxShadow:
                                                                                'none',
                                                                            transform:
                                                                                'translate(1px, 1px)',
                                                                        },
                                                                }}>
                                                                <IconMinus
                                                                    size={12}
                                                                    stroke={2.5}
                                                                />
                                                            </Box>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 14,
                                                                    fontWeight: 700,
                                                                    minWidth: 20,
                                                                    textAlign:
                                                                        'center',
                                                                }}>
                                                                {qty || 1}
                                                            </Typography>
                                                            <Box
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation()
                                                                    setFoodQty(
                                                                        food.id,
                                                                        qty + 1
                                                                    )
                                                                }}
                                                                sx={{
                                                                    'width': 24,
                                                                    'height': 24,
                                                                    'borderRadius':
                                                                        '50%',
                                                                    'border': `1.5px solid ${colors.primaryBlack}`,
                                                                    'boxShadow': `1px 1px 0px ${colors.primaryBlack}`,
                                                                    'display':
                                                                        'flex',
                                                                    'alignItems':
                                                                        'center',
                                                                    'justifyContent':
                                                                        'center',
                                                                    'cursor':
                                                                        'pointer',
                                                                    'backgroundColor':
                                                                        colors.primaryWhite,
                                                                    '&:active':
                                                                        {
                                                                            boxShadow:
                                                                                'none',
                                                                            transform:
                                                                                'translate(1px, 1px)',
                                                                        },
                                                                }}>
                                                                <IconPlus
                                                                    size={12}
                                                                    stroke={2.5}
                                                                />
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
                                    sx={{
                                        fontSize: 13,
                                        color: colors.primaryRed,
                                    }}>
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
                                disabled={
                                    !name.trim() ||
                                    quantities.size === 0 ||
                                    saving
                                }
                                size="large"
                                sx={primaryButtonSx}>
                                {saving
                                    ? 'Saving...'
                                    : editingPreset
                                      ? 'Save'
                                      : 'Create'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={onClose}
                                size="large"
                                sx={secondaryButtonSx}>
                                Close
                            </Button>
                            <Button
                                onClick={() => openForm(null)}
                                size="large"
                                sx={{
                                    ...primaryButtonSx,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}>
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
