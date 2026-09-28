'use client'

import { Box, Typography } from '@mui/material'
import { IconList, IconPill } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { cardSx, colors, healthColors, pressShadowSx, supplementColors } from '@/lib/colors'
import { buildSupplementHistory } from '@/lib/health/supplement-calendar'
import { buildStack } from '@/lib/health/supplement-stack'
import { queryKeys } from '@/lib/query-keys'
import { AnimatedHeight } from 'components/animated-height'
import { HealthPageHeader, HealthPageLayout } from 'components/health/health-page-layout'
import { NightLine } from 'components/health/supplements/night-line'
import { SupplementCalendar } from 'components/health/supplements/supplement-calendar'
import { dayLabel, SupplementDayPanel } from 'components/health/supplements/supplement-day-panel'
import { SupplementTiles, type SupplementTile } from 'components/health/supplements/supplement-tiles'
import { SupplementsHelp } from 'components/health/supplements/supplements-help'
import { SupplementsSkeleton } from 'components/skeleton/health-skeletons'
import { useStackDay } from 'hooks/use-stack-day'
import { useDoseTaps } from 'hooks/use-supplement-dose'
import { useSupplementData } from 'hooks/useSupplementData'
import { useRegisterFab } from 'providers/fab-provider'
import { logDateString } from 'utils/time'

const LIST_URL = '/gustavo/health/supplements'
// Your Stack + the supplement form (the Manage pages until they're redesigned)
const STACK_URL = `${LIST_URL}/manage`
const NEW_URL = `${LIST_URL}/manage/new`
// A day's log form (the calendar panel's pencil: `?date=`)
const LOG_URL = `${LIST_URL}/new`

const recordedOn = (iso: string) => logDateString(new Date(iso))

/**
 * Supplements: today's stack as tap-to-take tiles (with Day X), then a month
 * calendar of how consistently you took it — tap a day to see and fix it.
 * Stack changes badge the calendar. Before 6am everything counts for the
 * day before (useStackDay). Design: .claude/docs/plans/plan-supplements-redesign.md.
 */
export default function SupplementsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { supplements, logs, events, historyPending } = useSupplementData()
    const { date: today, nightNote } = useStackDay()
    const [selected, setSelected] = useState<string | null>(null)
    const [month, setMonth] = useState(() => today.slice(0, 7))

    useEffect(() => {
        router.prefetch(STACK_URL)
        router.prefetch(NEW_URL)
        router.prefetch(LOG_URL)
    }, [router])
    useRegisterFab(useCallback(() => router.push(NEW_URL), [router]))

    const refresh = useCallback(
        () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplements }),
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementLogs.all }),
                queryClient.invalidateQueries({ queryKey: queryKeys.health.supplementEvents }),
            ]),
        [queryClient]
    )

    const history = useMemo(
        () => buildSupplementHistory({ supplements, events, logs, today, recordedOn }),
        [supplements, events, logs, today]
    )

    const tiles: SupplementTile[] = useMemo(() => {
        const dosage = new Map(supplements.map((s) => [Number(s.id), s.dosage]))
        return buildStack(
            supplements,
            logs.filter((l) => l.date === today)
        ).map((item) => ({
            ...item,
            dosage: dosage.get(item.supplementId) ?? null,
            dayOfRun: history.dayOfRun(item.supplementId, today),
        }))
    }, [supplements, logs, today, history])

    const due = tiles.reduce((n, t) => n + t.dosesPerDay, 0)
    const taken = tiles.reduce((n, t) => n + Math.min(t.taken, t.dosesPerDay), 0)

    const todayTaps = useDoseTaps(today)
    const dayTaps = useDoseTaps(selected ?? today)

    const thisMonth = today.slice(0, 7)
    const firstMonth = history.firstDay?.slice(0, 7) ?? thisMonth
    const shiftMonth = (delta: number) => {
        const [y, m] = month.split('-').map(Number)
        const d = new Date(y, m - 1 + delta, 1)
        setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        setSelected(null)
    }

    return (
        <HealthPageLayout loading={historyPending} skeleton={<SupplementsSkeleton />} onRefresh={refresh}>
            <HealthPageHeader
                icon={<IconPill size={20} stroke={2} color={colors.primaryBlack} fill={colors.primaryWhite} />}
                title="Supplements"
                color={healthColors.supplements}
                right={
                    <>
                        <Box
                            component="button"
                            type="button"
                            aria-label="Your stack"
                            onClick={() => router.push(STACK_URL)}
                            sx={{
                                width: 30,
                                height: 30,
                                padding: 0,
                                display: 'grid',
                                placeItems: 'center',
                                cursor: 'pointer',
                                color: colors.primaryBlack,
                                backgroundColor: colors.primaryWhite,
                                border: `1px solid ${colors.primaryBlack}`,
                                borderRadius: '50%',
                                boxShadow: `1.5px 1.5px 0px ${colors.primaryBlack}`,
                                ...pressShadowSx,
                            }}>
                            <IconList size={16} stroke={2.2} />
                        </Box>
                        <SupplementsHelp />
                    </>
                }
            />

            {/* Today */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography sx={stripSx}>{nightNote ? dayLabel(today) : 'Today'}</Typography>
                        {due > 0 && (
                            <Typography sx={stripSx}>
                                <Box component="span" sx={{ color: supplementColors.deep, fontSize: 13 }}>
                                    {taken}
                                </Box>
                                <Box component="span" sx={{ color: '#a8865a', marginX: '4px' }}>
                                    /
                                </Box>
                                {due} doses
                            </Typography>
                        )}
                    </Box>
                    {nightNote && <NightLine note={nightNote} />}
                </Box>
                {tiles.length > 0 ? (
                    <SupplementTiles tiles={tiles} onTap={todayTaps.onTap} />
                ) : (
                    <Typography sx={{ fontSize: 14, color: colors.primaryBrown, textAlign: 'center', paddingY: 2 }}>
                        Nothing in your daily stack yet. Tap + to add a supplement.
                    </Typography>
                )}
            </Box>

            {/* History: the calendar, and the selected day under it, in a board
                frame like the Home card (8px corners). Opening/closing a day,
                switching days or 5- vs 6-week months ease the height. */}
            <Box sx={{ ...cardSx, borderRadius: '8px', overflow: 'hidden' }}>
                <AnimatedHeight>
                    <SupplementCalendar
                        month={month}
                        summaryOn={history.summaryOn}
                        today={today}
                        selected={selected}
                        onSelect={setSelected}
                        onPrevMonth={month > firstMonth ? () => shiftMonth(-1) : undefined}
                        onNextMonth={month < thisMonth ? () => shiftMonth(1) : undefined}
                    />
                    {selected && (
                        <SupplementDayPanel
                            date={selected}
                            isPast={selected < today}
                            summary={history.summaryOn(selected)}
                            changes={history.changesOn(selected)}
                            rows={history.rowsOn(selected)}
                            onTapRow={dayTaps.onTap}
                            onEdit={() => router.push(`${LOG_URL}?date=${selected}`)}
                        />
                    )}
                </AnimatedHeight>
            </Box>
        </HealthPageLayout>
    )
}

/** The mono, uppercase strip over the tiles — like the Home card's "8 / 16 DOSES". */
const stripSx = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.primaryBlack,
} as const
