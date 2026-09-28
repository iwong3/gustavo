/**
 * Tests for the home greeting's quote handling (lib/quotes.ts): picking the
 * shortest usable quote from an API batch, and the built-in fallback staying
 * the same all day.
 */
import { describe, expect, it } from 'vitest'

import { FALLBACK_QUOTES, MAX_QUOTE_LENGTH, fallbackQuote, pickShortQuote } from '../lib/quotes'

describe('pickShortQuote', () => {
    it('returns the shortest quote that fits', () => {
        const batch = [
            { quote: 'A much longer line than the other one here.', author: 'Walter White' },
            { quote: 'Say my name.', author: 'Walter White' },
        ]
        expect(pickShortQuote(batch)?.quote).toBe('Say my name.')
    })

    it('skips over-long, empty and malformed entries; null when nothing fits', () => {
        const long = 'x'.repeat(MAX_QUOTE_LENGTH + 1)
        expect(pickShortQuote([{ quote: long, author: 'A' }, { quote: ' ', author: 'B' }, { nope: 1 }])).toBeNull()
        expect(pickShortQuote('not an array')).toBeNull()
        expect(pickShortQuote([])).toBeNull()
    })
})

describe('fallbackQuote', () => {
    it('is stable for a day and always one of the built-in quotes', () => {
        expect(fallbackQuote('2026-09-28')).toEqual(fallbackQuote('2026-09-28'))
        expect(FALLBACK_QUOTES).toContainEqual(fallbackQuote('2026-01-01'))
        expect(FALLBACK_QUOTES.every((q) => q.quote.length <= MAX_QUOTE_LENGTH)).toBe(true)
    })
})
