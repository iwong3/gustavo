'use client'

import { colors, pressRowSx, healthColors } from '@/lib/colors'
import type { SupplementLog } from '@/lib/health-types'
import { Box, Chip, Typography } from '@mui/material'
import { IconBolt, IconList, IconPill } from '@tabler/icons-react'
import { HealthPageLayout, HealthPageHeader } from 'components/health/health-page-layout'
import { SwipeableRow } from 'components/receipts/swipeable-row'
import {
    SortablePresetChip,
    HorizontalSortableList,
} from 'components/health/sortable-preset'
import { useReorderSupplementPresets } from 'components/health/supplement-presets'
import { todayIso } from 'components/health/workout-presets'
import { useSupplementData } from 'hooks/useSupplementData'
import { useRegisterFab } from 'providers/fab-provider'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/query-keys'

const LIST_URL = '/gustavo/health/supplements'
const NEW_URL = `${LIST_URL}/new`
const MANAGE_URL = `${LIST_URL}/manage`
const GROUPS_URL = `${LIST_URL}/groups`

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

// SwipeableRow sits inside the card's border (overflow: hidden) so the
// revealed Edit/Delete buttons read as part of the card
function SupplementLogCard({
    group,
    onEdit,
    onDelete,
}: {
    group: DayGroup
    onEdit: () => void
    onDelete: () => void
}) {
    return (
        <Box sx={{ overflow: 'hidden', borderRadius: '4px', border: `1px solid ${colors.primaryBlack}`, boxShadow: `2px 2px 0px ${colors.primaryBlack}` }}>
            <SwipeableRow
                canEdit
                canDelete
                onEdit={onEdit}
                onDelete={onDelete}
                backgroundColor={colors.primaryWhite}
                borderColor={colors.primaryBlack}>
                <Box
                    onClick={onEdit}
                    sx={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        '&:active': pressRowSx['&:active'],
                    }}>
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
            </SwipeableRow>
        </Box>
    )
}

// ── Header icon button (lightning → groups, list → manage) ──────────────────

function HeaderIconButton({
    onClick,
    children,
}: {
    onClick: () => void
    children: React.ReactNode
}) {
    return (
        <Box
            onClick={onClick}
            sx={{
                'width': 30,
                'height': 30,
                'borderRadius': '50%',
                'backgroundColor': healthColors.supplements,
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
            {children}
        </Box>
    )
}

// ── Page ────────────────────────────────────────────────────────────────────

function SupplementsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { logs: allLogs, presets, loading } = useSupplementData()
    const reorderPresets = useReorderSupplementPresets()

    // Warm the routes the header and FAB lead to
    useEffect(() => {
        router.prefetch(NEW_URL)
        router.prefetch(MANAGE_URL)
        router.prefetch(GROUPS_URL)
    }, [router])

    const invalidateLogs = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementLogs.all })
    }, [queryClient])
    const invalidateAll = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.health.supplements })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementLogs.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.health.presets.all })
    }, [queryClient])

    const openAdd = useCallback(() => router.push(NEW_URL), [router])
    const openEditDate = useCallback(
        (date: string) => router.push(`${NEW_URL}?date=${date}`),
        [router]
    )
    useRegisterFab(openAdd)

    const deleteDateMutation = useMutation({
        mutationFn: async (date: string) => {
            const logsForDate = allLogs.filter((l) => l.date === date)
            const results = await Promise.all(
                logsForDate.map((l) =>
                    fetch(`/api/health/supplement-logs/${l.id}`, {
                        method: 'DELETE',
                    })
                )
            )
            if (results.some((r) => !r.ok)) throw new Error('Delete failed')
        },
        // Settled, not success: a partial failure still deleted some logs
        onSettled: invalidateLogs,
        meta: { errorToast: "Couldn't delete that day's supplements. Try again." },
    })

    const applyPresetMutation = useMutation({
        mutationFn: async (presetId: number) => {
            const res = await fetch(`/api/health/presets/${presetId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: todayIso() }),
            })
            if (!res.ok) throw new Error('Apply failed')
            return presetId
        },
        onSuccess: invalidateLogs,
        onError: (err) => console.error('Failed to apply preset:', err),
    })
    const applyPreset = useCallback(
        (presetId: number) => applyPresetMutation.mutate(presetId),
        [applyPresetMutation],
    )
    const applyingPreset = applyPresetMutation.isPending
        ? (applyPresetMutation.variables ?? null)
        : null

    const dayGroups = groupLogsByDate(allLogs)

    return (
        <HealthPageLayout loading={loading} onRefresh={invalidateAll}>
            <HealthPageHeader
                icon={<IconPill size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />}
                title="Supplements"
                color={healthColors.supplements}>
                {/* Preset quick-actions */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'center',
                    }}>
                    <HeaderIconButton onClick={() => router.push(GROUPS_URL)}>
                        <IconBolt
                            size={14}
                            stroke={2.5}
                            fill={colors.primaryWhite}
                            color={colors.primaryBlack}
                        />
                    </HeaderIconButton>
                    <HeaderIconButton onClick={() => router.push(MANAGE_URL)}>
                        <IconList size={14} stroke={2.5} color={colors.primaryBlack} />
                    </HeaderIconButton>
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
            </HealthPageHeader>

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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {dayGroups.map((group) => (
                        <Box key={group.date}>
                            {/* Date label */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                                <Box sx={{
                                    px: 0.75, py: 0.25,
                                    backgroundColor: colors.primaryYellow,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                    borderRadius: '3px',
                                }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.2 }}>
                                        {formatWeekday(group.date)}
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.primaryBrown }}>
                                    {formatMonthDay(group.date)}
                                </Typography>
                            </Box>
                            <SupplementLogCard
                                group={group}
                                onEdit={() => openEditDate(group.date)}
                                onDelete={() => deleteDateMutation.mutate(group.date)}
                            />
                        </Box>
                    ))}
                </Box>
            )}
        </HealthPageLayout>
    )
}

export default function Page() {
    return <SupplementsPage />
}
