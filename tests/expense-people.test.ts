/**
 * Tests for resolving an expense's people (lib/expense-people.ts): payer,
 * split and covered must only ever be people on the trip. The old code
 * matched first names across every user in the app, so a same-named user
 * anywhere could join a split or become the payer.
 */
import { describe, expect, it } from 'vitest'

import {
    effectiveCovered,
    ExpensePeopleError,
    resolveExpensePeople,
    type RosterEntry,
} from '../lib/expense-people'

const roster: RosterEntry[] = [
    { id: '1', firstName: 'Ivan', active: true },
    { id: '2', firstName: 'Jenny', active: true },
    { id: '3', firstName: 'Alex', active: true },
    { id: '4', firstName: 'Alex', active: true },
    { id: '5', firstName: 'Marco', active: false }, // left the trip
]

describe('resolveExpensePeople — ids (the current form)', () => {
    it('keeps ids that are on the trip, as strings', () => {
        const r = resolveExpensePeople(roster, {
            paid_by_id: 1,
            split_between_ids: ['1', 3, '4'],
            covered_participant_ids: ['4'],
        })
        expect(r.payerId).toBe('1')
        expect(r.participantIds).toEqual(['1', '3', '4'])
        expect(Array.from(r.coveredIds!)).toEqual(['4'])
    })

    it('tells two people with the same first name apart', () => {
        const r = resolveExpensePeople(roster, { split_between_ids: ['3'], covered_participant_ids: ['3'] })
        expect(r.participantIds).toEqual(['3'])
        expect(Array.from(r.coveredIds!)).toEqual(['3'])
    })

    it('rejects anyone not on the trip', () => {
        expect(() => resolveExpensePeople(roster, { paid_by_id: '99' })).toThrow(ExpensePeopleError)
        expect(() => resolveExpensePeople(roster, { split_between_ids: ['1', '99'] })).toThrow(ExpensePeopleError)
        expect(() =>
            resolveExpensePeople(roster, { split_between_ids: ['1'], covered_participant_ids: ['99'] })
        ).toThrow(ExpensePeopleError)
    })

    it('"Everyone" means everyone still on the trip', () => {
        const r = resolveExpensePeople(roster, { split_everyone: true })
        expect(r.participantIds).toEqual(['1', '2', '3', '4'])
    })

    it('rejects an empty split', () => {
        expect(() => resolveExpensePeople(roster, { split_between_ids: [] })).toThrow(ExpensePeopleError)
    })

    it('re-sending the split with nobody covered clears the covered list', () => {
        const r = resolveExpensePeople(roster, { split_between_ids: ['1', '2'] })
        expect(r.coveredIds!.size).toBe(0)
    })

    it('leaves people alone when the body names none (a name-only edit)', () => {
        const r = resolveExpensePeople(roster, {})
        expect(r).toEqual({})
    })
})

describe('resolveExpensePeople — first names (older cached clients)', () => {
    it('matches names against this trip only', () => {
        const r = resolveExpensePeople(roster, {
            paid_by: 'Ivan',
            split_between: ['Ivan', 'Jenny'],
            covered_participants: ['Jenny'],
        })
        expect(r.payerId).toBe('1')
        expect(r.participantIds).toEqual(['1', '2'])
        expect(Array.from(r.coveredIds!)).toEqual(['2'])
    })

    it('keeps the legacy ["Everyone"] split', () => {
        const r = resolveExpensePeople(roster, { split_between: ['Everyone'] })
        expect(r.participantIds).toEqual(['1', '2', '3', '4'])
    })

    it('refuses to guess between two people with the same first name', () => {
        expect(() => resolveExpensePeople(roster, { paid_by: 'Alex' })).toThrow(/Two people on this trip are named Alex/)
        expect(() => resolveExpensePeople(roster, { split_between: ['Ivan', 'Alex'] })).toThrow(ExpensePeopleError)
    })

    it('rejects names that are not on the trip', () => {
        expect(() => resolveExpensePeople(roster, { split_between: ['Ivan', 'Zoe'] })).toThrow(ExpensePeopleError)
    })
})

describe('effectiveCovered', () => {
    it('drops anyone not in the split, and the payer', () => {
        const covered = effectiveCovered(new Set(['1', '2', '4']), ['1', '2', '3'], '1')
        expect(Array.from(covered)).toEqual(['2'])
    })
})
