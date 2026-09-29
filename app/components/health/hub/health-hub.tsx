'use client'

/**
 * The Health hub (/gustavo/health): one card per feature, all drawn over the
 * same rolling window (30D / 90D / 1Y in the title row, always ending today),
 * then a More row for the rarely used pages. Each card's strip opens its page.
 *
 *  - Workouts: a heatmap of the days you trained (weeks left → right, Mon–Sun
 *    top → bottom) + per week / % of days / longest break.
 *  - Weight: the trend line (weekly averages at 1Y).
 *  - Supplements: daily-stack runs — what you were on, and when — with Day X.
 *
 * Home does the daily logging; this page is for looking back. A new Health
 * feature = a new card here. Presentational + gallery-importable: the page
 * passes the data (null = still loading). Numbers: lib/health/hub-window.ts.
 */
import { Box, Typography } from '@mui/material'
import {
    IconBarbell,
    IconChevronRight,
    IconFirstAidKit,
    IconHeartbeat,
    IconPill,
    IconSalad,
    IconScale,
    IconStretching,
} from '@tabler/icons-react'
import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'

import {
    colors,
    hardShadow,
    healthColors,
    pressShadowSx,
    supplementColors,
    toneColors,
    weightColors,
    workoutColors,
} from '@/lib/colors'
import type { WeightLog } from '@/lib/health-types'
import {
    HUB_WINDOWS,
    monthStarts,
    runRows,
    WINDOW_DAYS,
    WINDOW_LABEL,
    weightSeries,
    workoutWindow,
    type HubWindow,
    type RunRow,
    type WeightSeries,
    type WorkoutWindow,
} from '@/lib/health/hub-window'
import type { Run } from '@/lib/health/supplement-runs'
import BoardCard, { StripText, stripNumSx, stripWordSx } from 'components/home/board-card'
import { HealthPageHeader } from 'components/health/health-page-layout'
import { PageInfo, PageInfoNote, PageInfoSection } from 'components/page-info'
import { Bone } from 'components/skeleton/bones'
import { SlidingToggle } from 'components/sliding-toggle'

const HEALTH = '/gustavo/health'

export type HubSupplementRuns = { supplementId: number; name: string; runs: Run[] }[]

const WINDOW_PHRASE: Record<HubWindow, string> = { '30d': 'the last 30 days', '90d': 'the last 90 days', '1y': 'the last year' }

// Heatmap cell size per window (1Y stretches to the card's width instead)
const HEAT_CELL: Record<HubWindow, number> = { '30d': 18, '90d': 11, '1y': 0 }
const HEAT_GAP: Record<HubWindow, number> = { '30d': 3, '90d': 3, '1y': 1.5 }
// Card bodies while loading — the loaded bodies' heights, so nothing jumps
const WORKOUTS_BODY_H: Record<HubWindow, number> = { '30d': 159, '90d': 110, '1y': 100 }
const WEIGHT_CHART_H = 96
const RUN_ROW_H = 28

const captionSx = {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.primaryBrown,
    lineHeight: 1.2,
} as const

export function HealthHub({
    window,
    onWindowChange,
    today,
    logDay,
    workoutDates,
    weightLogs,
    supplementRuns,
}: {
    window: HubWindow
    onWindowChange: (window: HubWindow) => void
    /** The device's date — workouts + weight. */
    today: string
    /** The supplements log day (before 6am, still yesterday). */
    logDay: string
    workoutDates: string[] | null
    weightLogs: WeightLog[] | null
    supplementRuns: HubSupplementRuns | null
}) {
    const days = WINDOW_DAYS[window]
    return (
        <>
            <HealthPageHeader
                icon={<IconHeartbeat size={20} stroke={2} color={colors.primaryBlack} />}
                title="Health"
                color={colors.primaryYellow}
                right={
                    <>
                        <SlidingToggle
                            value={window}
                            options={HUB_WINDOWS.map((w) => ({ value: w, label: WINDOW_LABEL[w] }))}
                            onChange={(v) => onWindowChange(v as HubWindow)}
                            borderWidth={1}
                            fontSize={12}
                            paddingY={0.875}
                        />
                        <HubHelp />
                    </>
                }
            />
            <WorkoutsCard window={window} days={days} today={today} dates={workoutDates} />
            <WeightCard window={window} days={days} today={today} logs={weightLogs} />
            <SupplementsCard window={window} days={days} today={logDay} runs={supplementRuns} />
            <MoreRow />
        </>
    )
}

