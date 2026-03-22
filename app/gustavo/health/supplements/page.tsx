'use client'

import { cardSx, colors } from '@/lib/colors'
import {
    fieldSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import type {
    Supplement,
    SupplementLog,
    SupplementPreset,
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
import { IconArrowLeft, IconBolt, IconMinus, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
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

// Group logs by date
type DayGroup = {
    date: string
    logs: SupplementLog[]
}

function groupLogsByDate(logs: SupplementLog[]): DayGroup[] {
    const map = new Map<string, SupplementLog[]>()
    for (const log of logs) {
        const existing = map.get(log.date) || []
        existing.push(log)
        map.set(log.date, existing)
    }
    return Array.from(map.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, dateLogs]) => ({ date, logs: dateLogs }))
}

// ── Swipeable Log Card ──────────────────────────────────────────────────────

const DELETE_WIDTH = 64

function SupplementLogCard({
    group,
    onEdit,
    onDelete,
}: {
    group: DayGroup
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
                    {formatDate(group.date)}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {group.logs.map((log) => (
                        <Chip
                            key={log.id}
                            label={
                                log.quantity > 1
                                    ? `${log.supplementName} ×${log.quantity}`
                                    : log.supplementName
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
                </Box>
            </Box>
        </Box>
    )
}

export default function SupplementsPage() {
    const [supplements, setSupplements] = useState<Supplement[]>([])
    const [allLogs, setAllLogs] = useState<SupplementLog[]>([])
    const [presets, setPresets] = useState<SupplementPreset[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerInitialDate, setDrawerInitialDate] = useState<string | null>(
        null
    )
    const [applyingPreset, setApplyingPreset] = useState<number | null>(null)
    const [presetDrawerOpen, setPresetDrawerOpen] = useState(false)

    const fetchData = useCallback(() => {
        Promise.all([
            fetch('/api/health/supplements?all=true').then((r) => r.json()),
            fetch('/api/health/supplement-logs').then((r) => r.json()),
            fetch('/api/health/presets?type=supplement').then((r) => r.json()),
        ])
            .then(([supps, logs, p]) => {
                setSupplements(supps)
                setAllLogs(logs)
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
            const logsForDate = allLogs.filter((l) => l.date === date)
            try {
                await Promise.all(
                    logsForDate.map((l) =>
                        fetch(`/api/health/supplement-logs/${l.id}`, {
                            method: 'DELETE',
                        })
                    )
                )
                fetchData()
            } catch (err) {
                console.error('Failed to delete logs:', err)
            }
        },
        [allLogs, fetchData]
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

    const activeSupplements = supplements.filter((s) => s.isActive)
    const dayGroups = groupLogsByDate(allLogs)

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
                Supplements
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

            {/* Horizontal supplement chips */}
            {activeSupplements.length > 0 && (
                <Box
                    sx={{
                        'display': 'flex',
                        'gap': 0.75,
                        'overflowX': 'auto',
                        'pb': 0.5,
                        '&::-webkit-scrollbar': { display: 'none' },
                        'scrollbarWidth': 'none',
                    }}>
                    {activeSupplements.map((supp) => (
                        <Chip
                            key={supp.id}
                            label={
                                supp.dosage
                                    ? `${supp.name} · ${supp.dosage}`
                                    : supp.name
                            }
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
            {dayGroups.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: colors.primaryBrown,
                        textAlign: 'center',
                        py: 4,
                    }}>
                    No supplements logged yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {dayGroups.map((group) => (
                        <SupplementLogCard
                            key={group.date}
                            group={group}
                            onEdit={() => openEditDate(group.date)}
                            onDelete={() => handleDeleteDate(group.date)}
                        />
                    ))}
                </Box>
            )}

            {/* Unified drawer — Log mode / Manage mode */}
            <SupplementDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false)
                    setDrawerInitialDate(null)
                }}
                supplements={supplements}
                allLogs={allLogs}
                initialDate={drawerInitialDate}
                onDataChanged={fetchData}
            />

            {/* Supplement preset drawer */}
            <SupplementPresetDrawer
                open={presetDrawerOpen}
                onClose={() => setPresetDrawerOpen(false)}
                supplements={supplements}
                existingPresets={presets}
                onSaved={fetchData}
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

// ── Unified Supplement Drawer ───────────────────────────────────────────────

type DrawerMode = 'log' | 'manage'

type SupplementDrawerProps = {
    open: boolean
    onClose: () => void
    supplements: Supplement[]
    allLogs: SupplementLog[]
    initialDate: string | null
    onDataChanged: () => void
}

function SupplementDrawer({
    open,
    onClose,
    supplements,
    allLogs,
    initialDate,
    onDataChanged,
}: SupplementDrawerProps) {
    const [mode, setMode] = useState<DrawerMode>('log')
    const [date, setDate] = useState(getLocalDate)
    const [quantities, setQuantities] = useState<Map<number, number>>(new Map())
    const [saving, setSaving] = useState(false)

    // Manage mode state
    const [editingSupp, setEditingSupp] = useState<Supplement | null>(null)
    const [name, setName] = useState('')
    const [dosage, setDosage] = useState('')
    const [isActive, setIsActive] = useState(true)

    const activeSupplements = supplements.filter((s) => s.isActive)

    // Logs for selected date (from DB)
    const dateLogs = allLogs.filter((l) => l.date === date)

    // Reset when opened
    useEffect(() => {
        if (open) {
            const d = initialDate || getLocalDate()
            setMode('log')
            setDate(d)
            setEditingSupp(null)
            setName('')
            setDosage('')
            setIsActive(true)
            // Pre-fill quantities from existing logs for this date
            const logsForDate = allLogs.filter((l) => l.date === d)
            const qMap = new Map<number, number>()
            for (const l of logsForDate) {
                qMap.set(Number(l.supplementId), l.quantity)
            }
            setQuantities(qMap)
        }
    }, [open, initialDate, allLogs])

    // Change date and re-sync selections from existing logs
    const handleDateChange = useCallback((newDate: string) => {
        setDate(newDate)
        const logsForDate = allLogs.filter((l) => l.date === newDate)
        const qMap = new Map<number, number>()
        for (const l of logsForDate) {
            qMap.set(Number(l.supplementId), l.quantity)
        }
        setQuantities(qMap)
    }, [allLogs])

    const toggleSupplementSelection = useCallback((suppId: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (next.has(suppId)) {
                next.delete(suppId)
            } else {
                next.set(suppId, 1)
            }
            return next
        })
    }, [])

    const setSupplementQuantity = useCallback((suppId: number, qty: number) => {
        setQuantities((prev) => {
            const next = new Map(prev)
            if (qty <= 0) {
                next.delete(suppId)
            } else {
                next.set(suppId, qty)
            }
            return next
        })
    }, [])

    const handleLogSubmit = useCallback(async () => {
        setSaving(true)
        try {
            const logMap = new Map<number, SupplementLog>()
            for (const l of dateLogs) logMap.set(Number(l.supplementId), l)

            const ops: Promise<Response>[] = []
            // Add new or update quantity for selected supplements
            for (const [suppId, qty] of Array.from(quantities.entries())) {
                const existing = logMap.get(suppId)
                if (existing) {
                    // Update quantity if changed
                    if (existing.quantity !== qty) {
                        ops.push(fetch(`/api/health/supplement-logs/${existing.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ quantity: qty }),
                        }))
                    }
                } else {
                    // New log — POST creates with quantity=1, then PUT if qty > 1
                    ops.push(
                        fetch('/api/health/supplement-logs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ date, supplementId: suppId }),
                        }).then(async (res) => {
                            if (res.ok && qty > 1) {
                                const created = await res.json()
                                return fetch(`/api/health/supplement-logs/${created.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ quantity: qty }),
                                })
                            }
                            return res
                        })
                    )
                }
            }
            // Remove deselected supplements
            for (const [suppId, log] of Array.from(logMap.entries())) {
                if (!quantities.has(suppId)) {
                    ops.push(fetch(`/api/health/supplement-logs/${log.id}`, { method: 'DELETE' }))
                }
            }

            await Promise.all(ops)
            onDataChanged()
            onClose()
        } catch (err) {
            console.error('Failed to save supplement log:', err)
        } finally {
            setSaving(false)
        }
    }, [date, quantities, dateLogs, onDataChanged, onClose])

    const startEdit = useCallback((supp: Supplement) => {
        setEditingSupp(supp)
        setName(supp.name)
        setDosage(supp.dosage || '')
        setIsActive(supp.isActive)
    }, [])

    const startAdd = useCallback(() => {
        setEditingSupp(null)
        setName('')
        setDosage('')
        setIsActive(true)
    }, [])

    const handleSaveSupplement = useCallback(async () => {
        if (!name.trim()) return
        setSaving(true)
        try {
            const url = editingSupp
                ? `/api/health/supplements/${editingSupp.id}`
                : '/api/health/supplements'
            const method = editingSupp ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    dosage: dosage.trim() || null,
                    ...(editingSupp ? { isActive } : {}),
                }),
            })

            if (res.ok) {
                setEditingSupp(null)
                setName('')
                setDosage('')
                setIsActive(true)
                onDataChanged()
            }
        } finally {
            setSaving(false)
        }
    }, [name, dosage, isActive, editingSupp, onDataChanged])

    const handleDeleteSupplement = useCallback(
        async (id: number) => {
            const res = await fetch(`/api/health/supplements/${id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setEditingSupp(null)
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
                        Supplements
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

                            {/* Supplement checklist */}
                            {activeSupplements.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            color: colors.primaryBrown,
                                            mb: 1,
                                        }}>
                                        No supplements added yet.
                                    </Typography>
                                    <Button
                                        onClick={() => setMode('manage')}
                                        size="small"
                                        sx={primaryButtonSx}>
                                        Add Supplements
                                    </Button>
                                </Box>
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.75,
                                    }}>
                                    {activeSupplements.map((supp) => {
                                        const qty = quantities.get(supp.id) ?? 0
                                        const isSelected = qty > 0
                                        return (
                                            <Box
                                                key={supp.id}
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
                                                    onClick={() => toggleSupplementSelection(supp.id)}
                                                    size="small"
                                                    sx={{
                                                        'padding': 0,
                                                        'color': colors.primaryBlack,
                                                        '&.Mui-checked': { color: '#4caf50' },
                                                    }}
                                                />
                                                {/* Name + dosage */}
                                                <Box
                                                    sx={{ flex: 1, cursor: 'pointer' }}
                                                    onClick={() => toggleSupplementSelection(supp.id)}>
                                                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                                        {supp.name}
                                                    </Typography>
                                                    {supp.dosage && (
                                                        <Typography sx={{ fontSize: 12, color: colors.primaryBrown }}>
                                                            {supp.dosage}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                {/* Quantity controls — only when selected */}
                                                {isSelected && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                        <Box
                                                            onClick={() => setSupplementQuantity(supp.id, qty - 1)}
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
                                                            onClick={() => setSupplementQuantity(supp.id, qty + 1)}
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
                                    {editingSupp
                                        ? 'Edit Supplement'
                                        : 'New Supplement'}
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
                                        placeholder="Creatine, Vitamin D..."
                                        sx={fieldSx}
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={labelSx}>Dosage</Typography>
                                    <TextField
                                        value={dosage}
                                        onChange={(e) =>
                                            setDosage(e.target.value)
                                        }
                                        size="small"
                                        fullWidth
                                        placeholder="5g, 400mg, 2 capsules..."
                                        sx={fieldSx}
                                    />
                                </Box>
                                {editingSupp && (
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
                                {editingSupp && (
                                    <Button
                                        onClick={() => startAdd()}
                                        size="small"
                                        sx={secondaryButtonSx}>
                                        Cancel Edit
                                    </Button>
                                )}
                            </Box>

                            {/* Existing supplements list */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                }}>
                                {supplements.length === 0 ? (
                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            color: colors.primaryBrown,
                                            textAlign: 'center',
                                            py: 2,
                                        }}>
                                        No supplements yet. Add one above.
                                    </Typography>
                                ) : (
                                    supplements.map((supp) => (
                                        <Box
                                            key={supp.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                ...cardSx,
                                                opacity: supp.isActive
                                                    ? 1
                                                    : 0.5,
                                                backgroundColor:
                                                    editingSupp?.id === supp.id
                                                        ? colors.secondaryYellow
                                                        : colors.primaryWhite,
                                            }}>
                                            <Box>
                                                <Typography
                                                    sx={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                    }}>
                                                    {supp.name}
                                                </Typography>
                                                {supp.dosage && (
                                                    <Typography
                                                        sx={{
                                                            fontSize: 12,
                                                            color: colors.primaryBrown,
                                                        }}>
                                                        {supp.dosage}
                                                    </Typography>
                                                )}
                                                {!supp.isActive && (
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
                                                        startEdit(supp)
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
                                                        handleDeleteSupplement(
                                                            supp.id
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
                            onClick={handleSaveSupplement}
                            disabled={!name.trim() || saving}
                            size="large"
                            sx={primaryButtonSx}>
                            {saving
                                ? 'Saving...'
                                : editingSupp
                                  ? 'Save'
                                  : 'Add'}
                        </Button>
                    )}
                </Box>
            </Box>
        </FormDrawer>
    )
}

// ── Supplement Preset Drawer ────────────────────────────────────────────────

type SupplementPresetDrawerProps = {
    open: boolean
    onClose: () => void
    supplements: Supplement[]
    existingPresets: SupplementPreset[]
    onSaved: () => void
    onDelete: (id: number) => Promise<void>
    onReorder: (from: number, to: number) => void
}

type SupPresetView = 'list' | 'form'

function SupplementPresetDrawer({
    open,
    onClose,
    supplements,
    existingPresets,
    onSaved,
    onDelete,
    onReorder,
}: SupplementPresetDrawerProps) {
    const [view, setView] = useState<SupPresetView>('list')
    const [editingPreset, setEditingPreset] = useState<SupplementPreset | null>(null)
    const [name, setName] = useState('')
    const [selectedSupIds, setSelectedSupIds] = useState<Set<number>>(new Set())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const activeSupplements = supplements.filter((s) => s.isActive)

    const resetForm = useCallback(() => {
        setName('')
        setSelectedSupIds(new Set())
        setError('')
    }, [])

    const openForm = useCallback((preset: SupplementPreset | null) => {
        setEditingPreset(preset)
        if (preset) {
            setName(preset.name)
            setSelectedSupIds(new Set(preset.supplements.map((s) => s.id)))
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

    const toggleSupplement = useCallback((id: number) => {
        setSelectedSupIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!name.trim() || selectedSupIds.size === 0) return
        setSaving(true)
        setError('')

        const url = editingPreset
            ? `/api/health/presets/${editingPreset.id}`
            : '/api/health/presets'
        const method = editingPreset ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    type: 'supplement',
                    supplementIds: Array.from(selectedSupIds),
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
    }, [name, selectedSupIds, editingPreset, onSaved, goBack])

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
                            ? 'Supplement Groups'
                            : editingPreset
                              ? 'Edit Group'
                              : 'New Group'}
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
                                                        <Box
                                                            sx={{ flex: 1, cursor: 'pointer' }}
                                                            onClick={() => openForm(p)}>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 14,
                                                                    fontWeight: 600,
                                                                    mb: 0.5,
                                                                }}>
                                                                {p.name}
                                                            </Typography>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 12,
                                                                    color: colors.primaryBrown,
                                                                }}>
                                                                {p.supplements
                                                                    .map((s) => s.name)
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
                                                                onClick={() => openForm(p)}
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
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: colors.primaryBrown,
                                        textAlign: 'center',
                                        py: 2,
                                    }}>
                                    No groups yet. Create one to get started.
                                </Typography>
                            )}
                        </>
                    ) : (
                        <>
                            <Box>
                                <Typography sx={labelSx}>Name</Typography>
                                <TextField
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    size="small"
                                    fullWidth
                                    placeholder="Daily, Workout, Evening..."
                                    sx={fieldSx}
                                />
                            </Box>

                            {/* Supplement selection */}
                            <Box>
                                <Typography sx={labelSx}>Supplements</Typography>
                                {activeSupplements.length === 0 ? (
                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            color: colors.primaryBrown,
                                        }}>
                                        No active supplements. Add some first.
                                    </Typography>
                                ) : (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.75,
                                        }}>
                                        {activeSupplements.map((supp) => {
                                            const isSelected = selectedSupIds.has(supp.id)
                                            return (
                                                <Box
                                                    key={supp.id}
                                                    onClick={() => toggleSupplement(supp.id)}
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
                                                            transform: 'translate(1px, 1px)',
                                                        },
                                                    }}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        size="small"
                                                        sx={{
                                                            'padding': 0,
                                                            'color': colors.primaryBlack,
                                                            '&.Mui-checked': { color: '#4caf50' },
                                                        }}
                                                        tabIndex={-1}
                                                    />
                                                    <Box>
                                                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                                            {supp.name}
                                                        </Typography>
                                                        {supp.dosage && (
                                                            <Typography
                                                                sx={{ fontSize: 12, color: colors.primaryBrown }}>
                                                                {supp.dosage}
                                                            </Typography>
                                                        )}
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
                                disabled={!name.trim() || selectedSupIds.size === 0 || saving}
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
