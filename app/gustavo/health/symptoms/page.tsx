'use client'

import { cardSx, colors } from '@/lib/colors'
import {
    fieldSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import type { Symptom, SymptomLog } from '@/lib/health-types'
import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material'
import { IconPencil, IconSearch, IconTrash } from '@tabler/icons-react'
import FormDrawer from 'components/form-drawer'
import ForensicView from 'components/health/forensic-view'
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
    logs: SymptomLog[]
}

function groupLogsByDate(logs: SymptomLog[]): DayGroup[] {
    const map = new Map<string, SymptomLog[]>()
    for (const log of logs) {
        const existing = map.get(log.date) || []
        existing.push(log)
        map.set(log.date, existing)
    }
    return Array.from(map.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, dateLogs]) => ({ date, logs: dateLogs }))
}

// Orange accent colors for symptom chips
const ACCENT_BG = '#fff3e0'
const ACCENT_BORDER = '#ff9800'

// ── Swipeable Log Card ──────────────────────────────────────────────────────

const DELETE_WIDTH = 64

function SymptomLogCard({
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

    // Check if any log has notes
    const logsWithNotes = group.logs.filter((l) => l.notes)

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
                            label={log.symptomName}
                            size="small"
                            sx={{
                                'height': 24,
                                'fontSize': 12,
                                'fontWeight': 500,
                                'backgroundColor': ACCENT_BG,
                                'border': `1px solid ${ACCENT_BORDER}`,
                                'boxShadow': `1px 1px 0px ${ACCENT_BORDER}`,
                                'borderRadius': '3px',
                                'color': colors.primaryBlack,
                                '& .MuiChip-label': { px: 1 },
                            }}
                        />
                    ))}
                </Box>
                {/* Truncated notes preview */}
                {logsWithNotes.length > 0 && (
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: colors.primaryBrown,
                            mt: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                        }}>
                        {logsWithNotes.map((l) => `${l.symptomName}: ${l.notes}`).join(' · ')}
                    </Typography>
                )}
            </Box>
        </Box>
    )
}

