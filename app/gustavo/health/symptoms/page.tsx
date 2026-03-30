'use client'

import { cardSx, colors, hardShadow } from '@/lib/colors'
import {
    fieldSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import type { Symptom, SymptomForensicView, SymptomLog } from '@/lib/health-types'
import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material'
import { IconFirstAidKit, IconPencil, IconTrash } from '@tabler/icons-react'
import { InlineForensicContent } from 'components/health/forensic-view'
import FormDrawer from 'components/form-drawer'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { SlidingToggle } from 'components/sliding-toggle'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect, useRef, useState } from 'react'

function getLocalDate(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatMonthDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

/** Compute days since the previous occurrence of a symptom relative to a given date */
function daysSincePrevOccurrence(
    symptomId: number,
    date: string,
    allLogs: SymptomLog[]
): number | null {
    const dateMs = new Date(date + 'T00:00:00').getTime()
    let closest: number | null = null
    for (const log of allLogs) {
        if (log.symptomId !== symptomId) continue
        const logMs = new Date(log.date + 'T00:00:00').getTime()
        if (logMs < dateMs) {
            const diff = Math.round((dateMs - logMs) / 86400000)
            if (closest === null || diff < closest) closest = diff
        }
    }
    return closest
}

// Orange accent colors for symptom chips
const ACCENT_BG = '#fff3e0'
const ACCENT_BORDER = '#ff9800'

// ── Symptom Day Card (workout-style layout) ─────────────────────────────────

function SymptomDayCard({
    group,
    allLogs,
    onView,
    onEdit,
    onDelete,
}: {
    group: DayGroup
    allLogs: SymptomLog[]
    onView: () => void
    onEdit: () => void
    onDelete: () => void
}) {
    // Check if any log has notes
    const logsWithNotes = group.logs.filter((l) => l.notes)

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
                        {formatWeekday(group.date)}
                    </Typography>
                </Box>
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: colors.primaryBrown,
                    }}>
                    {formatMonthDay(group.date)}
                </Typography>
            </Box>
            {/* Card */}
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                <SwipeableRow
                    canEdit
                    canDelete
                    onEdit={onEdit}
                    onDelete={onDelete}
                    backgroundColor={colors.primaryWhite}>
                    <Box
                        onClick={onView}
                        sx={{
                            'p': 1.5,
                            'cursor': 'pointer',
                            'backgroundColor': colors.primaryWhite,
                            '&:active': {
                                backgroundColor: colors.secondaryYellow,
                            },
                            'transition': 'background-color 150ms ease',
                        }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {group.logs.map((log) => {
                                const days = daysSincePrevOccurrence(log.symptomId, group.date, allLogs)
                                return (
                                    <Box key={log.id} sx={{ position: 'relative' }}>
                                        <Chip
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
                                        {days !== null && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: -6,
                                                    right: -4,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: 16,
                                                    height: 14,
                                                    px: 0.25,
                                                    borderRadius: '7px',
                                                    backgroundColor: colors.primaryWhite,
                                                    border: `1px solid ${colors.primaryBlack}`,
                                                    zIndex: 1,
                                                }}>
                                                <Typography
                                                    sx={{
                                                        fontSize: 8,
                                                        fontWeight: 800,
                                                        lineHeight: 1,
                                                        color: colors.primaryBlack,
                                                    }}>
                                                    {days}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                )
                            })}
                        </Box>
                        {/* Truncated notes preview */}
                        {logsWithNotes.length > 0 && (
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: colors.primaryBrown,
                                    mt: 0.75,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                }}>
                                {logsWithNotes.map((l) => l.notes).join(' · ')}
                            </Typography>
                        )}
                    </Box>
                </SwipeableRow>
            </Box>
        </Box>
    )
}

