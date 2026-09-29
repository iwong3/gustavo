/**
 * Tests for the Health hub's rolling windows (lib/health/hub-window.ts): the
 * workout heatmap's week layout + stats, the weight series, and which
 * supplement runs land in the window.
 */
import { describe, expect, it } from 'vitest'

import { runRows, weightSeries, workoutWindow } from '../lib/health/hub-window'

// A Monday; its 30-day window opens on Sunday 2026-08-30
const TODAY = '2026-09-28'

describe('workoutWindow', () => {
    it('lays the window out in Mon→Sun weeks, padded before and after', () => {
        const w = workoutWindow(['2026-09-28', '2026-09-26', '2026-09-20', '2026-08-01'], TODAY, 30)
        expect(w.worked).toBe(3)
        expect(w.weeks).toHaveLength(6)
        expect(w.weeks[0].slice(0, 6).every((c) => c.state === 'pad')).toBe(true)
        expect(w.weeks[0][6]).toMatchObject({ date: '2026-08-30', state: 'off' })
        const last = w.weeks[5]
        expect(last[0]).toMatchObject({ date: TODAY, state: 'on', today: true })
        expect(last.slice(1).every((c) => c.state === 'future')).toBe(true)
        expect(last[6].date).toBe('2026-10-04')
        expect(w.pct).toBe(10)
        expect(w.perWeek).toBe(0.7)
    })

    it("doesn't count today as a break day until it's over", () => {
        expect(workoutWindow(['2026-08-30', '2026-09-27'], TODAY, 30).longestBreak).toBe(27)
        expect(workoutWindow([], TODAY, 30).longestBreak).toBe(29)
    })

    it('labels months where they start, dropping a crowded opening label', () => {
        // Sep 1 is in the second column, too close to the window-opening "Aug"
        expect(workoutWindow([], TODAY, 30).monthLabels).toEqual([{ col: 1, label: 'Sep' }])
        const labels = workoutWindow([], TODAY, 90).monthLabels.map((m) => m.label)
        expect(labels).toEqual(['Jul', 'Aug', 'Sep'])
    })
})

describe('weightSeries', () => {
    it('keeps the last reading per day inside the window', () => {
        const s = weightSeries(
            [
                { date: '2026-08-01', weightLbs: 190 }, // before the window
                { date: '2026-09-01', weightLbs: 181, createdAt: '2026-09-01T08:00:00Z' },
                { date: '2026-09-01', weightLbs: 180, createdAt: '2026-09-01T09:00:00Z' },
                { date: '2026-09-10', weightLbs: null },
                { date: TODAY, weightLbs: '178.5' },
            ],
            TODAY,
            30
        )
        expect(s?.points.map((p) => p.lbs)).toEqual([180, 178.5])
        expect(s?.last).toEqual({ x: 1, lbs: 178.5 })
        expect(s?.delta).toBeCloseTo(-1.5)
        expect(s?.ticks).toEqual([178.5, 179.25, 180])
    })

    it('averages by week over long windows, ending on the latest reading', () => {
        const logs = Array.from({ length: 300 }, (_, i) => {
            const d = new Date(Date.UTC(2026, 8, 28 - i))
            return { date: d.toISOString().slice(0, 10), weightLbs: 178 + i / 50 }
        })
        const s = weightSeries(logs, TODAY, 365)
        expect(s!.points.length).toBeLessThan(60)
        expect(s!.points[s!.points.length - 1]).toEqual({ x: 1, lbs: 178 })
    })

    it('is null with no readings in the window', () => {
        expect(weightSeries([{ date: '2025-01-01', weightLbs: 180 }], TODAY, 30)).toBeNull()
    })
})

describe('runRows', () => {
    const supplements = [
        { supplementId: 1, name: 'Zinc', runs: [{ start: '2026-06-10', end: '2026-08-12', endReason: 'stopped' as const }] },
        { supplementId: 2, name: 'Creatine', runs: [{ start: '2026-07-23', end: null, endReason: null }] },
        { supplementId: 3, name: 'Fish oil', runs: [{ start: '2026-09-17', end: null, endReason: null }] },
        { supplementId: 4, name: 'Iron', runs: [{ start: '2025-01-01', end: '2025-02-01', endReason: 'gap' as const }] },
    ]

    it('lists current runs longest first, then stopped ones, skipping runs outside the window', () => {
        const rows = runRows(supplements, TODAY, 90)
        expect(rows.map((r) => r.name)).toEqual(['Creatine', 'Fish oil', 'Zinc'])
        expect(rows.map((r) => r.dayOfRun)).toEqual([68, 12, null])
    })

    it('clips runs that began before the window', () => {
        const zinc = runRows(supplements, TODAY, 90).find((r) => r.name === 'Zinc')!
        expect(zinc.bars[0]).toMatchObject({ start: 0, clipped: true, live: false })
        expect(runRows(supplements, TODAY, 30).map((r) => r.name)).toEqual(['Creatine', 'Fish oil'])
    })
})
