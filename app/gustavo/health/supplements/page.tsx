'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Supplement, SupplementLog, SupplementPreset } from '@/lib/health-types'
import {
    fieldSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material'
import { IconBolt, IconDots, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import FormDrawer from 'components/form-drawer'
import { useRegisterFab } from 'providers/fab-provider'

function getLocalDate(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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

export default function SupplementsPage() {
    const [supplements, setSupplements] = useState<Supplement[]>([])
    const [allLogs, setAllLogs] = useState<SupplementLog[]>([])
    const [presets, setPresets] = useState<SupplementPreset[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerInitialDate, setDrawerInitialDate] = useState<string | null>(null)
    const [menuOpenDate, setMenuOpenDate] = useState<string | null>(null)
    const [applyingPreset, setApplyingPreset] = useState<number | null>(null)
    const [presetDrawerOpen, setPresetDrawerOpen] = useState(false)
    const [editingPreset, setEditingPreset] = useState<SupplementPreset | null>(null)

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
        setMenuOpenDate(null)
        setDrawerOpen(true)
    }, [])

    const handleDeleteDate = useCallback(
        async (date: string) => {
            const logsForDate = allLogs.filter((l) => l.date === date)
            try {
                await Promise.all(
                    logsForDate.map((l) =>
                        fetch(`/api/health/supplement-logs/${l.id}`, { method: 'DELETE' })
                    )
                )
                setMenuOpenDate(null)
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
                const res = await fetch(`/api/health/presets/${presetId}/apply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: getLocalDate() }),
                })
                if (res.ok) fetchData()
            } catch (err) {
                console.error('Failed to apply preset:', err)
            } finally {
                setApplyingPreset(null)
            }
        },
        [fetchData]
    )

    useRegisterFab(openAdd)

    const activeSupplements = supplements.filter((s) => s.isActive)
    const dayGroups = groupLogsByDate(allLogs)

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} sx={{ color: colors.primaryYellow }} />
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
                paddingY: 2,
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {presets.map((preset) => (
                    <Box
                        key={preset.id}
                        onClick={() => applyingPreset === null && applyPreset(preset.id)}
                        sx={{
                            'display': 'flex',
                            'alignItems': 'center',
                            'gap': 0.75,
                            'px': 1.5,
                            'py': 0.75,
                            'backgroundColor': applyingPreset === preset.id ? colors.primaryYellow : colors.primaryWhite,
                            'border': `1.5px solid ${colors.primaryBlack}`,
                            'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                            'borderRadius': '4px',
                            'cursor': applyingPreset !== null ? 'default' : 'pointer',
                            'opacity': applyingPreset !== null && applyingPreset !== preset.id ? 0.5 : 1,
                            'transition': 'all 0.15s',
                            '&:active': applyingPreset === null ? {
                                boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                                transform: 'translate(1px, 1px)',
                            } : {},
                        }}>
                        <IconBolt size={14} stroke={2} color={colors.primaryBrown} />
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            {preset.name}
                        </Typography>
                    </Box>
                ))}
                <Box
                    onClick={() => { setEditingPreset(null); setPresetDrawerOpen(true) }}
                    sx={{
                        'display': 'flex',
                        'alignItems': 'center',
                        'justifyContent': 'center',
                        'width': 32,
                        'height': 32,
                        'borderRadius': '50%',
                        'border': `1.5px solid ${colors.primaryBlack}`,
                        'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                        'backgroundColor': colors.primaryWhite,
                        'cursor': 'pointer',
                        '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                    }}>
                    <IconPlus size={16} stroke={2} color={colors.primaryBrown} />
                </Box>
            </Box>

            {/* Horizontal supplement chips */}
            {activeSupplements.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        gap: 0.75,
                        overflowX: 'auto',
                        pb: 0.5,
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                    }}>
                    {activeSupplements.map((supp) => (
                        <Chip
                            key={supp.id}
                            label={supp.dosage ? `${supp.name} · ${supp.dosage}` : supp.name}
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
                <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', py: 4 }}>
                    No supplements logged yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {dayGroups.map((group) => (
                        <Box
                            key={group.date}
                            sx={{
                                padding: '12px 14px',
                                ...cardSx,
                            }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.75 }}>
                                        {formatDate(group.date)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {group.logs.map((log) => (
                                            <Chip
                                                key={log.id}
                                                label={log.quantity > 1 ? `${log.supplementName} ×${log.quantity}` : log.supplementName}
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

                                {/* Actions menu */}
                                <Box sx={{ position: 'relative' }}>
                                    <Box
                                        onClick={() =>
                                            setMenuOpenDate(menuOpenDate === group.date ? null : group.date)
                                        }
                                        sx={{
                                            'cursor': 'pointer',
                                            'p': 0.5,
                                            'borderRadius': '4px',
                                            '&:active': { backgroundColor: `${colors.primaryYellow}40` },
                                        }}>
                                        <IconDots size={18} stroke={2} color={colors.primaryBrown} />
                                    </Box>
                                    {menuOpenDate === group.date && (
                                        <>
                                            <Box
                                                onClick={() => setMenuOpenDate(null)}
                                                sx={{ position: 'fixed', inset: 0, zIndex: 10 }}
                                            />
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    right: 0,
                                                    zIndex: 11,
                                                    ...cardSx,
                                                    backgroundColor: colors.primaryWhite,
                                                    minWidth: 140,
                                                    py: 0.5,
                                                }}>
                                                <Box
                                                    onClick={() => openEditDate(group.date)}
                                                    sx={{
                                                        'display': 'flex',
                                                        'alignItems': 'center',
                                                        'gap': 1,
                                                        'px': 1.5,
                                                        'py': 0.75,
                                                        'fontSize': 13,
                                                        'cursor': 'pointer',
                                                        '&:hover': { backgroundColor: `${colors.primaryYellow}30` },
                                                    }}>
                                                    <IconPencil size={14} /> Edit
                                                </Box>
                                                <Box
                                                    onClick={() => handleDeleteDate(group.date)}
                                                    sx={{
                                                        'display': 'flex',
                                                        'alignItems': 'center',
                                                        'gap': 1,
                                                        'px': 1.5,
                                                        'py': 0.75,
                                                        'fontSize': 13,
                                                        'cursor': 'pointer',
                                                        'color': colors.primaryRed,
                                                        '&:hover': { backgroundColor: `${colors.primaryRed}15` },
                                                    }}>
                                                    <IconTrash size={14} /> Delete
                                                </Box>
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </Box>
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
                onClose={() => { setPresetDrawerOpen(false); setEditingPreset(null) }}
                supplements={supplements}
                editingPreset={editingPreset}
                existingPresets={presets}
                onSaved={() => { fetchData(); setPresetDrawerOpen(false); setEditingPreset(null) }}
                onEdit={(p) => { setEditingPreset(p); setPresetDrawerOpen(true) }}
                onDelete={async (id) => {
                    await fetch(`/api/health/presets/${id}`, { method: 'DELETE' })
                    fetchData()
                }}
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
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
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
            // Pre-fill selected supplements from existing logs for this date
            const logsForDate = allLogs.filter((l) => l.date === d)
            setSelectedIds(new Set(logsForDate.map((l) => Number(l.supplementId))))
        }
    }, [open, initialDate, allLogs])

    // Change date but keep current selections
    const handleDateChange = useCallback(
        (newDate: string) => {
            setDate(newDate)
        },
        []
    )

    const toggleSupplementSelection = useCallback((suppId: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(suppId)) {
                next.delete(suppId)
            } else {
                next.add(suppId)
            }
            return next
        })
    }, [])

    const handleLogSubmit = useCallback(async () => {
        setSaving(true)
        try {
            // Determine what changed vs what's already logged
            const alreadyLogged = new Set(dateLogs.map((l) => Number(l.supplementId)))
            const toAdd = Array.from(selectedIds).filter((id) => !alreadyLogged.has(id))
            const toRemove = dateLogs.filter((l) => !selectedIds.has(Number(l.supplementId)))

            await Promise.all([
                ...toAdd.map((suppId) =>
                    fetch('/api/health/supplement-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date, supplementId: suppId }),
                    })
                ),
                ...toRemove.map((log) =>
                    fetch(`/api/health/supplement-logs/${log.id}`, { method: 'DELETE' })
                ),
            ])
            onDataChanged()
            onClose()
        } catch (err) {
            console.error('Failed to save supplement log:', err)
        } finally {
            setSaving(false)
        }
    }, [date, selectedIds, dateLogs, onDataChanged, onClose])

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
                backgroundColor: active ? colors.primaryYellow : `${colors.primaryYellow}30`,
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
                    <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1.5 }}>Supplements</Typography>

                    {/* Mode toggle */}
                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <Button onClick={() => setMode('log')} sx={toggleSx(mode === 'log')}>
                            Log
                        </Button>
                        <Button onClick={() => setMode('manage')} sx={toggleSx(mode === 'manage')}>
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
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    size="small"
                                    sx={{ ...fieldSx, maxWidth: 180 }}
                                />
                            </Box>

                            {/* Supplement checklist */}
                            {activeSupplements.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <Typography
                                        sx={{ fontSize: 14, color: colors.primaryBrown, mb: 1 }}>
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
                                        const isSelected = selectedIds.has(supp.id)
                                        return (
                                            <Box
                                                key={supp.id}
                                                onClick={() => toggleSupplementSelection(supp.id)}
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
                                                    'transition':
                                                        'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
                                                    '&:active': {
                                                        boxShadow: `1px 1px 0px ${isSelected ? '#4caf50' : colors.primaryBlack}`,
                                                        transform:
                                                            'translate(1px, 1px)',
                                                    },
                                                }}>
                                                <Checkbox
                                                    checked={isSelected}
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
                                                <Box sx={{ flex: 1 }}>
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
                                    {editingSupp ? 'Edit Supplement' : 'New Supplement'}
                                </Typography>
                                <Box>
                                    <Typography sx={labelSx}>Name</Typography>
                                    <TextField
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        size="small"
                                        fullWidth
                                        placeholder="Creatine, Vitamin D..."
                                        sx={fieldSx}
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={labelSx}>
                                        Dosage (optional)
                                    </Typography>
                                    <TextField
                                        value={dosage}
                                        onChange={(e) => setDosage(e.target.value)}
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
                                                opacity: supp.isActive ? 1 : 0.5,
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
                        justifyContent: 'flex-end',
                        gap: 2,
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
                            disabled={selectedIds.size === 0 || saving}
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
    editingPreset: SupplementPreset | null
    existingPresets: SupplementPreset[]
    onSaved: () => void
    onEdit: (preset: SupplementPreset) => void
    onDelete: (id: number) => Promise<void>
}

function SupplementPresetDrawer({
    open,
    onClose,
    supplements,
    editingPreset,
    existingPresets,
    onSaved,
    onEdit,
    onDelete,
}: SupplementPresetDrawerProps) {
    const [name, setName] = useState('')
    const [selectedSupIds, setSelectedSupIds] = useState<Set<number>>(new Set())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const activeSupplements = supplements.filter((s) => s.isActive)

    useEffect(() => {
        if (open) {
            if (editingPreset) {
                setName(editingPreset.name)
                setSelectedSupIds(new Set(editingPreset.supplements.map((s) => s.id)))
            } else {
                setName('')
                setSelectedSupIds(new Set())
            }
            setError('')
        }
    }, [open, editingPreset])

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
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to save')
            }
        } catch {
            setError('Failed to save')
        } finally {
            setSaving(false)
        }
    }, [name, selectedSupIds, editingPreset, onSaved])

    return (
        <FormDrawer open={open} onClose={onClose}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${colors.primaryBlack}20` }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                        {editingPreset ? 'Edit Group' : 'Supplement Groups'}
                    </Typography>
                </Box>

                {/* Body */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Existing presets list */}
                    {!editingPreset && existingPresets.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {existingPresets.map((p) => (
                                <Box key={p.id} sx={{ ...cardSx, p: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
                                                {p.name}
                                            </Typography>
                                            <Typography sx={{ fontSize: 12, color: colors.primaryBrown }}>
                                                {p.supplements.map((s) => s.name).join(', ')}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                            <Box
                                                onClick={() => onEdit(p)}
                                                sx={{
                                                    'cursor': 'pointer',
                                                    'p': 0.5,
                                                    'borderRadius': '4px',
                                                    '&:active': { backgroundColor: `${colors.primaryYellow}40` },
                                                }}>
                                                <IconPencil size={16} stroke={2} color={colors.primaryBrown} />
                                            </Box>
                                            <Box
                                                onClick={() => onDelete(p.id)}
                                                sx={{
                                                    'cursor': 'pointer',
                                                    'p': 0.5,
                                                    'borderRadius': '4px',
                                                    '&:active': { backgroundColor: `${colors.primaryRed}20` },
                                                }}>
                                                <IconTrash size={16} stroke={2} color={colors.primaryRed} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {!editingPreset && existingPresets.length > 0 && (
                        <Box sx={{ borderBottom: `1px solid ${colors.primaryBlack}15`, my: 0.5 }} />
                    )}

                    {/* Form */}
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.primaryBrown, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {editingPreset ? 'Edit' : 'New Group'}
                    </Typography>

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
                            <Typography sx={{ fontSize: 13, color: colors.primaryBrown }}>
                                No active supplements. Add some first.
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
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
                                                'backgroundColor': isSelected ? '#f1f8e9' : colors.primaryWhite,
                                                'borderColor': isSelected ? '#4caf50' : colors.primaryBlack,
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
                                                    <Typography sx={{ fontSize: 12, color: colors.primaryBrown }}>
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
                </Box>

                {/* Footer */}
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
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
                        disabled={!name.trim() || selectedSupIds.size === 0 || saving}
                        size="large"
                        sx={primaryButtonSx}>
                        {saving ? 'Saving...' : editingPreset ? 'Save' : 'Create'}
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
    )
}