// ── Strip ───────────────────────────────────────────────────────────────────

/** The strip's right side: a number, words, and a › (the strip is a link). */
function StripStat({ label, num, words, wordsColor }: { label: string; num: ReactNode; words?: ReactNode; wordsColor?: string }) {
    return (
        <StripText label={label}>
            <Box component="span" sx={stripNumSx}>
                {num}
            </Box>
            {words != null && (
                <Box component="span" sx={{ ...stripWordSx, ...(wordsColor && { color: wordsColor }) }}>
                    {words}
                </Box>
            )}
            <IconChevronRight size={14} stroke={2.4} style={{ alignSelf: 'center', marginRight: -4 }} />
        </StripText>
    )
}

const chevronOnly = (
    <StripText label="Open">
        <IconChevronRight size={14} stroke={2.4} style={{ alignSelf: 'center', marginRight: -4 }} />
    </StripText>
)

function Stat({ value, label, align }: { value: string; label: string; align: 'start' | 'end' }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: `flex-${align}` }}>
            <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                {value}
            </Typography>
            <Typography sx={{ ...captionSx, whiteSpace: 'nowrap' }}>{label}</Typography>
        </Box>
    )
}

const Empty = ({ children }: { children: ReactNode }) => (
    <Typography sx={{ fontSize: 13, color: colors.primaryBrown, paddingY: 0.5 }}>{children}</Typography>
)

// ── Workouts ────────────────────────────────────────────────────────────────

function WorkoutsCard({ window, days, today, dates }: { window: HubWindow; days: number; today: string; dates: string[] | null }) {
    const win = useMemo(() => (dates ? workoutWindow(dates, today, days) : null), [dates, today, days])
    const stacked = window === '1y'
    return (
        <BoardCard
            href={`${HEALTH}/exercise`}
            headerBg={healthColors.workouts}
            icon={<IconBarbell size={14} stroke={2.3} />}
            title="Workouts"
            right={win ? <StripStat label={`${win.worked} of ${days} days`} num={win.worked} words={`of ${days} days`} /> : chevronOnly}>
            {!win ? (
                <Bone height={WORKOUTS_BODY_H[window]} radius="4px" />
            ) : (
                <Box sx={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', gap: stacked ? 1.25 : 1.5, alignItems: stacked ? 'stretch' : 'flex-start' }}>
                    <Heatmap win={win} window={window} />
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: stacked ? 'row' : 'column',
                            justifyContent: 'space-between',
                            gap: 1.25,
                            marginLeft: stacked ? 0 : 'auto',
                        }}>
                        <Stat value={win.perWeek.toFixed(1)} label="per week" align={stacked ? 'start' : 'end'} />
                        <Stat value={`${win.pct}%`} label="of days" align={stacked ? 'start' : 'end'} />
                        <Stat value={win.worked ? `${win.longestBreak}d` : '—'} label="longest break" align={stacked ? 'start' : 'end'} />
                    </Box>
                </Box>
            )}
        </BoardCard>
    )
}

