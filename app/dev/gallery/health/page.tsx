'use client'

/** Gallery specimens for the Health hub, workout detail, and the (unused) training grid. */
import { Box } from '@mui/material'
import { useState } from 'react'

import { HealthHub, type HubSupplementRuns } from 'components/health/hub/health-hub'
import TrainingGrid from 'components/health/training-grid'
import type { HubWindow } from '@/lib/health/hub-window'
import { WorkoutDetail } from 'components/health/workout-detail'
import { RotationTiles, WorkoutWeeks } from 'components/health/workout-log'
import { buildWorkoutDays, groupByWeek, routineRecency } from '@/lib/health/workout-days'
import { DAYS_SINCE_ORDER, getParents, isGroup } from '@/lib/health/muscle-groups'
import type { DaysSince, WeightLog, Workout, WorkoutPreset } from '@/lib/health-types'

import { GALLERY_TODAY } from '../fixtures'
import { workout as pushDay, workoutHistory } from '../health-fixtures'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function daysBefore(iso: string, n: number): string {
    const d = new Date(iso + 'T00:00:00')
    d.setDate(d.getDate() - n)
    return toIso(d)
}

function diffDays(fromIso: string, toIsoStr: string): number {
    const a = new Date(fromIso + 'T00:00:00').getTime()
    const b = new Date(toIsoStr + 'T00:00:00').getTime()
    return Math.round((b - a) / 86400000)
}

let seq = 1
/** A workout `n` days before GALLERY_TODAY hitting `groups`. */
function workout(daysAgo: number, groups: string[]): Workout {
    const date = daysBefore(GALLERY_TODAY, daysAgo)
    return {
        id: seq++,
        date,
        notes: null,
        muscleGroups: groups.map((name, i) => ({ id: i + 1, name })),
        exercises: [],
        createdAt: `${date}T18:00:00Z`,
    }
}

/**
 * Derive days-since from the fixture workouts rather than hand-declaring it, so
 * a specimen's dials can never contradict its own grid. Mirrors the endpoint's
 * parent rollup: a target counts for its parent group.
 */
function deriveDaysSince(workouts: Workout[]): DaysSince[] {
    const last = new Map<string, string>()
    for (const w of workouts) {
        const groups = new Set<string>()
        for (const mg of w.muscleGroups) {
            if (isGroup(mg.name)) groups.add(mg.name)
            else for (const parent of getParents(mg.name)) groups.add(parent)
        }
        for (const g of Array.from(groups)) {
            const prev = last.get(g)
            if (!prev || w.date > prev) last.set(g, w.date)
        }
    }
    return DAYS_SINCE_ORDER.map((name) => {
        const lastDate = last.get(name) ?? null
        return {
            muscleGroup: name,
            daysSince: lastDate === null ? null : diffDays(lastDate, GALLERY_TODAY),
            lastDate,
        }
    })
}

// A realistic month: mostly on cadence, with Forearms (9d) and Lower Back (8d)
// left to go cold — the two alert rows.
const typical: Workout[] = [
    workout(0, ['Core']),
    workout(1, ['Shoulders']),
    workout(2, ['Chest', 'Triceps']),
    workout(3, ['Upper Back', 'Biceps', 'Core']),
    workout(4, ['Legs']),
    workout(5, ['Cardio', 'Core']),
    workout(6, ['Chest']),
    workout(7, ['Upper Back', 'Core']),
    workout(8, ['Lower Back', 'Shoulders']),
    workout(9, ['Forearms', 'Triceps', 'Core']),
    workout(10, ['Chest', 'Biceps']),
    workout(11, ['Upper Back', 'Core']),
    workout(12, ['Legs', 'Cardio']),
    workout(13, ['Chest', 'Core']),
    workout(15, ['Lower Back', 'Triceps']),
    workout(16, ['Upper Back', 'Forearms']),
    workout(17, ['Chest', 'Biceps']),
    workout(18, ['Legs']),
    workout(20, ['Upper Back', 'Cardio']),
    workout(22, ['Lower Back', 'Biceps']),
    workout(25, ['Legs']),
]

// Everything inside the 3-day band — no dial is even amber.
const allFresh: Workout[] = [
    workout(0, ['Chest', 'Shoulders', 'Triceps', 'Core']),
    workout(1, ['Upper Back', 'Biceps', 'Forearms']),
    workout(2, ['Legs', 'Lower Back', 'Cardio']),
]

// A few sessions in: five groups touched, five still showing an em-dash.
const gettingStarted: Workout[] = [
    workout(0, ['Chest', 'Core']),
    workout(1, ['Upper Back']),
    workout(4, ['Legs']),
    workout(6, ['Chest', 'Shoulders']),
]