export default function SymptomsPage() {
    const [symptoms, setSymptoms] = useState<Symptom[]>([])
    const [allLogs, setAllLogs] = useState<SymptomLog[]>([])
    const [loading, setLoading] = useState(true)

    // Details drawer (read-only + forensic)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [detailsDate, setDetailsDate] = useState<string | null>(null)

    // Log/manage drawer
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerInitialDate, setDrawerInitialDate] = useState<string | null>(null)

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

    // FAB → new log
    const openAdd = useCallback(() => {
        setDrawerInitialDate(null)
        setDrawerOpen(true)
    }, [])

    // Tap card → view details
    const openDetails = useCallback((date: string) => {
        setDetailsDate(date)
        setDetailsOpen(true)
    }, [])

    // Swipe edit → edit log
    const openEditDate = useCallback((date: string) => {
        setDrawerInitialDate(date)
        setDrawerOpen(true)
    }, [])

    // "Edit" from details drawer → close details, open log drawer
    const switchToEdit = useCallback((date: string) => {
        setDetailsOpen(false)
        setDetailsDate(null)
        // Small delay to let details drawer close visually
        setTimeout(() => {
            setDrawerInitialDate(date)
            setDrawerOpen(true)
        }, 200)
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
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, backgroundColor: '#ffcdd2', ...hardShadow, borderRadius: '4px', alignSelf: 'flex-start' }}>
                <IconFirstAidKit size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: colors.primaryBlack, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Symptoms
                </Typography>
            </Box>

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
                <Box sx={{ position: 'relative' }}>
                    {/* Vertical timeline line */}
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 15, // center of 32px gutter
                            top: 6,
                            bottom: 6,
                            width: 2,
                            backgroundColor: `${colors.primaryBlack}25`,
                        }}
                    />

                    {dayGroups.map((group, i) => {
                        const symptomCount = group.logs.length
                        return (
                            <Box key={group.date}>
                                {/* Row: timeline node + card */}
                                <Box sx={{ display: 'flex' }}>
                                    {/* Timeline gutter */}
                                    <Box
                                        sx={{
                                            width: 32,
                                            flexShrink: 0,
                                            display: 'flex',
                                            justifyContent: 'center',
                                            pt: '1px',
                                        }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minWidth: 18,
                                                height: 18,
                                                borderRadius: '50%',
                                                backgroundColor: colors.primaryYellow,
                                                border: `1.5px solid ${colors.primaryBlack}`,
                                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                                zIndex: 1,
                                            }}>
                                            <Typography
                                                sx={{
                                                    fontSize: 9,
                                                    fontWeight: 800,
                                                    lineHeight: 1,
                                                    color: colors.primaryBlack,
                                                }}>
                                                {symptomCount}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {/* Card */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <SymptomDayCard
                                            group={group}
                                            allLogs={allLogs}
                                            onView={() => openDetails(group.date)}
                                            onEdit={() => openEditDate(group.date)}
                                            onDelete={() => handleDeleteDate(group.date)}
                                        />
                                    </Box>
                                </Box>
                                {/* Gap between entries */}
                                {i < dayGroups.length - 1 && (
                                    <Box sx={{ height: 12 }} />
                                )}
                            </Box>
                        )
                    })}
                </Box>
            )}

            {/* Details drawer (read-only + forensic) */}
            <SymptomDetailsDrawer
                open={detailsOpen}
                onClose={() => {
                    setDetailsOpen(false)
                    setDetailsDate(null)
                }}
                date={detailsDate}
                allLogs={allLogs}
                onEdit={switchToEdit}
            />

            {/* Log / Manage drawer */}
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
            />
        </Box>
    )
}

// ── Symptom Details Drawer (read-only + forensic) ───────────────────────────

