/**
 * Tests for the Workouts page model (lib/health/workout-days.ts): routine
 * labels with extras, one row per date, "days since previous" per label,
 * routine recency, and Sunday-start weeks.
 */
import { describe, expect, it } from 'vitest'

import type { Workout } from '../lib/health-types'
import {
    buildWorkoutDays,
    groupByWeek,
    matchRoutines,
    routineRecency,
    routineStats,
    monthCells,
    addMonths,
    toGroups,
} from '../lib/health/workout-days'

const preset = (id: number, name: string, groups: string[]) => ({
    id,
    name,
    muscleGroups: groups.map((g, i) => ({ id: i + 1, name: g })),
})
const push = preset(1, 'Push', ['Chest', 'Shoulders', 'Triceps'])
const pull = preset(2, 'Pull', ['Lats', 'Biceps', 'Forearms']) // Lats → Upper Back
const jog = preset(3, 'Jogging', ['Cardio', 'Jogging'])
const presets = [push, pull, jog]

let nextId = 1
const w = (date: string, groups: string[]): Workout => ({
    id: nextId++,
    date,
    notes: null,
    muscleGroups: groups.map((name, i) => ({ id: i + 1, name })),
    exercises: [],
    createdAt: date + 'T12:00:00Z',
})

describe('matchRoutines', () => {
    it('labels by routine, with uncovered groups as extras', () => {
        const r = matchRoutines(toGroups(['Upper Back', 'Biceps', 'Forearms', 'Lower Back']), presets)
        expect(r.routines.map((p) => p.name)).toEqual(['Pull'])
        expect(r.extras).toEqual(['Lower Back'])
    })

    it('matches several routines in preset order, and none when incomplete', () => {
        const both = matchRoutines(toGroups(['Cardio', 'Chest', 'Shoulders', 'Triceps']), presets)
        expect(both.routines.map((p) => p.name)).toEqual(['Push', 'Jogging'])
        const partial = matchRoutines(toGroups(['Chest', 'Triceps']), presets)
        expect(partial.routines).toEqual([])
        expect(partial.extras).toEqual(['Chest', 'Triceps'])
    })
})

describe('buildWorkoutDays', () => {
    const days = buildWorkoutDays(
        [
            w('2026-09-18', ['Upper Back', 'Biceps', 'Forearms', 'Lower Back']),
            w('2026-09-16', ['Legs', 'Lower Back']),
            w('2026-09-13', ['Upper Back', 'Biceps', 'Forearms']),
            w('2026-07-09', ['Chest', 'Shoulders', 'Triceps']),
            w('2026-07-09', ['Core']),
        ],
        presets,
    )

    it('merges same-date workouts into one row', () => {
        const jul9 = days.find((d) => d.date === '2026-07-09')!
        expect(days).toHaveLength(4)
        expect(jul9.workouts).toHaveLength(2)
        expect(jul9.routines.map((p) => p.name)).toEqual(['Push'])
        expect(jul9.extras).toEqual(['Core'])
    })

    it('gap = days since the previous workout day', () => {
        expect(days.map((d) => d.gap)).toEqual([2, 3, 66, null])
    })

    it('routineRecency: days since each routine, null when never', () => {
        const rec = routineRecency(days, presets, '2026-09-28')
        expect(rec.get('2')).toBe(10)
        expect(rec.get('1')).toBe(81)
        expect(rec.get('3')).toBeNull()
    })
})

describe('groupByWeek', () => {
    it('makes Sunday-start weeks back to the oldest, empty ones included', () => {
        const days = buildWorkoutDays([w('2026-09-28', ['Cardio']), w('2026-09-13', ['Legs'])], presets)
        const weeks = groupByWeek(days, '2026-09-28')
        expect(weeks.map((wk) => [wk.start, wk.days.length])).toEqual([
            ['2026-09-27', 1],
            ['2026-09-20', 0],
            ['2026-09-13', 1],
        ])
    })

    it('starts at a future-dated workout’s week', () => {
        const weeks = groupByWeek(buildWorkoutDays([w('2026-10-05', ['Legs'])], presets), '2026-09-28')
        expect(weeks.map((wk) => wk.start)).toEqual(['2026-10-04'])
    })
})

describe('routineStats', () => {
    const days = buildWorkoutDays(
        [
            w('2026-09-18', ['Upper Back', 'Biceps', 'Forearms']),
            w('2026-09-13', ['Upper Back', 'Biceps', 'Forearms']),
            w('2026-09-12', ['Cardio']),
            w('2026-09-03', ['Upper Back', 'Biceps', 'Forearms']),
            w('2026-06-01', ['Upper Back', 'Biceps', 'Forearms']),
        ],
        presets,
    )

    it('counts, gaps and since within the window', () => {
        expect(routineStats(days, 2, { from: '2026-08-30', to: '2026-09-28' }, '2026-09-28')).toEqual({ times: 3, avgGap: 7.5, longestGap: 10, since: 10 })
    })

    it('since looks past the window; no gaps with fewer than two', () => {
        expect(routineStats(days, 2, { from: '2026-11-29', to: '2026-12-28' }, '2026-12-28')).toEqual({ times: 0, avgGap: null, longestGap: null, since: 101 })
        expect(routineStats(days, 1, { from: '2026-08-30', to: '2026-09-28' }, '2026-09-28').since).toBeNull()
    })
})

describe('monthCells / addMonths', () => {
    it('pads to whole Sun–Sat weeks and marks future days', () => {
        const { cells } = monthCells('2026-09', '2026-09-28', new Set(['2026-09-28', '2026-09-01']))
        expect(cells).toHaveLength(35) // Aug 30 – Oct 3
        expect(cells[0]).toMatchObject({ date: '2026-08-30', state: 'pad' })
        expect(cells.find((c) => c.date === '2026-09-01')?.state).toBe('on')
        expect(cells.find((c) => c.date === '2026-09-28')).toMatchObject({ state: 'on', today: true })
        expect(cells.find((c) => c.date === '2026-09-29')?.state).toBe('future')
        expect(cells[34]).toMatchObject({ date: '2026-10-03', state: 'pad' })
    })

    it('shifts months across years', () => {
        expect(addMonths('2026-01', -1)).toBe('2025-12')
        expect(addMonths('2026-12', 1)).toBe('2027-01')
    })
})
