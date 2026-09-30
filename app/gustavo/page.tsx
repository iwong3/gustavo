'use client'

import { colors, healthColors } from '@/lib/colors'
import type {
    DaysSince,
    Supplement,
    SupplementLog,
    Workout,
    WorkoutPreset,
} from '@/lib/health-types'
import { buildStack } from '@/lib/health/supplement-stack'
import { queryKeys } from '@/lib/query-keys'
import type { HomeActivityEntry } from '@/lib/types'
import { Box, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo } from 'react'
import { getTablerIcon } from 'utils/icons'
import { fetchTrips } from 'utils/api'

import DeparturesBoard from 'components/departures-board'
import ActivityDeck from 'components/home/activity-deck'
import HomeLayout from 'components/home/home-layout'
import { useSeenBefore } from 'components/home/use-seen-section'
import {
    BoardSkeleton,
    HomeCardSkeleton,
    QuickActionsSkeleton,
} from 'components/skeleton/home-skeletons'
import {
    FROM_HOME,
    lcdDayLabel,
    pickExpenseTrip,
    tripWhenLabel,
} from 'components/home/home-utils'
import { FlapScaleButton, ReceiptButton } from 'components/home/quick-actions'
import SupplementsCard from 'components/home/supplements-card'
import WorkoutsCard from 'components/home/workouts-card'
import { useApplyWorkoutRoutine } from 'components/health/workout-presets'
import { useToday } from 'hooks/use-today'
import { useStackDay } from 'hooks/use-stack-day'
import { useDoseTaps } from 'hooks/use-supplement-dose'
import { localDateString } from 'utils/time'
import { allSupplementsKey } from 'hooks/useSupplementData'
import { useWeightLogs } from 'hooks/useWeightLogs'

/**
 * Home: the trips board, a row of one-tap shortcuts (Add expense while a trip
 * is on or coming up; Track weight once you weigh in), the latest changes other
 * people made to your trips, then cards for the Health features you use. Every section after the
 * board only shows when it has something to do — Health sections appear once
 * you've used that feature, so trips-only people get a short page.
 *
 * Queries reuse the keys (and endpoints) of the pages they link to, so their
 * caches are shared both ways: saving a workout elsewhere updates home, and
 * landing on Health after home is instant.
 */

