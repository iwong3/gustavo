/**
 * Tests for the Supplements page's history model
 * (lib/health/supplement-calendar.ts): what was due on a day, how complete
 * it was, and the stack-change lines/badges.
 */
import { describe, expect, it } from 'vitest'

import type { Supplement, SupplementEvent, SupplementLog } from '../lib/health-types'
import { buildSupplementHistory } from '../lib/health/supplement-calendar'

const supp = (id: number, name: string, dailyDoses: number | null): Supplement => ({
    id,
    name,
    dosage: null,
    isActive: true,
    dailyDoses,
})
let eid = 1
const ev = (supplementId: number, date: string, kind: SupplementEvent['kind'], dailyDoses: number | null = 1): SupplementEvent => ({
    id: eid++,
    supplementId,
    date,
    kind,
    dailyDoses,
    recordedAt: `${date}T12:00:00Z`,
})
let lid = 1
const log = (supplementId: number, date: string, quantity = 1): SupplementLog => ({
    id: lid++,
    supplementId,
    supplementName: '',
    date,
    quantity,
    createdAt: `${date}T12:00:00Z`,
})

// Creatine 1×/day since Sep 1; Omega-3 1× → 2× on Sep 5; Melatonin as needed
const supplements = [supp(1, 'Creatine', 1), supp(2, 'Omega-3', 2), supp(3, 'Melatonin', null)]
const events = [
    ev(1, '2026-09-01', 'started'),
    ev(2, '2026-09-01', 'started', 1),
    ev(2, '2026-09-05', 'dose_changed', 2),
    ev(3, '2026-09-01', 'started', null),
]
const logs = [
    log(1, '2026-09-01'),
    log(2, '2026-09-01'),
    log(1, '2026-09-06'),
    log(2, '2026-09-06', 1), // 1 of 2
    log(3, '2026-09-06'),
    log(1, '2026-09-07'),
    log(2, '2026-09-07', 2),
]
const history = buildSupplementHistory({
    supplements,
    events,
    logs,
    today: '2026-09-07',
    recordedOn: (iso) => iso.slice(0, 10),
})

describe('buildSupplementHistory', () => {
    it('counts only due doses toward a day, using the doses/day then', () => {
        expect(history.summaryOn('2026-09-01')).toMatchObject({ status: 'full', due: 2, taken: 2 })
        expect(history.summaryOn('2026-09-06')).toMatchObject({ status: 'part', due: 3, taken: 2 })
        expect(history.summaryOn('2026-09-07')).toMatchObject({ status: 'full', due: 3, taken: 3 })
        expect(history.summaryOn('2026-09-03').status).toBe('none')
    })

    it('never makes an as-needed supplement due, but lists it when logged', () => {
        const rows = history.rowsOn('2026-09-06')
        expect(rows.map((r) => [r.name, r.due, r.taken])).toEqual([
            ['Creatine', 1, 1],
            ['Melatonin', 0, 1],
            ['Omega-3', 2, 1],
        ])
        expect(history.extrasOn('2026-09-06')).toEqual([])
        expect(history.extrasOn('2026-09-07')).toEqual([{ supplementId: 3, name: 'Melatonin' }])
    })

    it('describes stack changes, and badges only daily supplements', () => {
        expect(history.changesOn('2026-09-01').map((c) => c.text)).toEqual([
            'Started Creatine',
            'Started Omega-3',
        ])
        expect(history.summaryOn('2026-09-01').badge).toBe('+')
        expect(history.changesOn('2026-09-05')).toEqual([
            { kind: 'change', text: 'Omega-3: 1× a day → 2× a day' },
        ])
        expect(history.summaryOn('2026-09-05').badge).toBe('±')
    })

    it('gives Day X for the run on any day', () => {
        expect(history.dayOfRun(1, '2026-09-07')).toBe(7)
        expect(history.firstDay).toBe('2026-09-01')
    })
})