// Only targets logged — proves the rollup fills the parent rows.
const targetsOnly: Workout[] = [
    workout(0, ['Upper Abs']),
    workout(1, ['Lats', 'Rear Delts']),
    workout(3, ['Quads', 'Calves']),
]

// Last session predates the window: the grid is empty but the dials still tell
// the truth (20d, both in alert).
const outOfWindow: Workout[] = [workout(20, ['Chest', 'Legs'])]

// ── Health hub fixtures: ~13 months of history ending GALLERY_TODAY ──
// Workouts most days, with a two-week trip two months back
const hubWorkoutDates = Array.from({ length: 400 }, (_, i) => i)
    .filter((i) => i === 0 || (i > 1 && !(i >= 60 && i < 74) && (i * 7919) % 100 < 52))
    .map((i) => daysBefore(GALLERY_TODAY, i))
// Weighing in ~2 days in 3, drifting down ~6 lb over the year; one null
// reading (a conversion error) proves it's skipped
const hubWeightLogs: WeightLog[] = Array.from({ length: 400 }, (_, i) => i)
    .filter((i) => i === 0 || (i * 104729) % 3 !== 0)
    .map((i) => {
        const date = daysBefore(GALLERY_TODAY, i)
        const lbs = 178.4 + (6.4 * i) / 365 + 0.35 * Math.sin(i * 0.3) + 0.25 * Math.sin(i * 0.09)
        return { id: String(9000 + i) as unknown as number, date, weightLbs: Math.round(lbs * 10) / 10, createdAt: `${date}T07:30:00Z` }
    })
    .concat([{ id: '8999' as unknown as number, date: daysBefore(GALLERY_TODAY, 3), weightLbs: null as unknown as number, createdAt: '2026-07-11T23:00:00Z' }])
const run = (start: string, end: string | null) => ({ start, end, endReason: end ? ('stopped' as const) : null })
const hubRuns: HubSupplementRuns = [
    { supplementId: 1, name: 'Creatine', runs: [run('2026-04-01', '2026-05-20'), run('2026-06-01', null)] },
    { supplementId: 2, name: 'Fish oil', runs: [run('2026-07-05', null)] },
    { supplementId: 3, name: 'Magnesium glycinate', runs: [run('2026-06-20', null)] },
    { supplementId: 4, name: 'Vitamin D', runs: [run('2026-01-10', null)] },
    { supplementId: 5, name: 'Zinc', runs: [run('2026-03-01', '2026-06-10')] },
]

/** The hub at phone width, window toggle live. The page header's negative
 *  margins need the page column's padding around it. */
function HubSpecimen({ initial, loading, empty }: { initial: HubWindow; loading?: boolean; empty?: boolean }) {
    const [window, setWindow] = useState<HubWindow>(initial)
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, paddingX: 2, paddingTop: 2, paddingBottom: 2, backgroundColor: '#fefae0' }}>
            <HealthHub
                window={window}
                onWindowChange={setWindow}
                today={GALLERY_TODAY}
                logDay={GALLERY_TODAY}
                workoutDates={loading ? null : empty ? [] : hubWorkoutDates}
                weightLogs={loading ? null : empty ? [] : hubWeightLogs}
                supplementRuns={loading ? null : empty ? [] : hubRuns}
            />
        </Box>
    )
}

// ── Workouts page fixtures: a Push / Pull / Legs / Jog rotation ──
// String ids (runtime truth). Pull usually brings Lower Back along (an
// extra); a stale same-day pair (days 40) renders as one row; days 22–41
// hold a 3-week break → one "3 weeks off" line.
const routine = (id: string, name: string, groups: string[]): WorkoutPreset => ({
    id: id as unknown as number,
    name,
    muscleGroups: groups.map((g, i) => ({ id: String(i + 1) as unknown as number, name: g })),
    exercises: [],
})
const rotation: WorkoutPreset[] = [
    routine('11', 'Push', ['Chest', 'Shoulders', 'Triceps']),
    routine('12', 'Pull', ['Upper Back', 'Biceps', 'Forearms']),
    routine('13', 'Legs', ['Legs']),
    routine('14', 'Jogging', ['Cardio', 'Jogging']),
    routine('15', 'Core', ['Core']),
]
const PUSH = ['Chest', 'Shoulders', 'Triceps']
const PULL = ['Upper Back', 'Biceps', 'Forearms', 'Lower Back']
const JOG = ['Cardio', 'Jogging']
const logWorkouts: Workout[] = (
    [
        [0, JOG], [10, PULL], [12, ['Legs']], [13, PUSH], [14, JOG], [15, PULL], [16, JOG],
        [18, ['Legs']], [19, PUSH], [20, JOG], [21, [...PULL, ...JOG]],
        [42, PUSH], [42, ['Core']], [44, ['Legs', 'Core']], [45, JOG], [47, PULL], [48, ['Chest']],
    ] as [number, string[]][]
).map(([d, g]) => ({ ...workout(d, g), id: String(7000 + d * 3 + g.length) as unknown as number }))

