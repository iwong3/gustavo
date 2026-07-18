// ── Trips world map — data shapes + city aggregation ──────────────────────────
//
// "Where we've been": every city where the current user logged a place-tagged
// expense, across all their trips. The map draws one dot per city (deduped
// across trips), so this buckets the raw (place, trip) rows the query returns
// into cities using the same per-country area rule the rest of the app uses
// (derivePlaceCity — handles JP wards, US states, etc.).
//
// Leaf module: imports only types + place-display (also a leaf). Safe to use
// from the API route and the page alike — no component imports (TDZ rule).

// Relative (not '@/') so the Vitest suite can resolve this value import — the
// path alias is only configured for Next, and type-only '@/' imports are erased.
import { derivePlaceCity } from './place-display'
import type { AddressComponent } from '@/lib/types'

/** One (place, trip) the user spent at — the raw grain the map query returns,
 *  before city aggregation. ids are strings (BIGINT arrives as string).
 *
 *  Also the shape for a city-level LOCATION row (an expense with no Google
 *  place, mapped via its geocoded location): googlePlaceId is a synthetic
 *  `loc:<id>` key, name/locationName are the city, and countryCode is stored
 *  directly instead of arriving via addressComponents. Location rows feed the
 *  Cities view only — they aren't venues, so the API never passes them to
 *  aggregateTripMapPlaces. */
export type TripMapPlace = {
    googlePlaceId: string
    name: string
    lat: number
    lng: number
    addressComponents: AddressComponent[] | null
    /** Explicit ISO country code (location rows). Wins over addressComponents. */
    countryCode?: string | null
    /** The expense's city-level location name — a reliable city fallback when the
     *  place has no Google address components to derive one from. */
    locationName: string | null
    tripId: string
    tripName: string
    tripSlug: string
    tripStart: string
    tripEnd: string
    spendUsd: number
}

/** A trip that touched a given city, with what was spent there on that trip —
 *  shown in the tap-a-dot info card. */
export type TripMapCityTrip = {
    id: string
    name: string
    slug: string
    startDate: string
    endDate: string
    spendUsd: number
}

/** A city dot on the map: one per distinct city across all the user's trips. */
export type TripMapCity = {
    /** Stable grouping key: country code + lowercased city. */
    key: string
    city: string
    countryCode: string | null
    lat: number
    lng: number
    totalSpendUsd: number
    placeCount: number
    trips: TripMapCityTrip[]
}

export type TripMapSummary = {
    cityCount: number
    placeCount: number
    countryCount: number
    tripCount: number
}

export type TripMapResponse = {
    /** Deduped by city (the "Cities" view). */
    cities: TripMapCity[]
    /** Deduped by individual place/venue (the "Places" view). Same shape as a
     *  city dot, with `city` holding the venue name. */
    places: TripMapCity[]
    summary: TripMapSummary
}

/** Newest trip first — the order the tap-a-dot card lists a city's trips. */
const sortTripsByDateDesc = (trips: Map<string, TripMapCityTrip>): TripMapCityTrip[] =>
    Array.from(trips.values()).sort((a, b) =>
        a.startDate === b.startDate ? 0 : a.startDate < b.startDate ? 1 : -1
    )

const findComponent = (
    components: AddressComponent[] | null | undefined,
    type: string
) => components?.find((c) => c.types.includes(type)) ?? null

/** ISO country code for a place, from its address components ("JP", "US"). */
function deriveCountryCode(
    components: AddressComponent[] | null | undefined
): string | null {
    return findComponent(components, 'country')?.shortText ?? null
}

/**
 * Bucket raw (place, trip) rows into one dot per city.
 *
 * City name comes from derivePlaceCity (handles JP wards / US states); the dot's
 * coordinate is the mean of its member places' coords, which lands inside the
 * city since they're all within it. Places with no derivable city (saved before
 * migration 00039 added address components) fall back to their own name so they
 * still appear rather than vanish. Cities sorted by spend, biggest first.
 */
