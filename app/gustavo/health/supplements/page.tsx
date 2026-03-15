'use client'

import { cardSx, colors } from '@/lib/colors'
import type { Supplement, SupplementLog } from '@/lib/health-types'
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
import { IconDots, IconPencil, IconTrash } from '@tabler/icons-react'
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
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerInitialDate, setDrawerInitialDate] = useState<string | null>(null)
    const [menuOpenDate, setMenuOpenDate] = useState<string | null>(null)

    const fetchData = useCallback(() => {
        Promise.all([
            fetch('/api/health/supplements?all=true').then((r) => r.json()),
            fetch('/api/health/supplement-logs').then((r) => r.json()),
        ])
            .then(([supps, logs]) => {
                setSupplements(supps)
                setAllLogs(logs)
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
                                                label={log.supplementName}
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
    const [togglingId, setTogglingId] = useState<number | null>(null)

    // Manage mode state
    const [editingSupp, setEditingSupp] = useState<Supplement | null>(null)
    const [name, setName] = useState('')
    const [dosage, setDosage] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [saving, setSaving] = useState(false)

    const activeSupplements = supplements.filter((s) => s.isActive)

    // Logs for selected date
    const dateLogs = allLogs.filter((l) => l.date === date)

    // Reset when opened
    useEffect(() => {
        if (open) {
            setMode('log')
            setDate(initialDate || getLocalDate())
            setEditingSupp(null)
            setName('')
            setDosage('')
            setIsActive(true)
        }
    }, [open, initialDate])

    const toggleLog = useCallback(
        async (supplement: Supplement) => {
            setTogglingId(supplement.id)
            const existingLog = dateLogs.find(
                (l) => Number(l.supplementId) === Number(supplement.id)
            )

            try {
                if (existingLog) {
                    await fetch(`/api/health/supplement-logs/${existingLog.id}`, {
                        method: 'DELETE',
                    })
                } else {
                    await fetch('/api/health/supplement-logs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date, supplementId: supplement.id }),
                    })
                }
                onDataChanged()
            } catch (err) {
                console.error('Failed to toggle supplement log:', err)
            } finally {
                setTogglingId(null)
            }
        },
        [date, dateLogs, onDataChanged]
    )

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
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 1.5,
                        }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Supplements</Typography>
                        <Button onClick={onClose} size="small" sx={secondaryButtonSx}>
                            Cancel
                        </Button>
                    </Box>

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
                                    onChange={(e) => setDate(e.target.value)}
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
                                        const isLogged = dateLogs.some(
                                            (l) =>
                                                Number(l.supplementId) === Number(supp.id)
                                        )
                                        const isToggling = togglingId === supp.id
                                        return (
                                            <Box
                                                key={supp.id}
                                                onClick={() =>
                                                    !isToggling && toggleLog(supp)
                                                }
                                                sx={{
                                                    'display': 'flex',
                                                    'alignItems': 'center',
                                                    'gap': 1,
                                                    'padding': '8px 12px',
                                                    ...cardSx,
                                                    'cursor': 'pointer',
                                                    'backgroundColor': isLogged
                                                        ? '#f1f8e9'
                                                        : colors.primaryWhite,
                                                    'borderColor': isLogged
                                                        ? '#4caf50'
                                                        : colors.primaryBlack,
                                                    'boxShadow': `2px 2px 0px ${isLogged ? '#4caf50' : colors.primaryBlack}`,
                                                    'transition':
                                                        'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
                                                    '&:active': {
                                                        boxShadow: `1px 1px 0px ${isLogged ? '#4caf50' : colors.primaryBlack}`,
                                                        transform:
                                                            'translate(1px, 1px)',
                                                    },
                                                }}>
                                                <Checkbox
                                                    checked={isLogged}
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
                                                            textDecoration:
                                                                isLogged
                                                                    ? 'line-through'
                                                                    : 'none',
                                                            opacity: isLogged
                                                                ? 0.7
                                                                : 1,
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
                                                {isToggling && (
                                                    <CircularProgress
                                                        size={16}
                                                        sx={{
                                                            color: colors.primaryYellow,
                                                        }}
                                                    />
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
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        onClick={handleSaveSupplement}
                                        disabled={!name.trim() || saving}
                                        size="small"
                                        sx={{
                                            ...primaryButtonSx,
                                            'flex': 1,
                                            '&.Mui-disabled': {
                                                backgroundColor: `${colors.primaryYellow}60`,
                                                color: `${colors.primaryBlack}60`,
                                                border: `1px solid ${colors.primaryBlack}40`,
                                                boxShadow: `2px 2px 0px ${colors.primaryBlack}40`,
                                            },
                                        }}>
                                        {saving
                                            ? 'Saving...'
                                            : editingSupp
                                              ? 'Save'
                                              : 'Add'}
                                    </Button>
                                    {editingSupp && (
                                        <Button
                                            onClick={() => startAdd()}
                                            size="small"
                                            sx={secondaryButtonSx}>
                                            Cancel
                                        </Button>
                                    )}
                                </Box>
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
            </Box>
        </FormDrawer>
    )
}
