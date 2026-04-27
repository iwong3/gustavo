'use client'

import { cardSx, colors, hardShadow } from '@/lib/colors'
import {
    fieldSx,
    labelSx,
    primaryButtonSx,
    secondaryButtonSx,
} from '@/lib/form-styles'
import type { WeightLog } from '@/lib/health-types'
import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material'
import { IconScale } from '@tabler/icons-react'
import FormDrawer from 'components/form-drawer'
import { HealthPageLayout, HealthPageHeader } from 'components/health/health-page-layout'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import { useRegisterFab } from 'providers/fab-provider'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'
import { Group } from '@visx/group'
import { scaleLinear, scaleTime } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { AxisBottom, AxisLeft } from '@visx/axis'
import * as allCurves from '@visx/curve'

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00')
}

// Accent color for weight
const WEIGHT_COLOR = '#81d4fa'
const WEIGHT_BORDER = '#0288d1'

// ── Chart Range Picker ──────────────────────────────────────────────────────

type ChartRange = '3m' | '6m' | '1y' | 'all'

function getDateDaysAgo(days: number): Date {
    const d = new Date()
    d.setDate(d.getDate() - days)
    d.setHours(0, 0, 0, 0)
    return d
}

function getChartCutoff(range: ChartRange): Date | null {
    switch (range) {
        case '3m': return getDateDaysAgo(90)
        case '6m': return getDateDaysAgo(180)
        case '1y': return getDateDaysAgo(365)
        case 'all': return null
    }
}

// ── Weight Chart ────────────────────────────────────────────────────────────

function WeightChart({ logs, range }: { logs: WeightLog[]; range: ChartRange }) {
    const cutoff = getChartCutoff(range)

    // Filter and sort chronologically
    const data = logs
        .filter((l) => !cutoff || parseDate(l.date) >= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date))

    if (data.length < 2) {
        return (
            <Typography
                sx={{
                    fontSize: 13,
                    color: colors.primaryBrown,
                    textAlign: 'center',
                    py: 3,
                }}>
                {data.length === 0
                    ? 'No data in this range.'
                    : 'Need at least 2 entries to show chart.'}
            </Typography>
        )
    }

    const width = 340
    const height = 200
    const margin = { top: 12, right: 12, bottom: 32, left: 44 }

    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const dates = data.map((d) => parseDate(d.date))
    const weights = data.map((d) => d.weightLbs)
    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)
    const padding = Math.max((maxW - minW) * 0.15, 1)

    const xScale = scaleTime({
        domain: [dates[0], dates[dates.length - 1]],
        range: [0, innerWidth],
    })

    const yScale = scaleLinear({
        domain: [minW - padding, maxW + padding],
        range: [innerHeight, 0],
        nice: true,
    })

    return (
        <Box
            sx={{
                width: '100%',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
            }}>
            <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
                <Group left={margin.left} top={margin.top}>
                    {/* Grid lines */}
                    {yScale.ticks(5).map((tick) => (
                        <line
                            key={tick}
                            x1={0}
                            x2={innerWidth}
                            y1={yScale(tick)}
                            y2={yScale(tick)}
                            stroke={`${colors.primaryBlack}15`}
                            strokeDasharray="3,3"
                        />
                    ))}
                    <LinePath
                        data={data}
                        x={(d) => xScale(parseDate(d.date))}
                        y={(d) => yScale(d.weightLbs)}
                        stroke={WEIGHT_BORDER}
                        strokeWidth={2}
                        curve={allCurves.curveMonotoneX}
                    />
                    {/* Data points */}
                    {data.map((d) => (
                        <circle
                            key={d.id}
                            cx={xScale(parseDate(d.date))}
                            cy={yScale(d.weightLbs)}
                            r={3}
                            fill={WEIGHT_COLOR}
                            stroke={WEIGHT_BORDER}
                            strokeWidth={1.5}
                        />
                    ))}
                    <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        numTicks={4}
                        tickFormat={(d) => {
                            const date = d as Date
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }}
                        tickLabelProps={{
                            fontSize: 10,
                            fill: colors.primaryBrown,
                            textAnchor: 'middle',
                        }}
                        strokeWidth={1}
                        stroke={`${colors.primaryBlack}30`}
                        tickStroke={`${colors.primaryBlack}30`}
                    />
                    <AxisLeft
                        scale={yScale}
                        numTicks={5}
                        tickFormat={(d) => `${d}`}
                        tickLabelProps={{
                            fontSize: 10,
                            fill: colors.primaryBrown,
                            textAnchor: 'end',
                            dx: -4,
                            dy: 3,
                        }}
                        strokeWidth={0}
                        tickStroke={`${colors.primaryBlack}20`}
                    />
                </Group>
            </svg>
        </Box>
    )
}

