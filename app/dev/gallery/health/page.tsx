'use client'

/** Gallery specimens for the home Health launcher — every recency state + empty cases. */
import TrainingGrid from 'components/health/training-grid'
import { DAYS_SINCE_ORDER, getParents, isGroup } from '@/lib/health/muscle-groups'
import type { DaysSince, Workout } from '@/lib/health-types'

import { GALLERY_TODAY } from '../fixtures'
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

// The width the grid renders at on the home page (content minus its padding).
const HOME_WIDTH = 326

export default function HealthGallery() {
    return (
        <GalleryPage title="Health">
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