function SymptomDetailsDrawer({
    open,
    onClose,
    date,
    allLogs,
    onEdit,
}: {
    open: boolean
    onClose: () => void
    date: string | null
    allLogs: SymptomLog[]
    onEdit: (date: string) => void
}) {
    const [forensicData, setForensicData] = useState<SymptomForensicView | null>(null)
    const [forensicLoading, setForensicLoading] = useState(false)
    const prevOpenRef = useRef(false)

    const logsForDate = date ? allLogs.filter((l) => l.date === date) : []
    const notesSet = new Set(logsForDate.map((l) => l.notes).filter(Boolean))
    const notesText = Array.from(notesSet).join('\n')

    // Load forensic data on open
    useEffect(() => {
        const justOpened = open && !prevOpenRef.current
        prevOpenRef.current = open

        if (justOpened && logsForDate.length > 0) {
            setForensicData(null)
            setForensicLoading(true)
            fetch(`/api/health/symptom-logs/${logsForDate[0].id}/forensic`)
                .then((r) => r.json())
                .then(setForensicData)
                .catch((err) => console.error('Failed to load forensic data:', err))
                .finally(() => setForensicLoading(false))
        }
        if (justOpened && logsForDate.length === 0) {
            setForensicData(null)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

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
                    <Typography sx={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                        {date ? formatMonthDay(date) : 'Symptom Details'}
                    </Typography>
                    {date && (
                        <Typography sx={{ fontSize: 12, color: colors.primaryBrown, mt: 0.25 }}>
                            {formatWeekday(date)} — {logsForDate.length} symptom{logsForDate.length !== 1 ? 's' : ''}
                        </Typography>
                    )}
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
                    {/* Symptom chips */}
                    {logsForDate.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {logsForDate.map((log) => (
                                <Chip
                                    key={log.id}
                                    label={log.symptomName}
                                    size="small"
                                    sx={{
                                        'height': 26,
                                        'fontSize': 13,
                                        'fontWeight': 600,
                                        'backgroundColor': ACCENT_BG,
                                        'border': `1.5px solid ${ACCENT_BORDER}`,
                                        'boxShadow': `1.5px 1.5px 0px ${ACCENT_BORDER}`,
                                        'borderRadius': '3px',
                                        'color': colors.primaryBlack,
                                        '& .MuiChip-label': { px: 1 },
                                    }}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Notes */}
                    {notesText && (
                        <Box>
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    color: colors.primaryBrown,
                                    mb: 0.5,
                                }}>
                                Notes
                            </Typography>
                            <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                                {notesText}
                            </Typography>
                        </Box>
                    )}

                    {/* Forensic / Lookback */}
                    {forensicLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={20} sx={{ color: colors.primaryYellow }} />
                        </Box>
                    ) : forensicData ? (
                        <InlineForensicContent data={forensicData} />
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
                        size="large"
                        sx={secondaryButtonSx}>
                        Close
                    </Button>
                    <Button
                        onClick={() => date && onEdit(date)}
                        size="large"
                        sx={primaryButtonSx}>
                        Edit
                    </Button>
                </Box>
            </Box>
        </FormDrawer>
    )
}

// ── Symptom Log / Manage Drawer ─────────────────────────────────────────────

type DrawerMode = 'log' | 'manage'

type SymptomDrawerProps = {
    open: boolean
    onClose: () => void
    symptoms: Symptom[]
    allLogs: SymptomLog[]
    initialDate: string | null
    onDataChanged: () => void
}

function SymptomDrawer({
    open,
    onClose,
    symptoms,
    allLogs,
    initialDate,
    onDataChanged,
}: SymptomDrawerProps) {
    const [mode, setMode] = useState<DrawerMode>('log')
    const [date, setDate] = useState(getLocalDate)
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    // Manage mode state
    const [editingSym, setEditingSym] = useState<Symptom | null>(null)
    const [name, setName] = useState('')
    const [isActive, setIsActive] = useState(true)

    const activeSymptoms = symptoms.filter((s) => s.isActive)
    const prevOpenRef = useRef(false)

    // Logs for selected date (from DB)
    const dateLogs = allLogs.filter((l) => l.date === date)

    // Reset only on fresh open
    useEffect(() => {
        const justOpened = open && !prevOpenRef.current
        prevOpenRef.current = open

        if (justOpened) {
            const d = initialDate || getLocalDate()
            setMode('log')
            setDate(d)
            setEditingSym(null)
            setName('')
            setIsActive(true)
            // Pre-fill from existing logs for this date
            const logsForDate = allLogs.filter((l) => l.date === d)
            const sel = new Set<number>()
            const allNotes: string[] = []
            for (const l of logsForDate) {
                sel.add(Number(l.symptomId))
                if (l.notes) allNotes.push(l.notes)
            }
            setSelected(sel)
            setNotes(allNotes.join('\n'))
        }
    }, [open, initialDate, allLogs])

    // Change date and re-sync selections from existing logs
    const handleDateChange = useCallback((newDate: string) => {
        setDate(newDate)
        const logsForDate = allLogs.filter((l) => l.date === newDate)
        const sel = new Set<number>()
        const allNotes: string[] = []
        for (const l of logsForDate) {
            sel.add(Number(l.symptomId))
            if (l.notes) allNotes.push(l.notes)
        }
        setSelected(sel)
        setNotes(allNotes.join('\n'))
    }, [allLogs])

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

    const handleLogSubmit = useCallback(async () => {
        setSaving(true)
        try {
            const logMap = new Map<number, SymptomLog>()
            for (const l of dateLogs) logMap.set(Number(l.symptomId), l)

            const ops: Promise<Response>[] = []
            const noteVal = notes.trim() || null

            // Add new or update notes for selected symptoms
            for (const symId of Array.from(selected)) {
                const existing = logMap.get(symId)
                if (existing) {
                    if ((existing.notes || null) !== noteVal) {
                        ops.push(fetch(`/api/health/symptom-logs/${existing.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notes: noteVal }),
                        }))
                    }
                } else {
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
                    <SlidingToggle
                        value={mode}
                        options={[
                            { value: 'log', label: 'Log symptoms' },
                            { value: 'manage', label: 'Manage symptoms' },
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
                                            <Box
                                                key={sym.id}
                                                onClick={() => toggleSymptomSelection(sym.id)}
                                                sx={{
                                                    'display': 'flex',
                                                    'alignItems': 'center',
                                                    'gap': 1,
                                                    'padding': '8px 12px',
                                                    ...cardSx,
                                                    'cursor': 'pointer',
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
                                                <Checkbox
                                                    checked={isSelected}
                                                    size="small"
                                                    tabIndex={-1}
                                                    sx={{
                                                        'padding': 0,
                                                        'color': colors.primaryBlack,
                                                        '&.Mui-checked': { color: ACCENT_BORDER },
                                                    }}
                                                />
                                                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                                    {sym.name}
                                                </Typography>
                                            </Box>
                                        )
                                    })}
                                </Box>
                            )}

                            {/* Single notes field */}
                            {selected.size > 0 && (
                                <Box>
                                    <Typography sx={labelSx}>Notes</Typography>
                                    <TextField
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        size="small"
                                        fullWidth
                                        multiline
                                        minRows={2}
                                        placeholder="Optional notes..."
                                        sx={fieldSx}
                                    />
                                </Box>
                            )}

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
