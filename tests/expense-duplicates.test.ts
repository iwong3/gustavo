/**
 * Tests for the add/edit form's "possible duplicate" hint (lib/expense-duplicates.ts).
 */
import { describe, expect, it } from 'vitest'

import { findPossibleDuplicates } from '../lib/expense-duplicates'
import type { Expense } from '../lib/types'

// Only the fields the matcher reads matter; ids are strings like at runtime
const expense = (
    overrides: Omit<Partial<Expense>, 'id'> & { id?: string }
): Expense =>
    ({
        id: '100',
        name: 'Ramen',
        date: '2026-09-25',
        costOriginal: 42.1,
        currency: 'USD',
        ...overrides,
    }) as unknown as Expense

const draft = { cost: 42.1, currency: 'USD', date: '2026-09-25' }

describe('findPossibleDuplicates', () => {
    it('matches same amount + currency on the same day', () => {
        expect(findPossibleDuplicates([expense({})], draft)).toHaveLength(1)
    })

    it('matches within a day either side, not two days out', () => {
        const list = [
            expense({ id: '1', date: '2026-09-24' }),
            expense({ id: '2', date: '2026-09-26' }),
            expense({ id: '3', date: '2026-09-27' }),
        ]
        expect(findPossibleDuplicates(list, draft).map((e) => e.id)).toEqual(['1', '2'])
    })

    it('compares to the cent, ignoring float noise and trailing zeros', () => {
        expect(findPossibleDuplicates([expense({ costOriginal: 42.1 })], { ...draft, cost: 42.10000001 })).toHaveLength(1)
        expect(findPossibleDuplicates([expense({ costOriginal: 42.11 })], draft)).toHaveLength(0)
    })

    it('ignores other currencies', () => {
        expect(findPossibleDuplicates([expense({ currency: 'JPY' })], draft)).toHaveLength(0)
    })

    it('excludes the expense being edited, even across string/number ids', () => {
        expect(findPossibleDuplicates([expense({ id: '100' })], { ...draft, excludeId: 100 })).toHaveLength(0)
    })

    it('returns nothing for an empty or invalid cost', () => {
        expect(findPossibleDuplicates([expense({})], { ...draft, cost: NaN })).toHaveLength(0)
        expect(findPossibleDuplicates([expense({})], { ...draft, cost: 0 })).toHaveLength(0)
    })

    it('skips rows with a null amount (runtime NUMERIC can be null)', () => {
        const bad = expense({ costOriginal: null as unknown as number })
        expect(findPossibleDuplicates([bad], draft)).toHaveLength(0)
    })
})
