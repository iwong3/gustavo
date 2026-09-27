/**
 * Display names for people keyed by id (app/utils/person-labels.ts): first
 * names, disambiguated only when two people share one.
 */
import { describe, expect, it } from 'vitest'

import { personLabels } from '../app/utils/person-labels'

describe('personLabels', () => {
    it('uses the first name when it is unique', () => {
        const labels = personLabels([
            { id: '1', name: 'Ivan Wong', firstName: 'Ivan' },
            { id: '2', name: 'Jenny Lee', firstName: 'Jenny' },
        ])
        expect(labels.get('1')).toBe('Ivan')
        expect(labels.get('2')).toBe('Jenny')
    })

    it('adds a last initial when two people share a first name', () => {
        const labels = personLabels([
            { id: '3', name: 'Alex Chen', firstName: 'Alex' },
            { id: 4, name: 'Alex Park', firstName: 'Alex' },
            { id: '5', name: 'Marco Rossi', firstName: 'Marco' },
        ])
        expect(labels.get('3')).toBe('Alex C.')
        expect(labels.get('4')).toBe('Alex P.')
        expect(labels.get('5')).toBe('Marco')
    })

    it('numbers people when even the initial collides', () => {
        const labels = personLabels([
            { id: '6', name: 'Sam Smith', firstName: 'Sam' },
            { id: '7', name: 'Sam Stone', firstName: 'Sam' },
            { id: '8', name: 'Sam', firstName: 'Sam' },
        ])
        expect(labels.get('6')).toBe('Sam S.')
        expect(labels.get('7')).toBe('Sam S. (2)')
        expect(labels.get('8')).toBe('Sam')
    })
})
