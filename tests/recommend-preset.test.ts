/**
 * Tests for the home workout card's "next routine" pick
 * (lib/health/days-since.ts recommendPreset): the routine covering the
 * longest-untrained group wins; targets roll up to groups; never-trained
 * groups don't drive it; nothing is recommended while you're on track.
 */
import { describe, expect, it } from 'vitest'

import { recommendPreset } from '../lib/health/days-since'

const preset = (id: number, name: string, groups: string[]) => ({
    id,
    name,
    muscleGroups: groups.map((g, i) => ({ id: i + 1, name: g })),
})
const ds = (entries: [string, number | null][]) =>
    entries.map(([muscleGroup, daysSince]) => ({ muscleGroup, daysSince }))

const push = preset(1, 'Push Day', ['Chest', 'Shoulders', 'Triceps'])
const pull = preset(2, 'Pull Day', ['Lats', 'Biceps']) // Lats → Upper Back
const legs = preset(3, 'Leg Day', ['Quads', 'Hamstrings']) // → Legs

describe('recommendPreset', () => {
    it('picks the routine covering the most overdue group, via target rollup', () => {
        const days = ds([['Chest', 2], ['Shoulders', 2], ['Triceps', 2], ['Upper Back', 5], ['Biceps', 4], ['Legs', 11]])
        expect(recommendPreset([push, pull, legs], days)?.preset.name).toBe('Leg Day')
        expect(recommendPreset([push, pull, legs], days)?.days).toBe(11)
    })

    it('breaks ties on total days across the routine’s groups', () => {
        const days = ds([['Chest', 6], ['Shoulders', 6], ['Triceps', 6], ['Upper Back', 6], ['Biceps', 1]])
        expect(recommendPreset([pull, push], days)?.preset.name).toBe('Push Day')
    })

    it('ignores never-trained groups and recommends nothing while on track', () => {
        const days = ds([['Chest', 1], ['Shoulders', 3], ['Triceps', 2], ['Legs', null]])
        expect(recommendPreset([push, legs], days)).toBeNull()
        expect(recommendPreset([], days)).toBeNull()
    })
})