export function Heatmap({ win, window }: { win: WorkoutWindow; window: HubWindow }) {
    const cols = win.weeks.length
    const cell = HEAT_CELL[window]
    const gap = HEAT_GAP[window]
    const small = window === '1y'
    const columns = `repeat(${cols}, minmax(0, 1fr))`
    return (
        <Box
            role="img"
            aria-label={`Worked out ${win.worked} of the last ${win.days} days`}
            sx={{ width: small ? '100%' : cols * cell + (cols - 1) * gap, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: columns, columnGap: `${gap}px`, height: 12 }}>
                {win.monthLabels.map((m) => (
                    <Typography
                        key={m.col}
                        sx={{ ...captionSx, fontSize: 9, letterSpacing: '0.06em', gridColumn: `${m.col + 1} / span 4`, whiteSpace: 'nowrap' }}>
                        {small ? m.label[0] : m.label}
                    </Typography>
                ))}
            </Box>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: columns,
                    gridTemplateRows: 'repeat(7, auto)',
                    gridAutoFlow: 'column',
                    gap: `${gap}px`,
                }}>
                {win.weeks.flat().map((c) => (
                    <Box
                        key={c.date}
                        sx={{
                            aspectRatio: '1',
                            borderRadius: small ? '1px' : '2px',
                            visibility: c.state === 'pad' ? 'hidden' : undefined,
                            backgroundColor:
                                c.state === 'on' ? (small ? '#e8843f' : workoutColors.fill) : c.state === 'off' ? workoutColors.empty : 'transparent',
                            boxShadow:
                                c.state === 'on' && !small
                                    ? `inset 0 0 0 1px ${workoutColors.deep}`
                                    : c.state === 'future'
                                      ? `inset 0 0 0 1px ${workoutColors.empty}`
                                      : undefined,
                            ...(c.today && { outline: `${small ? 1 : 1.5}px solid ${colors.primaryBlack}`, outlineOffset: small ? 0 : 1 }),
                        }}
                    />
                ))}
            </Box>
        </Box>
    )
}

// ── Weight ──────────────────────────────────────────────────────────────────

function WeightCard({ window, days, today, logs }: { window: HubWindow; days: number; today: string; logs: WeightLog[] | null }) {
    const series = useMemo(() => (logs ? weightSeries(logs, today, days) : null), [logs, today, days])
    // The strip shows your latest weigh-in even when it's outside the window
    const latest = useMemo(() => {
        if (!logs) return null
        let best: WeightLog | null = null
        for (const l of logs) {
            if (l.weightLbs === null || !Number.isFinite(Number(l.weightLbs))) continue
            if (!best || l.date > best.date || (l.date === best.date && l.createdAt > best.createdAt)) best = l
        }
        return best ? Number(best.weightLbs) : null
    }, [logs])

    const delta = series && series.points.length > 1 ? series.delta : null
    const deltaText = delta === null ? undefined : `${delta < 0 ? '▼' : delta > 0 ? '▲' : '±'}${Math.abs(delta).toFixed(1)}`
    return (
        <BoardCard
            href={`${HEALTH}/weight`}
            headerBg={healthColors.weight}
            icon={<IconScale size={14} stroke={2.3} />}
            title="Weight"
            right={
                latest === null ? (
                    chevronOnly
                ) : (
                    <StripStat
                        label={`${latest.toFixed(1)} pounds${deltaText ? `, ${deltaText} over ${WINDOW_PHRASE[window]}` : ''}`}
                        num={latest.toFixed(1)}
                        words={deltaText}
                        wordsColor={delta === null || delta === 0 ? undefined : delta < 0 ? toneColors.positive : toneColors.negative}
                    />
                )
            }>
            {!logs ? (
                <Bone height={WEIGHT_CHART_H} radius="4px" />
            ) : !series ? (
                <Empty>{logs.length ? `No weigh-ins in ${WINDOW_PHRASE[window]}.` : 'No weigh-ins yet.'}</Empty>
            ) : (
                <WeightChart series={series} today={today} days={days} />
            )}
        </BoardCard>
    )
}

const PLOT_PAD_Y = 8
const TICK_GUTTER = 36

