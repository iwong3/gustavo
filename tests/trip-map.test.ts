/**
 * Tests for the city aggregation in lib/trip-map.ts.
 *
 * The map draws one dot per city, deduped across trips. Worth testing because
 * the bucketing has three easy-to-break rules: cities come from the per-country
 * area logic (derivePlaceCity), the dot's coordinate is the mean of DISTINCT
 * places (so a place reused on two trips can't drag the centroid), and the same
 * city on two trips must collapse to one dot while keeping both trips.
 */
import { describe, expect, it } from 'vitest'

import {
    aggregateTripMapCities,
    aggregateTripMapPlaces,
    summarizeTripMap,
    type TripMapPlace,
} from '../lib/trip-map'
import type { AddressComponent } from '../lib/types'

const comp = (longText: string, types: string[], shortText = longText): AddressComponent => ({
    longText,
    shortText,
    types,
})

// Ward-as-locality, prefecture-as-admin_1 → city is "Tokyo".
const tokyo: AddressComponent[] = [
    comp('Jinnan', ['sublocality_level_1', 'sublocality', 'political']),
    comp('Shibuya City', ['locality', 'political']),
    comp('Tokyo', ['administrative_area_level_1', 'political'], 'Tokyo'),
    comp('Japan', ['country', 'political'], 'JP'),
]

// locality-as-city → city is "New York".
const manhattan: AddressComponent[] = [
    comp('Manhattan', ['sublocality_level_1', 'sublocality', 'political']),
    comp('New York', ['locality', 'political']),
    comp('New York', ['administrative_area_level_1', 'political'], 'NY'),
    comp('United States', ['country', 'political'], 'US'),
]

const place = (over: Partial<TripMapPlace>): TripMapPlace => ({
    googlePlaceId: 'p1',
    name: 'Somewhere',
    lat: 0,
    lng: 0,
    addressComponents: null,
    tripId: '1',
    tripName: 'Trip One',
    tripSlug: 'trip-one',
    tripStart: '2025-01-01',
    tripEnd: '2025-01-05',
    locationName: null,
    spendUsd: 0,
    ...over,
})

describe('aggregateTripMapCities', () => {
    it('buckets places in the same city into one dot, averaging coords and summing spend', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', lat: 35.66, lng: 139.7, addressComponents: tokyo, spendUsd: 40 }),
            place({ googlePlaceId: 'b', lat: 35.7, lng: 139.76, addressComponents: tokyo, spendUsd: 60 }),
        ])
        expect(cities).toHaveLength(1)
        expect(cities[0].city).toBe('Tokyo')
        expect(cities[0].countryCode).toBe('JP')
        expect(cities[0].placeCount).toBe(2)
        expect(cities[0].totalSpendUsd).toBe(100)
        expect(cities[0].lat).toBeCloseTo(35.68, 5)
        expect(cities[0].lng).toBeCloseTo(139.73, 5)
    })

    it('collapses the same city across trips into one dot but keeps both trips', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', addressComponents: tokyo, tripId: '1', tripSlug: 'osaka-spring' }),
            place({ googlePlaceId: 'b', addressComponents: tokyo, tripId: '2', tripSlug: 'winter-japan' }),
        ])
        expect(cities).toHaveLength(1)
        expect(cities[0].trips.map((t) => t.id).sort()).toEqual(['1', '2'])
    })

    it('keeps cities in different countries separate', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', addressComponents: tokyo }),
            place({ googlePlaceId: 'b', addressComponents: manhattan }),
        ])
        expect(cities).toHaveLength(2)
        expect(cities.map((c) => c.city).sort()).toEqual(['New York', 'Tokyo'])
    })

    it('averages one point per distinct place, not per (place, trip) row', () => {
        // Place "a" appears on two trips (two rows, same coords); "b" once.
        // Centroid must count "a" once → mean of (0,0) and (10,10) = (5,5).
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', lat: 0, lng: 0, addressComponents: tokyo, tripId: '1' }),
            place({ googlePlaceId: 'a', lat: 0, lng: 0, addressComponents: tokyo, tripId: '2' }),
            place({ googlePlaceId: 'b', lat: 10, lng: 10, addressComponents: tokyo, tripId: '1' }),
        ])
        expect(cities).toHaveLength(1)
        expect(cities[0].placeCount).toBe(2)
        expect(cities[0].lat).toBeCloseTo(5, 5)
        expect(cities[0].lng).toBeCloseTo(5, 5)
    })

    it('buckets a geocoded location row (explicit countryCode) with place rows of the same city', () => {
        // Japan 2024 has no Google places — its expenses arrive as one
        // location row per (location, trip) with countryCode stored directly.
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', addressComponents: tokyo, spendUsd: 40, tripId: '1' }),
            place({
                googlePlaceId: 'loc:7',
                name: 'Tokyo',
                locationName: 'Tokyo',
                addressComponents: null,
                countryCode: 'JP',
                spendUsd: 60,
                tripId: '2',
            }),
        ])
        expect(cities).toHaveLength(1)
        expect(cities[0].city).toBe('Tokyo')
        expect(cities[0].countryCode).toBe('JP')
        expect(cities[0].totalSpendUsd).toBe(100)
        expect(cities[0].trips.map((t) => t.id).sort()).toEqual(['1', '2'])
    })

    it('keeps a location-only city separate from a same-named city in another country', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'loc:1', name: 'Vancouver', locationName: 'Vancouver', countryCode: 'CA' }),
            place({ googlePlaceId: 'loc:2', name: 'Vancouver', locationName: 'Vancouver', countryCode: 'US' }),
        ])
        expect(cities).toHaveLength(2)
    })

    it('groups by the location name when there are no address components', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', name: 'H Mart', addressComponents: null, locationName: 'San Francisco' }),
            place({ googlePlaceId: 'b', name: 'Philz', addressComponents: null, locationName: 'San Francisco' }),
        ])
        expect(cities).toHaveLength(1)
        expect(cities[0].city).toBe('San Francisco')
    })

    it('falls back to the place name when there is neither components nor a location', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', name: 'Mystery Bar', addressComponents: null, locationName: null }),
        ])
        expect(cities).toHaveLength(1)
        expect(cities[0].city).toBe('Mystery Bar')
        expect(cities[0].countryCode).toBeNull()
    })

    it('skips rows with non-finite coordinates', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', lat: NaN, lng: NaN, addressComponents: tokyo }),
        ])
        expect(cities).toHaveLength(0)
    })

    it('sorts cities by spend, biggest first', () => {
        const cities = aggregateTripMapCities([
            place({ googlePlaceId: 'a', addressComponents: tokyo, spendUsd: 10 }),
            place({ googlePlaceId: 'b', addressComponents: manhattan, spendUsd: 90 }),
        ])
        expect(cities.map((c) => c.city)).toEqual(['New York', 'Tokyo'])
    })
})

