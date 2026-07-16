/**
 * Tests for the area rule in lib/place-display.ts.
 *
 * Worth testing because Google's address-component names mean opposite things
 * per country: in Japan `locality` is the ward and the city lives in
 * administrative_area_level_1; in the US `locality` is the city and admin_1 is
 * the state (which must never reach the UI). The fixtures below are shaped like
 * real Google responses for those cases.
 */
import { describe, expect, it } from 'vitest'

import {
    derivePlaceArea,
    derivePlaceCity,
    formatPlaceArea,
    formatPriceRange,
    formatRating,
} from '../lib/place-display'
import type { AddressComponent } from '../lib/types'

const comp = (longText: string, types: string[], shortText = longText): AddressComponent => ({
    longText,
    shortText,
    types,
})

// Ichiran Shibuya — 1-22-7 Jinnan, Shibuya City, Tokyo
const tokyo: AddressComponent[] = [
    comp('Jinnan', ['sublocality_level_2', 'sublocality', 'political']),
    comp('Shibuya City', ['locality', 'political']),
    comp('Tokyo', ['administrative_area_level_1', 'political'], 'Tokyo'),
    comp('Japan', ['country', 'political'], 'JP'),
]

// A Manhattan restaurant
const manhattan: AddressComponent[] = [
    comp('Manhattan', ['sublocality_level_1', 'sublocality', 'political']),
    comp('New York', ['locality', 'political']),
    comp('New York', ['administrative_area_level_1', 'political'], 'NY'),
    comp('United States', ['country', 'political'], 'US'),
]

// Small US town — no sublocality at all
const napa: AddressComponent[] = [
    comp('Napa', ['locality', 'political']),
    comp('California', ['administrative_area_level_1', 'political'], 'CA'),
    comp('United States', ['country', 'political'], 'US'),
]

// Kyoto — locality and prefecture are the same word
const kyoto: AddressComponent[] = [
    comp('Kyoto', ['locality', 'political']),
    comp('Kyoto', ['administrative_area_level_1', 'political'], 'Kyoto'),
    comp('Japan', ['country', 'political'], 'JP'),
]

describe('derivePlaceArea', () => {
    it('reads the ward out of locality in Japan, city out of admin_1', () => {
        expect(derivePlaceArea(tokyo)).toEqual({ fine: 'Shibuya', coarse: 'Tokyo' })
    })

    it('strips the "City"/"Ward" suffix Google adds to Tokyo wards', () => {
        expect(formatPlaceArea(tokyo)).toBe('Shibuya, Tokyo')
    })

    it('reads sublocality + locality in the US, never the state', () => {
        expect(formatPlaceArea(manhattan)).toBe('Manhattan, New York')
    })

    it('falls back to just the city when there is no finer area', () => {
        // "Napa, California" would be the naive result — the state is noise.
        expect(derivePlaceArea(napa)).toEqual({ fine: 'Napa', coarse: null })
        expect(formatPlaceArea(napa)).toBe('Napa')
    })

    it('collapses duplicate levels', () => {
        expect(formatPlaceArea(kyoto)).toBe('Kyoto')
    })

    it('handles missing/empty components (pre-00039 places)', () => {
        expect(derivePlaceArea(null)).toEqual({ fine: null, coarse: null })
        expect(formatPlaceArea([])).toBeNull()
    })
})

describe('derivePlaceCity', () => {
    it('keeps trip locations city-level, not neighborhood-level', () => {
        expect(derivePlaceCity(tokyo)).toBe('Tokyo')
        expect(derivePlaceCity(manhattan)).toBe('New York')
        expect(derivePlaceCity(napa)).toBe('Napa')
    })
})

describe('formatPriceRange', () => {
    it('shows the symbol once across the range', () => {
        expect(
            formatPriceRange({
                startPrice: { currencyCode: 'JPY', units: '1000' },
                endPrice: { currencyCode: 'JPY', units: '2000' },
            })
        ).toBe('¥1,000–2,000')
    })

    it('handles open-ended and missing ranges', () => {
        expect(
            formatPriceRange({ startPrice: { currencyCode: 'USD', units: '10' } })
        ).toBe('$10+')
        expect(formatPriceRange(null)).toBeNull()
        expect(formatPriceRange({})).toBeNull()
    })

    it('never emits NaN for a malformed units string', () => {
        expect(
            formatPriceRange({ startPrice: { currencyCode: 'USD', units: 'oops' } })
        ).toBeNull()
    })
})

describe('formatRating', () => {
    it('pairs the rating with its count', () => {
        expect(formatRating(4.6, 2431)).toBe('4.6★ (2,431)')
    })

    it('omits the count when unknown, and the whole thing without a rating', () => {
        expect(formatRating(4.6, null)).toBe('4.6★')
        expect(formatRating(null, 2431)).toBeNull()
    })
})
