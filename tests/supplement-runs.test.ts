/**
 * Tests for supplement runs (lib/health/supplement-runs.ts): where "Day X"
 * counts from, when a break ends a run, and the calendar's change badges.
 */
import { describe, expect, it } from 'vitest'

import {
    badgeFor,
    computeRuns,
    dayOfRun,
    stackChanges,
    type RunEvent,
} from '../lib/health/supplement-runs'

/** Every day from `from` to `to`, inclusive (ISO dates). */
function days(from: string, to: string): string[] {
    const out: string[] = []
    const d = new Date(from + 'T00:00:00Z')
    const end = new Date(to + 'T00:00:00Z')
    while (d <= end) {
        out.push(d.toISOString().slice(0, 10))
        d.setUTCDate(d.getUTCDate() + 1)
    }
    return out
}

const started = (date: string, trustedThrough?: string): RunEvent => ({
    date,
    kind: 'started',
    trustedThrough,
})

describe('computeRuns', () => {
    it('runs continuously from a backdated start the user vouched for', () => {
        // Added Sep 20 as "taking since Mar 3", logged daily since
        const runs = computeRuns(
            [started('2026-03-03', '2026-09-20')],
            days('2026-09-20', '2026-09-28'),
            '2026-09-28'
        )
        expect(runs).toEqual([{ start: '2026-03-03', end: null, endReason: null }])
        expect(dayOfRun(runs, '2026-09-28')).toBe(210)
    })

    it('ignores gaps in old, sparse logs from before the start was recorded', () => {
        // The migration seed: first log Mar 14, recorded Sep 28
        const runs = computeRuns(
            [started('2026-03-14', '2026-09-28')],
            ['2026-03-14', '2026-04-02', '2026-06-05', '2026-09-27'],
            '2026-09-28'
        )
        expect(runs).toHaveLength(1)
        expect(runs[0].end).toBeNull()
    })

    it('keeps a run through a missed day or two', () => {
        const doses = days('2026-09-01', '2026-09-28').filter(
            (d) => d !== '2026-09-11' && d !== '2026-09-12'
        )
        const runs = computeRuns([started('2026-09-01')], doses, '2026-09-28')
        expect(runs).toEqual([{ start: '2026-09-01', end: null, endReason: null }])
    })

    it('ends a run after 7 days without a dose and restarts at Day 1', () => {
        // Magnesium: Aug 20 – Sep 3, nothing Sep 4–15 (12 days), back Sep 16
        const runs = computeRuns(
            [started('2026-08-20')],
            [...days('2026-08-20', '2026-09-03'), ...days('2026-09-16', '2026-09-28')],
            '2026-09-28'
        )
        expect(runs).toEqual([
            { start: '2026-08-20', end: '2026-09-03', endReason: 'gap' },
            { start: '2026-09-16', end: null, endReason: null },
        ])
        expect(dayOfRun(runs, '2026-09-28')).toBe(13)
        expect(dayOfRun(runs, '2026-09-10')).toBeNull()
    })

    it('does not end a run at exactly 6 missed days', () => {
        const runs = computeRuns(
            [started('2026-09-01')],
            ['2026-09-01', '2026-09-08'], // 2nd–7th missed = 6 days
            '2026-09-08'
        )
        expect(runs).toHaveLength(1)
        expect(runs[0].end).toBeNull()
    })

    it('ends the current run once today is 7+ days past the last dose', () => {
        const runs = computeRuns([started('2026-09-01')], days('2026-09-01', '2026-09-20'), '2026-09-28')
        expect(runs).toEqual([{ start: '2026-09-01', end: '2026-09-20', endReason: 'gap' }])
        expect(dayOfRun(runs, '2026-09-28')).toBeNull()
    })

    it('closes on Stop and opens a new run when you take it again', () => {
        // Zinc: Apr 1 – Jul 18, stopped; logged again from Sep 22
        const runs = computeRuns(
            [started('2026-04-01'), { date: '2026-07-18', kind: 'stopped' }],
            [...days('2026-04-01', '2026-07-18'), ...days('2026-09-22', '2026-09-28')],
            '2026-09-28'
        )
        expect(runs).toEqual([
            { start: '2026-04-01', end: '2026-07-18', endReason: 'stopped' },
            { start: '2026-09-22', end: null, endReason: null },
        ])
        expect(dayOfRun(runs, '2026-09-28')).toBe(7)
    })
})

describe('stack change badges', () => {
    it('marks run starts, ends and dose changes', () => {
        const events: RunEvent[] = [started('2026-08-20'), { date: '2026-09-10', kind: 'dose_changed' }]
        const runs = computeRuns(
            events,
            [...days('2026-08-20', '2026-09-03'), ...days('2026-09-16', '2026-09-28')],
            '2026-09-28'
        )
        expect(stackChanges(runs, events)).toEqual([
            { date: '2026-08-20', kind: 'add' },
            { date: '2026-09-03', kind: 'remove' },
            { date: '2026-09-16', kind: 'add' },
            { date: '2026-09-10', kind: 'change' },
        ])
    })

    it('shows + for only additions, − for only removals, ± for anything else', () => {
        expect(badgeFor([])).toBeNull()
        expect(badgeFor(['add', 'add'])).toBe('+')
        expect(badgeFor(['remove'])).toBe('−')
        expect(badgeFor(['add', 'remove'])).toBe('±')
        expect(badgeFor(['change'])).toBe('±')
    })
})