const fetchJson = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ${url}`)
    return res.json()
}

/** The board's stand-in before you're on any trip: a row into Trips. */
function NoTripsRow() {
    return (
        <Box
            component={Link}
            href="/gustavo/trips"
            sx={{
                'display': 'flex',
                'alignItems': 'center',
                'gap': 2,
                'padding': 2,
                'border': `1px solid ${colors.primaryBlack}`,
                'borderRadius': '8px',
                'backgroundColor': colors.primaryWhite,
                'boxShadow': `2px 2px 0px ${colors.primaryBlack}`,
                'textDecoration': 'none',
                'color': colors.primaryBlack,
                '&:active': {
                    boxShadow: `1px 1px 0px ${colors.primaryBlack}`,
                    transform: 'translate(1px, 1px)',
                },
                'transition': 'box-shadow 0.1s, transform 0.1s',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#e8edca',
                    border: `1.5px solid ${colors.primaryBlack}`,
                    boxShadow: `2px 2px 0px ${colors.primaryBlack}`,
                    flexShrink: 0,
                }}>
                {getTablerIcon({
                    name: 'IconPlaneDeparture',
                    size: 22,
                    stroke: 1.8,
                    color: colors.primaryBlack,
                    fill: colors.primaryWhite,
                })}
            </Box>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>No trips yet</Typography>
        </Box>
    )
}

/** The group's trips (shared with the Trips page's cache). */
function useMyTrips() {
    const { data: trips = [], isPending } = useQuery({
        queryKey: queryKeys.trips.list(),
        queryFn: fetchTrips,
    })
    const myTrips = useMemo(
        () => trips.filter((t) => t.userRole !== null),
        [trips]
    )
    return { myTrips, isPending }
}

/** The split-flap departures board. */
function TripsSection({ today }: { today: string }) {
    const { myTrips, isPending } = useMyTrips()
    if (isPending) return <BoardSkeleton />
    if (myTrips.length === 0) return <NoTripsRow />
    return <DeparturesBoard trips={myTrips} todayIso={today} />
}

/**
 * One-tap shortcuts, side by side: Add expense (to the ongoing trip,
 * else the next one — hidden with neither) and Track weight (once you've
 * weighed in). Renders nothing when neither applies.
 */
function QuickActions({ today }: { today: string }) {
    const { myTrips, isPending: tripsPending } = useMyTrips()
    const target = useMemo(
        () => pickExpenseTrip(myTrips, today),
        [myTrips, today]
    )
    const { logs, loading: weightPending } = useWeightLogs()
    const latest = logs[0]
    const weightValue =
        latest && Number.isFinite(latest.weightLbs)
            ? latest.weightLbs.toFixed(1)
            : null
    const pending = tripsPending || weightPending
    // Placeholders only for the buttons this device showed last time
    const hadExpense = useSeenBefore('expense', pending ? null : !!target)
    const hadWeight = useSeenBefore('weight', pending ? null : !!latest)

    if (pending) {
        const count = Number(hadExpense) + Number(hadWeight)
        return count > 0 ? <QuickActionsSkeleton count={count as 1 | 2} /> : null
    }
    if (!target && !latest) return null
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            {target && (
                <ReceiptButton
                    href={`/gustavo/trips/${target.slug}/expenses/new?${FROM_HOME}`}
                    tripName={target.name}
                    tripWhen={tripWhenLabel(target, today)}
                />
            )}
            {latest && (
                <FlapScaleButton
                    href={`/gustavo/health/weight/new?${FROM_HOME}`}
                    reading={weightValue}
                    when={lcdDayLabel(latest.date, today)}
                    done={latest.date === today}
                />
            )}
        </Box>
    )
}

/** What other people changed on your trips this week; hidden when nothing. */
function LatestSection() {
    const { data = [] } = useQuery({
        queryKey: queryKeys.home.activity,
        queryFn: () => fetchJson<HomeActivityEntry[]>('/api/home/activity'),
    })
    if (data.length === 0) return null
    return <ActivityDeck entries={data} />
}

/**
 * The recent-workouts window. The Health hub shows this list at 30D until the
 * full history loads (useWorkoutData's placeholder), so home → Health is
 * instant; the history strip reads the last 14 days of it.
 */
const HEALTH_WINDOW_DAYS = 30

/** Routines → one-tap log with Undo; muscle groups with a 14-day history strip. */
function WorkoutsSection({ today }: { today: string }) {
    const windowStart = useMemo(() => {
        const d = new Date(today + 'T00:00:00')
        d.setDate(d.getDate() - (HEALTH_WINDOW_DAYS - 1))
        return localDateString(d)
    }, [today])
    const recentQ = useQuery({
        queryKey: [
            ...queryKeys.health.workouts.list(),
            { startDate: windowStart, endDate: today },
        ],
        queryFn: () =>
            fetchJson<Workout[]>(
                `/api/health/workouts?startDate=${windowStart}&endDate=${today}`
            ),
    })
    const daysSinceQ = useQuery({
        queryKey: queryKeys.health.workouts.daysSince,
        queryFn: () =>
            fetchJson<DaysSince[]>(
                `/api/health/workouts/days-since?today=${today}`
            ),
    })
    const presetsQ = useQuery({
        queryKey: queryKeys.health.presets.byType('workout'),
        queryFn: () =>
            fetchJson<WorkoutPreset[]>('/api/health/presets?type=workout'),
    })
    const { apply, applyingId, appliedId } = useApplyWorkoutRoutine(today)

    const daysSince = daysSinceQ.data ?? []
    // Shows once you've ever logged a workout
    const hasWorkouts = daysSince.some((d) => d.daysSince !== null)
    const hadWorkouts = useSeenBefore('workouts', daysSinceQ.isPending ? null : hasWorkouts)
    if (daysSinceQ.isPending) {
        return hadWorkouts ? <HomeCardSkeleton headerBg={healthColors.workouts} rows={10} logRow /> : null
    }
    if (!hasWorkouts) return null
    return (
        <WorkoutsCard
            daysSince={daysSince}
            workouts={recentQ.data ?? []}
            today={today}
            presets={presetsQ.data ?? []}
            applyingId={applyingId}
            appliedId={appliedId}
            onApplyPreset={apply}
        />
    )
}

/** Today's daily stack, one tap per dose, with Undo. */
function SupplementsSection() {
    // Before 6am taps count for yesterday; the note says so (useStackDay)
    const { date, nightNote } = useStackDay()
    const supplementsQ = useQuery({
        queryKey: allSupplementsKey,
        queryFn: () =>
            fetchJson<Supplement[]>('/api/health/supplements?all=true'),
    })
    const logsQ = useQuery({
        queryKey: queryKeys.health.supplementLogs.byDate(date),
        queryFn: () =>
            fetchJson<SupplementLog[]>(
                `/api/health/supplement-logs?date=${date}`
            ),
    })
    // No Undo toast: it pops up over the bottom rows, so a quick tap on the
    // next supplement hit its Undo instead. The card shows each dose, and
    // Undo stays one tap (done row) or a swipe away.
    const { onTap, onUndo } = useDoseTaps(date, { undoToast: false })

    const items = useMemo(
        () => buildStack(supplementsQ.data ?? [], logsQ.data ?? []),
        [supplementsQ.data, logsQ.data]
    )

    const stackPending = logsQ.isPending || supplementsQ.isPending
    const hadStack = useSeenBefore('supplements', stackPending ? null : items.length > 0)
    if (stackPending) {
        return hadStack ? <HomeCardSkeleton headerBg={healthColors.supplements} rows={4} meter /> : null
    }
    if (items.length === 0) return null
    return (
        <SupplementsCard
            items={items}
            onTap={onTap}
            onUndo={onUndo}
            nightNote={nightNote}
        />
    )
}

export default function GustavoHomePage() {
    // Kept current: the home page can sit open overnight in the PWA
    const today = useToday()

    return (
        <HomeLayout>
            <TripsSection today={today} />
            <QuickActions today={today} />
            <LatestSection />
            <WorkoutsSection today={today} />
            <SupplementsSection />
        </HomeLayout>
    )
}
