import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import {
    aggregateTripMapCities,
    aggregateTripMapPlaces,
    summarizeTripMap,
    type TripMapPlace,
    type TripMapResponse,
} from '@/lib/trip-map'

// "Where we've been" — every place-tagged expense on a trip the current user
// participates in, grouped by (place, trip). Participant trips only: a public
// trip the user has never been on isn't somewhere they've been. Read-only, no
// mutation → no withAuditUser.
export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId } = authUser

    const res = await pool.query(
        // USD value per expense, mirroring lib/spend.ts getExpenseUsdValue: USD
        // (and currency-exchange) expenses store their amount in cost_original and
        // leave cost_converted_usd null; everything else uses the converted value.
        // (Blended-rate refinement is skipped here — a map total doesn't need it.)
        `SELECT pd.google_place_id, pd.name, pd.lat, pd.lng, pd.address_components,
                MAX(l.name) AS location_name,
                t.id AS trip_id, t.name AS trip_name, t.slug AS trip_slug,
                t.start_date AS trip_start, t.end_date AS trip_end,
                SUM(CASE WHEN e.currency = 'USD' THEN e.cost_original
                         ELSE COALESCE(e.cost_converted_usd, 0) END) AS spend_usd
         FROM expenses e
         JOIN place_details pd ON e.google_place_id = pd.google_place_id
         JOIN trips t ON e.trip_id = t.id
         LEFT JOIN locations l ON e.location_id = l.id
         JOIN trip_participants tp
              ON tp.trip_id = t.id AND tp.user_id = $1 AND tp.left_at IS NULL
         WHERE e.deleted_at IS NULL
           AND t.deleted_at IS NULL
           AND pd.lat IS NOT NULL AND pd.lng IS NOT NULL
         GROUP BY pd.google_place_id, pd.name, pd.lat, pd.lng, pd.address_components,
                  t.id, t.name, t.slug, t.start_date, t.end_date`,
        [userId]
    )

    // Expenses with NO Google place still land on the map as a city dot via
    // their geocoded location (pre-autocomplete trips; lat/lng filled by the
    // location-geo backfill). Same (thing, trip) grain as the place query.
    const locRes = await pool.query(
        `SELECT l.id AS location_id, l.name AS location_name, l.lat, l.lng, l.country_code,
                t.id AS trip_id, t.name AS trip_name, t.slug AS trip_slug,
                t.start_date AS trip_start, t.end_date AS trip_end,
                SUM(CASE WHEN e.currency = 'USD' THEN e.cost_original
                         ELSE COALESCE(e.cost_converted_usd, 0) END) AS spend_usd
         FROM expenses e
         JOIN locations l ON e.location_id = l.id
         JOIN trips t ON e.trip_id = t.id
         JOIN trip_participants tp
              ON tp.trip_id = t.id AND tp.user_id = $1 AND tp.left_at IS NULL
         WHERE e.deleted_at IS NULL
           AND t.deleted_at IS NULL
           AND l.deleted_at IS NULL
           AND e.google_place_id IS NULL
           AND l.lat IS NOT NULL AND l.lng IS NOT NULL
         GROUP BY l.id, l.name, l.lat, l.lng, l.country_code,
                  t.id, t.name, t.slug, t.start_date, t.end_date`,
        [userId]
    )

    const toDay = (d: string | Date): string =>
        typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)

    const placeRows: TripMapPlace[] = res.rows.map((r) => ({
        googlePlaceId: r.google_place_id,
        name: r.name,
        // DOUBLE PRECISION / NUMERIC arrive as strings — parse defensively.
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
        addressComponents: r.address_components || null,
        locationName: r.location_name || null,
        tripId: String(r.trip_id),
        tripName: r.trip_name,
        tripSlug: r.trip_slug,
        tripStart: toDay(r.trip_start),
        tripEnd: toDay(r.trip_end),
        spendUsd: r.spend_usd != null ? parseFloat(r.spend_usd) : 0,
    }))

    const locationRows: TripMapPlace[] = locRes.rows.map((r) => ({
        // Synthetic key — never collides with a Google place id, and keeps a
        // location distinct in the city centroid's per-"place" dedupe.
        googlePlaceId: `loc:${r.location_id}`,
        name: r.location_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lng),
        addressComponents: null,
        countryCode: r.country_code || null,
        locationName: r.location_name,
        tripId: String(r.trip_id),
        tripName: r.trip_name,
        tripSlug: r.trip_slug,
        tripStart: toDay(r.trip_start),
        tripEnd: toDay(r.trip_end),
        spendUsd: r.spend_usd != null ? parseFloat(r.spend_usd) : 0,
    }))

    // Location rows join the Cities view (they ARE cities); the Places view
    // stays venues-only — a city-level dot there would masquerade as a venue.
    const cities = aggregateTripMapCities([...placeRows, ...locationRows])
    const places = aggregateTripMapPlaces(placeRows)
    const body: TripMapResponse = { cities, places, summary: summarizeTripMap(cities, places) }
    return NextResponse.json(body)
}