describe('aggregateTripMapPlaces', () => {
    it('keeps one dot per distinct place, not squashed by city', () => {
        const places = aggregateTripMapPlaces([
            place({ googlePlaceId: 'a', name: 'Ichiran', addressComponents: tokyo, spendUsd: 40 }),
            place({ googlePlaceId: 'b', name: 'Uobei', addressComponents: tokyo, spendUsd: 60 }),
        ])
        expect(places).toHaveLength(2)
        expect(places.map((p) => p.city).sort()).toEqual(['Ichiran', 'Uobei'])
    })

    it('sums spend across trips for one place', () => {
        const places = aggregateTripMapPlaces([
            place({ googlePlaceId: 'a', name: 'Ichiran', tripId: '1', spendUsd: 40 }),
            place({ googlePlaceId: 'a', name: 'Ichiran', tripId: '2', spendUsd: 25 }),
        ])
        expect(places).toHaveLength(1)
        expect(places[0].totalSpendUsd).toBe(65)
        expect(places[0].trips.map((t) => t.id).sort()).toEqual(['1', '2'])
    })
})

describe('summarizeTripMap', () => {
    it('counts location-dot countries and trips, but not their placeCount', () => {
        // Location rows feed cities only (the route never passes them to
        // aggregateTripMapPlaces) — so KR counts as a country, the trip counts,
        // but the Places stat stays venues-only.
        const placeRows = [place({ googlePlaceId: 'a', addressComponents: tokyo, tripId: '1' })]
        const locRows = [
            place({ googlePlaceId: 'loc:9', name: 'Seoul', locationName: 'Seoul', countryCode: 'KR', tripId: '2' }),
        ]
        const cities = aggregateTripMapCities([...placeRows, ...locRows])
        const places = aggregateTripMapPlaces(placeRows)
        expect(summarizeTripMap(cities, places)).toEqual({
            cityCount: 2,
            placeCount: 1,
            countryCount: 2,
            tripCount: 2,
        })
    })

    it('counts distinct countries, cities, places, and trips', () => {
        const rows = [
            place({ googlePlaceId: 'a', addressComponents: tokyo, tripId: '1' }),
            place({ googlePlaceId: 'b', addressComponents: manhattan, tripId: '1' }),
            place({ googlePlaceId: 'c', addressComponents: manhattan, tripId: '2' }),
        ]
        const cities = aggregateTripMapCities(rows)
        const places = aggregateTripMapPlaces(rows)
        expect(summarizeTripMap(cities, places)).toEqual({
            cityCount: 2,
            placeCount: 3,
            countryCount: 2,
            tripCount: 2,
        })
    })
})