export function WeightChart({ series, today, days }: { series: WeightSeries; today: string; days: number }) {
    const [lo, , hi] = series.ticks
    // 0 = top of the plot, 1 = bottom
    const y = (lbs: number) => 1 - (lbs - lo) / (hi - lo)
    const top = (f: number) => `calc(${PLOT_PAD_Y}px + ${f} * (100% - ${PLOT_PAD_Y * 2}px))`
    const months = monthStarts(today, days)
    const points = series.points.map((p) => `${(p.x * 100).toFixed(2)},${(y(p.lbs) * 100).toFixed(2)}`).join(' ')
    return (
        <Box role="img" aria-label="Weight trend" sx={{ position: 'relative', height: WEIGHT_CHART_H, paddingLeft: `${TICK_GUTTER}px` }}>
            {series.ticks.map((t) => (
                <Typography
                    key={t}
                    sx={{
                        position: 'absolute',
                        left: 0,
                        width: TICK_GUTTER - 6,
                        top: top(y(t)),
                        transform: 'translateY(-50%)',
                        textAlign: 'right',
                        fontSize: 9.5,
                        fontWeight: 600,
                        lineHeight: 1,
                        color: colors.primaryBrown,
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                    {t.toFixed(1)}
                </Typography>
            ))}
            <Box sx={{ position: 'relative', height: '100%', marginRight: '5px' }}>
                <Box
                    component="svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    sx={{ position: 'absolute', left: 0, top: PLOT_PAD_Y, width: '100%', height: `calc(100% - ${PLOT_PAD_Y * 2}px)`, overflow: 'visible' }}>
                    {series.ticks.map((t) => (
                        <line key={t} x1={0} x2={100} y1={y(t) * 100} y2={y(t) * 100} stroke="rgba(0,0,0,0.1)" vectorEffect="non-scaling-stroke" />
                    ))}
                    {months.map((m) => (
                        <line key={m.x} x1={m.x * 100} x2={m.x * 100} y1={0} y2={100} stroke="rgba(0,0,0,0.07)" vectorEffect="non-scaling-stroke" />
                    ))}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={weightColors.line}
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </Box>
                <Box
                    sx={{
                        position: 'absolute',
                        left: `${series.last.x * 100}%`,
                        top: top(y(series.last.lbs)),
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: healthColors.weight,
                        border: `1.5px solid ${colors.primaryBlack}`,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            </Box>
        </Box>
    )
}

// ── Supplements ─────────────────────────────────────────────────────────────

function SupplementsCard({ window, days, today, runs }: { window: HubWindow; days: number; today: string; runs: HubSupplementRuns | null }) {
    const rows = useMemo(() => (runs ? runRows(runs, today, days) : null), [runs, today, days])
    const inStack = rows?.filter((r) => r.dayOfRun !== null).length ?? 0
    return (
        <BoardCard
            href={`${HEALTH}/supplements`}
            headerBg={healthColors.supplements}
            icon={<IconPill size={14} stroke={2.3} />}
            title="Supplements"
            right={rows ? <StripStat label={`${inStack} in your stack`} num={inStack} words="in stack" /> : chevronOnly}>
            {!rows ? (
                <Bone height={RUN_ROW_H * 4} radius="4px" />
            ) : rows.length === 0 ? (
                <Empty>Nothing in your daily stack in {WINDOW_PHRASE[window]}.</Empty>
            ) : (
                <RunsChart rows={rows} today={today} days={days} />
            )}
        </BoardCard>
    )
}

export function RunsChart({ rows, today, days }: { rows: RunRow[]; today: string; days: number }) {
    const months = monthStarts(today, days)
    const { fill, fillLight, deep, edge } = supplementColors
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', marginY: -0.5 }}>
            {rows.map((r, i) => {
                const off = r.dayOfRun === null
                return (
                    <Box
                        key={r.supplementId}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '84px minmax(0, 1fr) 50px',
                            columnGap: 1,
                            alignItems: 'center',
                            height: RUN_ROW_H,
                            borderTop: i ? '1px solid rgba(0,0,0,0.12)' : 'none',
                        }}>
                        <Typography noWrap sx={{ fontSize: 13, color: off ? colors.primaryBrown : colors.primaryBlack }}>
                            {r.name}
                        </Typography>
                        <Box sx={{ position: 'relative', height: '100%' }}>
                            {months.map((m) => (
                                <Box key={m.x} sx={{ position: 'absolute', top: 0, bottom: 0, left: `${m.x * 100}%`, borderLeft: '1px dashed rgba(0,0,0,0.14)' }} />
                            ))}
                            {r.bars.map((b) => (
                                <Box
                                    key={b.start}
                                    sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        height: 10,
                                        transform: 'translateY(-50%)',
                                        boxSizing: 'border-box',
                                        left: `min(${b.start * 100}%, calc(100% - 6px))`,
                                        width: `max(6px, ${(b.end - b.start) * 100}%)`,
                                        borderRadius: b.clipped ? '0 5px 5px 0' : '5px',
                                        backgroundColor: b.live ? fill : fillLight,
                                        border: `1.5px solid ${b.live ? deep : edge}`,
                                        ...(b.clipped && { borderLeft: 'none' }),
                                    }}
                                />
                            ))}
                        </Box>
                        <Typography
                            sx={{
                                textAlign: 'right',
                                fontSize: 11,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                fontVariantNumeric: 'tabular-nums',
                                color: off ? colors.primaryBrown : deep,
                            }}>
                            {off ? 'off' : `Day ${r.dayOfRun}`}
                        </Typography>
                    </Box>
                )
            })}
        </Box>
    )
}

