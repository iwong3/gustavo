/**
 * Tests for the daily supplement stack (lib/health/supplement-stack.ts): which
 * supplements are in it, and the dose math the home page applies
 * optimistically before the server's atomic +1 / −1 lands.
 */
import { describe, expect, it } from 'vitest'

import {
    addDose,
    buildStack,
    isDone,
    isValidDailyDoses,
    removeDose,
} from '../lib/health/supplement-stack'
import type { Supplement, SupplementLog } from '../lib/health-types'

const DAY = '2026-09-27'

const supp = (id: number, name: string, dailyDoses: number | null, isActive = true): Supplement => ({
    id,
    name,
    dosage: null,
    isActive,
    dailyDoses,
})

const log = (id: number, supplementId: number, quantity: number, date = DAY): SupplementLog => ({
    id,
    supplementId,
    supplementName: `s${supplementId}`,
    date,
    quantity,
    createdAt: '',
})

describe('buildStack', () => {
    it('keeps only active supplements with doses set, alphabetically, with today’s progress', () => {
        const stack = buildStack(
            [
                supp(1, 'Zinc', 1),
                supp(2, 'Fish oil', 2),
                supp(3, 'Magnesium', null), // not in the stack
                supp(4, 'Creatine', 1, false), // inactive
            ],
            // Ids arrive as strings at runtime — must still match
            [{ ...log(9, 2, 1), supplementId: '2' as unknown as number }]
        )
        expect(stack.map((s) => [s.name, s.taken, s.dosesPerDay])).toEqual([
            ['Fish oil', 1, 2],
            ['Zinc', 0, 1],
        ])
        expect(stack.map(isDone)).toEqual([false, false])
    })
})

describe('addDose / removeDose', () => {
    it('creates the day’s row, then counts up', () => {
        const one = addDose([], { id: 2, name: 'Fish oil' }, DAY, -1)
        expect(one).toHaveLength(1)
        expect(one[0].quantity).toBe(1)
        const two = addDose(one, { id: 2, name: 'Fish oil' }, DAY, -2)
        expect(two).toHaveLength(1)
        expect(two[0].quantity).toBe(2)
    })

    it('ignores other days and supplements', () => {
        const logs = [log(1, 2, 1, '2026-09-26'), log(2, 3, 1)]
        const next = addDose(logs, { id: 2, name: 'Fish oil' }, DAY, -1)
        expect(next).toHaveLength(3)
        expect(next.slice(0, 2)).toEqual(logs)
    })

    it('counts down, and removes the row at zero', () => {
        const logs = [log(1, 2, 2)]
        const once = removeDose(logs, 2, DAY)
        expect(once[0].quantity).toBe(1)
        expect(removeDose(once, 2, DAY)).toEqual([])
        expect(removeDose([], 2, DAY)).toEqual([])
    })
})

describe('isValidDailyDoses', () => {
    it('accepts null and 1–12 whole numbers only', () => {
        expect([null, 1, 4, 12].every(isValidDailyDoses)).toBe(true)
        expect([0, -1, 13, 1.5, '2', undefined].some(isValidDailyDoses)).toBe(false)
    })
})