export default function SymptomsPage() {
    const [symptoms, setSymptoms] = useState<Symptom[]>([])
    const [allLogs, setAllLogs] = useState<SymptomLog[]>([])
    const [loading, setLoading] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerInitialDate, setDrawerInitialDate] = useState<string | null>(
        null
    )
    const [forensicOpen, setForensicOpen] = useState(false)
    const [forensicLogId, setForensicLogId] = useState<number | null>(null)

    const fetchData = useCallback(() => {
        Promise.all([
            fetch('/api/health/symptoms?all=true').then((r) => r.json()),
            fetch('/api/health/symptom-logs').then((r) => r.json()),
        ])
            .then(([syms, logs]) => {
                setSymptoms(syms)
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
        setDrawerOpen(true)
    }, [])

    const handleDeleteDate = useCallback(
        async (date: string) => {
            const logsForDate = allLogs.filter((l) => l.date === date)
            try {
                await Promise.all(
                    logsForDate.map((l) =>
                        fetch(`/api/health/symptom-logs/${l.id}`, {
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

    useRegisterFab(openAdd)

    const activeSymptoms = symptoms.filter((s) => s.isActive)
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
                Symptoms
            </Typography>

            {/* Active symptom chips — horizontal scroll */}
            {activeSymptoms.length > 0 && (
                <Box
                    sx={{
                        'display': 'flex',
                        'gap': 0.75,
                        'overflowX': 'auto',
                        'pb': 0.5,
                        '&::-webkit-scrollbar': { display: 'none' },
                        'scrollbarWidth': 'none',
                    }}>
                    {activeSymptoms.map((sym) => (
                        <Chip
                            key={sym.id}
                            label={sym.name}
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
                    No symptoms logged yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {dayGroups.map((group) => (
                        <SymptomLogCard
                            key={group.date}
                            group={group}
                            onEdit={() => openEditDate(group.date)}
                            onDelete={() => handleDeleteDate(group.date)}
                        />
                    ))}
                </Box>
            )}

            {/* Unified drawer — Log mode / Manage mode */}
            <SymptomDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false)
                    setDrawerInitialDate(null)
                }}
                symptoms={symptoms}
                allLogs={allLogs}
                initialDate={drawerInitialDate}
                onDataChanged={fetchData}
                onOpenForensic={(logId) => {
                    setDrawerOpen(false)
                    setForensicLogId(logId)
                    setForensicOpen(true)
                }}
            />

            {/* Forensic view drawer */}
            <ForensicView
                open={forensicOpen}
                onClose={() => {
                    setForensicOpen(false)
                    setForensicLogId(null)
                }}
                symptomLogId={forensicLogId}
            />
        </Box>
    )
}

// ── Unified Symptom Drawer ────────────────────────────────────────────────

type DrawerMode = 'log' | 'manage'

type SymptomDrawerProps = {
    open: boolean
    onClose: () => void
    symptoms: Symptom[]
    allLogs: SymptomLog[]
    initialDate: string | null
    onDataChanged: () => void
    onOpenForensic: (logId: number) => void
}

function SymptomDrawer({
    open,
    onClose,
    symptoms,
    allLogs,
    initialDate,
    onDataChanged,
    onOpenForensic,
}: SymptomDrawerProps) {
    const [mode, setMode] = useState<DrawerMode>('log')
    const [date, setDate] = useState(getLocalDate)
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [notes, setNotes] = useState<Map<number, string>>(new Map())
    const [saving, setSaving] = useState(false)

    // Manage mode state
    const [editingSym, setEditingSym] = useState<Symptom | null>(null)
    const [name, setName] = useState('')
    const [isActive, setIsActive] = useState(true)

    const activeSymptoms = symptoms.filter((s) => s.isActive)

    // Logs for selected date (from DB)
    const dateLogs = allLogs.filter((l) => l.date === date)

    // Reset when opened
    useEffect(() => {
        if (open) {
            const d = initialDate || getLocalDate()
            setMode('log')
            setDate(d)
            setEditingSym(null)
            setName('')
            setIsActive(true)
            // Pre-fill from existing logs for this date
            const logsForDate = allLogs.filter((l) => l.date === d)
            const sel = new Set<number>()
            const notesMap = new Map<number, string>()
            for (const l of logsForDate) {
                sel.add(Number(l.symptomId))
                if (l.notes) notesMap.set(Number(l.symptomId), l.notes)
            }
            setSelected(sel)
            setNotes(notesMap)
        }
    }, [open, initialDate, allLogs])

    // Change date but keep current selections
    const handleDateChange = useCallback((newDate: string) => {
        setDate(newDate)
    }, [])

    const toggleSymptomSelection = useCallback((symId: number) => {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(symId)) {
                next.delete(symId)
            } else {
                next.add(symId)
            }
            return next
        })
    }, [])

    const setSymptomNotes = useCallback((symId: number, value: string) => {
        setNotes((prev) => {
            const next = new Map(prev)
            if (value) {
                next.set(symId, value)
            } else {
                next.delete(symId)
            }
            return next
        })
    }, [])

    const handleLogSubmit = useCallback(async () => {
        setSaving(true)
        try {
            const logMap = new Map<number, SymptomLog>()
            for (const l of dateLogs) logMap.set(Number(l.symptomId), l)

            const ops: Promise<Response>[] = []
            // Add new or update notes for selected symptoms
            for (const symId of Array.from(selected)) {
                const existing = logMap.get(symId)
                const noteVal = notes.get(symId) || null
                if (existing) {
                    // Update notes if changed
                    if ((existing.notes || null) !== noteVal) {
                        ops.push(fetch(`/api/health/symptom-logs/${existing.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notes: noteVal }),
                        }))
                    }
                } else {
                    // New log
                    ops.push(
                        fetch('/api/health/symptom-logs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ date, symptomId: symId, notes: noteVal }),
                        })
                    )
                }
            }
            // Remove deselected symptoms that had existing logs
            for (const [symId, log] of Array.from(logMap.entries())) {
                if (!selected.has(symId)) {
                    ops.push(fetch(`/api/health/symptom-logs/${log.id}`, { method: 'DELETE' }))
                }
            }

            await Promise.all(ops)
            onDataChanged()
            onClose()
        } catch (err) {
            console.error('Failed to save symptom log:', err)
        } finally {
            setSaving(false)
        }
    }, [date, selected, notes, dateLogs, onDataChanged, onClose])

    const startEdit = useCallback((sym: Symptom) => {
        setEditingSym(sym)
        setName(sym.name)
        setIsActive(sym.isActive)
    }, [])

    const startAdd = useCallback(() => {
        setEditingSym(null)
        setName('')
        setIsActive(true)
    }, [])

    const handleSaveSymptom = useCallback(async () => {
        if (!name.trim()) return
        setSaving(true)
        try {
            const url = editingSym
                ? `/api/health/symptoms/${editingSym.id}`
                : '/api/health/symptoms'
            const method = editingSym ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    ...(editingSym ? { isActive } : {}),
                }),
            })

            if (res.ok) {
                setEditingSym(null)
                setName('')
                setIsActive(true)
                onDataChanged()
            }
        } finally {
            setSaving(false)
        }
    }, [name, isActive, editingSym, onDataChanged])

    const handleDeleteSymptom = useCallback(
        async (id: number) => {
            const res = await fetch(`/api/health/symptoms/${id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setEditingSym(null)
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
                        Symptoms
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

                            {/* Symptom checklist */}
                            {activeSymptoms.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            color: colors.primaryBrown,
                                            mb: 1,
                                        }}>
                                        No symptoms added yet.
                                    </Typography>
                                    <Button
                                        onClick={() => setMode('manage')}
                                        size="small"
                                        sx={primaryButtonSx}>
                                        Add Symptoms
                                    </Button>
                                </Box>
                            ) : (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.75,
                                    }}>
                                    {activeSymptoms.map((sym) => {
                                        const isSelected = selected.has(sym.id)
                                        return (
                                            <Box key={sym.id}>
                                                <Box
                                                    sx={{
                                                        'display': 'flex',
                                                        'alignItems': 'center',
                                                        'gap': 1,
                                                        'padding': '8px 12px',
                                                        ...cardSx,
                                                        'backgroundColor':
                                                            isSelected
                                                                ? ACCENT_BG
                                                                : colors.primaryWhite,
                                                        'borderColor': isSelected
                                                            ? ACCENT_BORDER
                                                            : colors.primaryBlack,
                                                        'boxShadow': `2px 2px 0px ${isSelected ? ACCENT_BORDER : colors.primaryBlack}`,
                                                        'transition':
                                                            'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
                                                    }}>
                                                    {/* Checkbox toggles selection */}
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onClick={() => toggleSymptomSelection(sym.id)}
                                                        size="small"
                                                        sx={{
                                                            'padding': 0,
                                                            'color': colors.primaryBlack,
                                                            '&.Mui-checked': { color: ACCENT_BORDER },
                                                        }}
                                                    />
                                                    {/* Name */}
                                                    <Box
                                                        sx={{ flex: 1, cursor: 'pointer' }}
                                                        onClick={() => toggleSymptomSelection(sym.id)}>
                                                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                                            {sym.name}
                                                        </Typography>
                                                    </Box>
                                                    {/* Investigate button */}
                                                    {isSelected && (
                                                        <Box
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const existingLog = dateLogs.find((l) => Number(l.symptomId) === sym.id)
                                                                if (existingLog) {
                                                                    onOpenForensic(existingLog.id)
                                                                }
                                                            }}
                                                            sx={{
                                                                'flexShrink': 0,
                                                                'width': 28,
                                                                'height': 28,
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
                                                            <IconSearch size={14} stroke={2} />
                                                        </Box>
                                                    )}
                                                </Box>
                                                {/* Notes field — only when selected */}
                                                {isSelected && (
                                                    <Box sx={{ mt: 0.5, pl: 4.5 }}>
                                                        <TextField
                                                            value={notes.get(sym.id) || ''}
                                                            onChange={(e) =>
                                                                setSymptomNotes(sym.id, e.target.value)
                                                            }
                                                            size="small"
                                                            fullWidth
                                                            placeholder="Notes (optional)"
                                                            sx={{ ...fieldSx, '& .MuiOutlinedInput-input': { fontSize: 13, py: 0.75 } }}
                                                        />
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
                                    {editingSym
                                        ? 'Edit Symptom'
                                        : 'New Symptom'}
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
                                        placeholder="Headache, Fatigue, Bloating..."
                                        sx={fieldSx}
                                    />
                                </Box>
                                {editingSym && (
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
                                {editingSym && (
                                    <Button
                                        onClick={() => startAdd()}
                                        size="small"
                                        sx={secondaryButtonSx}>
                                        Cancel Edit
                                    </Button>
                                )}
                            </Box>

                            {/* Existing symptoms list */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.75,
                                }}>
                                {symptoms.length === 0 ? (
                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            color: colors.primaryBrown,
                                            textAlign: 'center',
                                            py: 2,
                                        }}>
                                        No symptoms yet. Add one above.
                                    </Typography>
                                ) : (
                                    symptoms.map((sym) => (
                                        <Box
                                            key={sym.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                ...cardSx,
                                                opacity: sym.isActive
                                                    ? 1
                                                    : 0.5,
                                                backgroundColor:
                                                    editingSym?.id === sym.id
                                                        ? colors.secondaryYellow
                                                        : colors.primaryWhite,
                                            }}>
                                            <Box>
                                                <Typography
                                                    sx={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                    }}>
                                                    {sym.name}
                                                </Typography>
                                                {!sym.isActive && (
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
                                                        startEdit(sym)
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
                                                        handleDeleteSymptom(
                                                            sym.id
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
                            disabled={selected.size === 0 || saving}
                            size="large"
                            sx={primaryButtonSx}>
                            {saving ? 'Saving...' : 'Log'}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSaveSymptom}
                            disabled={!name.trim() || saving}
                            size="large"
                            sx={primaryButtonSx}>
                            {saving
                                ? 'Saving...'
                                : editingSym
                                  ? 'Save'
                                  : 'Add'}
                        </Button>
                    )}
                </Box>
            </Box>
        </FormDrawer>
    )
}