function WorkoutsLogSpecimen({ applying }: { applying?: boolean }) {
    const days = buildWorkoutDays(logWorkouts, rotation)
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 2, backgroundColor: '#fefae0' }}>
            <RotationTiles
                presets={rotation}
                recency={routineRecency(days, rotation, GALLERY_TODAY)}
                applyingId={applying ? '12' : null}
                onApply={() => {}}
            />
            <WorkoutWeeks
                weeks={groupByWeek(days, GALLERY_TODAY)}
                today={GALLERY_TODAY}
                hrefFor={() => '#'}
                onOpen={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
            />
        </Box>
    )
}

// The width the grid renders at on the home page (content minus its padding).
const HOME_WIDTH = 326

export default function HealthGallery() {
    return (
        <GalleryPage title="Health">
            <SpecimenGroup title="Health hub — /gustavo/health (toggle is live)">
                <Specimen label="30D (the default)" width={375}>
                    <HubSpecimen initial="30d" />
                </Specimen>
                <Specimen label="90D" width={375}>
                    <HubSpecimen initial="90d" />
                </Specimen>
                <Specimen label="1Y" width={375}>
                    <HubSpecimen initial="1y" />
                </Specimen>
                <Specimen label="loading" width={375}>
                    <HubSpecimen initial="30d" loading />
                </Specimen>
                <Specimen label="nothing logged" width={375}>
                    <HubSpecimen initial="30d" empty />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Workouts page — /health/exercise (header + FAB not shown)">
                <Specimen label="rotation tiles + weeks · extras, merged day, weeks off" width={375}>
                    <WorkoutsLogSpecimen />
                </Specimen>
                <Specimen label="logging Pull (other tiles dimmed)" width={375}>
                    <WorkoutsLogSpecimen applying />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Workout detail — /health/exercise/[id] (action bar not shown)">
                <Specimen label="push day · notes, cadence stats, history rows + sparkline">
                    <WorkoutDetail workout={pushDay} allWorkouts={workoutHistory} />
                </Specimen>
                <Specimen label="first-ever session · no history, no notes">
                    <WorkoutDetail
                        workout={{ ...pushDay, id: 1, notes: null }}
                        allWorkouts={[{ ...pushDay, id: 1, notes: null }]}
                    />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Training grid — home Health launcher">
                <Specimen
                    label="typical month · Forearms 9d + Lower Back 8d in alert"
                    width={HOME_WIDTH}>
                    <TrainingGrid
                        workouts={typical}
                        daysSince={deriveDaysSince(typical)}
                        todayIso={GALLERY_TODAY}
                    />
                </Specimen>
                <Specimen label="everything on cadence — no alerts" width={HOME_WIDTH}>
                    <TrainingGrid
                        workouts={allFresh}
                        daysSince={deriveDaysSince(allFresh)}
                        todayIso={GALLERY_TODAY}
                    />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Early and empty states">
                <Specimen
                    label="a few workouts in — untouched groups grey, not red"
                    width={HOME_WIDTH}>
                    <TrainingGrid
                        workouts={gettingStarted}
                        daysSince={deriveDaysSince(gettingStarted)}
                        todayIso={GALLERY_TODAY}
                    />
                </Specimen>
                <Specimen label="nothing logged — empty grid + call to action" width={HOME_WIDTH}>
                    <TrainingGrid workouts={[]} daysSince={deriveDaysSince([])} todayIso={GALLERY_TODAY} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Edge cases">
                <Specimen
                    label="targets only (Lats, Quads, Upper Abs) — rolls up to parent rows"
                    width={HOME_WIDTH}>
                    <TrainingGrid
                        workouts={targetsOnly}
                        daysSince={deriveDaysSince(targetsOnly)}
                        todayIso={GALLERY_TODAY}
                    />
                </Specimen>
                <Specimen
                    label="trained recently but nothing in-window — honest dials, empty grid"
                    width={HOME_WIDTH}>
                    <TrainingGrid
                        workouts={outOfWindow}
                        daysSince={deriveDaysSince(outOfWindow)}
                        todayIso={GALLERY_TODAY}
                    />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