export function aggregateTripMapCities(rows: TripMapPlace[]): TripMapCity[] {
    type Acc = {
        city: string
        countryCode: string | null
        latSum: number
        lngSum: number
        placeIds: Set<string>
        totalSpendUsd: number
        trips: Map<string, TripMapCityTrip>
    }
    const buckets = new Map<string, Acc>()

    for (const r of rows) {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue
        // Google-derived city → the expense's stored city location → the venue
        // name as a last resort (so a dot always has a label).
        const city = derivePlaceCity(r.addressComponents) ?? r.locationName ?? r.name
        const countryCode = r.countryCode ?? deriveCountryCode(r.addressComponents)
        const key = `${countryCode ?? '??'}|${city.toLowerCase()}`

        let acc = buckets.get(key)
        if (!acc) {
            acc = {
                city,
                countryCode,
                latSum: 0,
                lngSum: 0,
                placeIds: new Set(),
                totalSpendUsd: 0,
                trips: new Map(),
            }
            buckets.set(key, acc)
        }
        // Average one point per distinct place, not per (place, trip) row, so a
        // place used on two trips doesn't drag the centroid toward itself.
        if (!acc.placeIds.has(r.googlePlaceId)) {
            acc.placeIds.add(r.googlePlaceId)
            acc.latSum += r.lat
            acc.lngSum += r.lng
        }
        const finiteSpend = Number.isFinite(r.spendUsd) ? r.spendUsd : 0
        acc.totalSpendUsd += finiteSpend
        const existingTrip = acc.trips.get(r.tripId)
        if (existingTrip) {
            existingTrip.spendUsd += finiteSpend
        } else {
            acc.trips.set(r.tripId, {
                id: r.tripId,
                name: r.tripName,
                slug: r.tripSlug,
                startDate: r.tripStart,
                endDate: r.tripEnd,
                spendUsd: finiteSpend,
            })
        }
    }

    return Array.from(buckets.entries())
        .map(([key, a]) => {
            const placeCount = a.placeIds.size
            return {
                key,
                city: a.city,
                countryCode: a.countryCode,
                lat: a.latSum / placeCount,
                lng: a.lngSum / placeCount,
                totalSpendUsd: a.totalSpendUsd,
                placeCount,
                trips: sortTripsByDateDesc(a.trips),
            }
        })
        .sort((a, b) => b.totalSpendUsd - a.totalSpendUsd)
}

/**
 * One dot per individual place/venue (the "Places" view) — deduped across trips
 * by google_place_id, not squashed into cities. Label is the venue name; the dot
 * sits at the place's own coordinate. Sorted by spend, biggest first.
 */
export function aggregateTripMapPlaces(rows: TripMapPlace[]): TripMapCity[] {
    type Acc = {
        name: string
        countryCode: string | null
        lat: number
        lng: number
        totalSpendUsd: number
        trips: Map<string, TripMapCityTrip>
    }
    const buckets = new Map<string, Acc>()

    for (const r of rows) {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue
        let acc = buckets.get(r.googlePlaceId)
        if (!acc) {
            acc = {
                name: r.name,
                countryCode: r.countryCode ?? deriveCountryCode(r.addressComponents),
                lat: r.lat,
                lng: r.lng,
                totalSpendUsd: 0,
                trips: new Map(),
            }
            buckets.set(r.googlePlaceId, acc)
        }
        const finiteSpend = Number.isFinite(r.spendUsd) ? r.spendUsd : 0
        acc.totalSpendUsd += finiteSpend
        const existingTrip = acc.trips.get(r.tripId)
        if (existingTrip) {
            existingTrip.spendUsd += finiteSpend
        } else {
            acc.trips.set(r.tripId, {
                id: r.tripId,
                name: r.tripName,
                slug: r.tripSlug,
                startDate: r.tripStart,
                endDate: r.tripEnd,
                spendUsd: finiteSpend,
            })
        }
    }

    return Array.from(buckets.entries())
        .map(([key, a]) => ({
            key,
            city: a.name,
            countryCode: a.countryCode,
            lat: a.lat,
            lng: a.lng,
            totalSpendUsd: a.totalSpendUsd,
            placeCount: 1,
            trips: sortTripsByDateDesc(a.trips),
        }))
        .sort((a, b) => b.totalSpendUsd - a.totalSpendUsd)
}

/** Top-line counts for the map's stat strip. */
export function summarizeTripMap(
    cities: TripMapCity[],
    places: TripMapCity[]
): TripMapSummary {
    const countries = new Set<string>()
    const trips = new Set<string>()
    for (const c of cities) {
        if (c.countryCode) countries.add(c.countryCode)
        for (const t of c.trips) trips.add(t.id)
    }
    return {
        cityCount: cities.length,
        placeCount: places.length,
        countryCount: countries.size,
        tripCount: trips.size,
    }
}