// ── Weight Log Card ─────────────────────────────────────────────────────────

function WeightLogCard({
    log,
    prevLog,
    onEdit,
    onDelete,
}: {
    log: WeightLog
    prevLog: WeightLog | null
    onEdit: () => void
    onDelete: () => void
}) {
    const delta = prevLog ? log.weightLbs - prevLog.weightLbs : null

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
                        {formatWeekday(log.date)}
                    </Typography>
                </Box>
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: colors.primaryBrown,
                    }}>
                    {formatMonthDay(log.date)}
                </Typography>
            </Box>
            {/* Card */}
            <Box sx={{ ...cardSx, overflow: 'hidden' }}>
                <SwipeableRow
                    canEdit
                    canDelete
                    onEdit={onEdit}
                    onDelete={onDelete}
                    backgroundColor={colors.primaryWhite}
                    borderColor={colors.primaryBlack}>
                    <Box
                        sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: colors.primaryWhite,
                        }}>
                        <Typography
                            sx={{
                                fontSize: 20,
                                fontWeight: 700,
                                fontFamily: 'var(--font-serif)',
                                lineHeight: 1,
                            }}>
                            {log.weightLbs}
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: colors.primaryBrown,
                                    ml: 0.5,
                                }}>
                                lbs
                            </Typography>
                        </Typography>
                        {delta !== null && delta !== 0 && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.25,
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: '3px',
                                    backgroundColor: delta < 0 ? '#e8f5e9' : '#fce4ec',
                                    border: `1px solid ${delta < 0 ? '#4caf50' : '#e57373'}`,
                                }}>
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: delta < 0 ? '#2e7d32' : '#c62828',
                                        lineHeight: 1,
                                    }}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </SwipeableRow>
            </Box>
        </Box>
    )
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function WeightPage() {
    const queryClient = useQueryClient()
    const [chartRange, setChartRange] = useState<ChartRange>('3m')

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editingLog, setEditingLog] = useState<WeightLog | null>(null)
    const [date, setDate] = useState(getLocalDate)
    const [weight, setWeight] = useState('')
    const [saving, setSaving] = useState(false)

    const prevOpenRef = useRef(false)

    const { data: logs = [], isLoading: loading } = useQuery({
        queryKey: queryKeys.health.weightLogs,
        queryFn: async () => {
            const r = await fetch('/api/health/weight-logs')
            if (!r.ok) throw new Error('Failed to load weight logs')
            return r.json() as Promise<WeightLog[]>
        },
    })

    const fetchLogs = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: queryKeys.health.weightLogs })
    }, [queryClient])

    // FAB → new log
    const openAdd = useCallback(() => {
        setEditingLog(null)
        setDrawerOpen(true)
    }, [])

    useRegisterFab(openAdd)

    // Reset drawer on fresh open
    useEffect(() => {
        const justOpened = drawerOpen && !prevOpenRef.current
        prevOpenRef.current = drawerOpen

        if (justOpened) {
            if (editingLog) {
                setDate(editingLog.date)
                setWeight(String(editingLog.weightLbs))
            } else {
                setDate(getLocalDate())
                setWeight('')
            }
        }
    }, [drawerOpen, editingLog])

    const handleEdit = useCallback((log: WeightLog) => {
        setEditingLog(log)
        setDrawerOpen(true)
    }, [])

    const handleDelete = useCallback(async (log: WeightLog) => {
        try {
            await fetch(`/api/health/weight-logs/${log.id}`, { method: 'DELETE' })
            fetchLogs()
        } catch (err) {
            console.error('Failed to delete weight log:', err)
        }
    }, [fetchLogs])

    const handleSubmit = useCallback(async () => {
        const weightNum = parseFloat(weight)
        if (!date || isNaN(weightNum)) return

        setSaving(true)
        try {
            if (editingLog) {
                await fetch(`/api/health/weight-logs/${editingLog.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, weightLbs: weightNum }),
                })
            } else {
                await fetch('/api/health/weight-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, weightLbs: weightNum }),
                })
            }
            fetchLogs()
            setDrawerOpen(false)
            setEditingLog(null)
        } catch (err) {
            console.error('Failed to save weight log:', err)
        } finally {
            setSaving(false)
        }
    }, [date, weight, editingLog, fetchLogs])

    // Logs sorted by date DESC for history list; compute delta from next-older entry
    const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date))

    const rangeOptions: { value: ChartRange; label: string }[] = [
        { value: '3m', label: '3M' },
        { value: '6m', label: '6M' },
        { value: '1y', label: '1Y' },
        { value: 'all', label: 'All' },
    ]

    return (
        <HealthPageLayout loading={loading} onRefresh={fetchLogs}>
            <HealthPageHeader
                icon={<IconScale size={20} stroke={2} color={colors.primaryBlack} />}
                title="Weight"
                color={WEIGHT_COLOR}
            />

            {/* Chart section */}
            {logs.length > 0 && (
                <Box>
                    {/* Range selector */}
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                        {rangeOptions.map((opt) => (
                            <Box
                                key={opt.value}
                                onClick={() => setChartRange(opt.value)}
                                sx={{
                                    'px': 1,
                                    'py': 0.5,
                                    'borderRadius': '3px',
                                    'cursor': 'pointer',
                                    'fontSize': 12,
                                    'fontWeight': 700,
                                    'border': `1px solid ${colors.primaryBlack}`,
                                    'backgroundColor': chartRange === opt.value
                                        ? colors.primaryYellow
                                        : colors.primaryWhite,
                                    'boxShadow': chartRange === opt.value
                                        ? `1.5px 1.5px 0px ${colors.primaryBlack}`
                                        : 'none',
                                    'transition': 'all 0.15s',
                                    '&:active': {
                                        transform: 'translate(1px, 1px)',
                                    },
                                }}>
                                {opt.label}
                            </Box>
                        ))}
                    </Box>
                    <Box sx={{ ...cardSx, p: 1.5 }}>
                        <WeightChart logs={logs} range={chartRange} />
                    </Box>
                </Box>
            )}

            {/* Log history */}
            {sortedLogs.length === 0 ? (
                <Typography
                    sx={{
                        fontSize: 14,
                        color: colors.primaryBrown,
                        textAlign: 'center',
                        py: 4,
                    }}>
                    No weight logged yet.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {sortedLogs.map((log, i) => (
                        <WeightLogCard
                            key={log.id}
                            log={log}
                            prevLog={i < sortedLogs.length - 1 ? sortedLogs[i + 1] : null}
                            onEdit={() => handleEdit(log)}
                            onDelete={() => handleDelete(log)}
                        />
                    ))}
                </Box>
            )}

            {/* Log drawer */}
            <FormDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditingLog(null) }}>
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
                        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                            {editingLog ? 'Edit Weight' : 'Log Weight'}
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
                        <Box>
                            <Typography sx={labelSx}>Weight (lbs)</Typography>
                            <TextField
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                size="small"
                                fullWidth
                                type="number"
                                inputProps={{ step: '0.1', min: '0', inputMode: 'decimal' }}
                                placeholder="e.g. 185.5"
                                sx={{ ...fieldSx, maxWidth: 180 }}
                            />
                        </Box>
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
                            onClick={() => { setDrawerOpen(false); setEditingLog(null) }}
                            disabled={saving}
                            size="large"
                            sx={secondaryButtonSx}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!weight || isNaN(parseFloat(weight)) || saving}
                            size="large"
                            sx={primaryButtonSx}>
                            {saving ? 'Saving...' : editingLog ? 'Save' : 'Log'}
                        </Button>
                    </Box>
                </Box>
            </FormDrawer>
        </HealthPageLayout>
    )
}
