/**
 * Tests for logDateString (app/utils/time.ts): the day a check-off counts
 * for. Before 6am it's still yesterday, so a 1am supplement dose lands on
 * the night it belongs to. Dates are built in local time, like the device.
 */
import { describe, expect, it } from 'vitest'

import { logDateString } from '../app/utils/time'

const at = (y: number, m: number, d: number, h: number, min = 0) =>
    new Date(y, m - 1, d, h, min)

describe('logDateString', () => {
    it('is the calendar date from 6am on', () => {
        expect(logDateString(at(2026, 5, 25, 6, 0))).toBe('2026-05-25')
        expect(logDateString(at(2026, 5, 25, 23, 59))).toBe('2026-05-25')
    })

    it('is still the previous day between midnight and 6am', () => {
        expect(logDateString(at(2026, 5, 25, 0, 0))).toBe('2026-05-24')
        expect(logDateString(at(2026, 5, 25, 1, 30))).toBe('2026-05-24')
        expect(logDateString(at(2026, 5, 25, 5, 59))).toBe('2026-05-24')
    })

    it('rolls back across month and year boundaries', () => {
        expect(logDateString(at(2026, 3, 1, 2))).toBe('2026-02-28')
        expect(logDateString(at(2027, 1, 1, 1))).toBe('2026-12-31')
    })
})