// ── More ────────────────────────────────────────────────────────────────────

const MORE = [
    { href: `${HEALTH}/diet`, label: 'Diet', color: healthColors.diet, Icon: IconSalad },
    { href: `${HEALTH}/symptoms`, label: 'Symptoms', color: healthColors.symptoms, Icon: IconFirstAidKit },
    { href: `${HEALTH}/exercises`, label: 'Exercises', color: healthColors.exercises, Icon: IconStretching },
]

/** The pages that don't earn a card: small links, each with its colour tab. */
function MoreRow() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography sx={{ ...captionSx, fontSize: 10.5 }}>More</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                {MORE.map(({ href, label, color, Icon }) => (
                    <Box
                        key={href}
                        component={Link}
                        href={href}
                        sx={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.625,
                            height: 38,
                            paddingLeft: 1.25,
                            paddingRight: 0.75,
                            overflow: 'hidden',
                            borderRadius: '4px',
                            backgroundColor: colors.primaryWhite,
                            color: colors.primaryBlack,
                            textDecoration: 'none',
                            ...hardShadow,
                            ...pressShadowSx,
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 5,
                                backgroundColor: color,
                                borderRight: `1px solid ${colors.primaryBlack}`,
                            },
                        }}>
                        <Icon size={15} stroke={2} style={{ flexShrink: 0 }} />
                        <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 500 }}>
                            {label}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

// ── Help ────────────────────────────────────────────────────────────────────

function HubHelp() {
    return (
        <PageInfo title="How the Health page works">
            <PageInfoSection title="One window for everything">
                30D, 90D or 1Y sets how far back every card looks. It always ends today. Log from Home;
                tap a card&apos;s header to open its page.
            </PageInfoSection>
            <PageInfoSection title="Workouts">
                Each square is a day, orange if you worked out. Columns are weeks, Monday at the top, today
                outlined. <b>Longest break</b> is the most days in a row without a workout.
            </PageInfoSection>
            <PageInfoSection title="Weight">
                Your weigh-ins over the window (weekly averages at 1Y). The change is your latest weigh-in
                against the first one in the window.
            </PageInfoSection>
            <PageInfoSection title="Supplements">
                Each bar is a stretch you had it in your daily stack. <b>Day X</b> is how long the current
                one has lasted; faded bars have ended.
            </PageInfoSection>
            <PageInfoNote>A break of 7+ days without a dose ends a run.</PageInfoNote>
        </PageInfo>
    )
}
