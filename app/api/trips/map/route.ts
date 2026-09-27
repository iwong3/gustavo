import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { computeBlendedRates, type BlendedRates, type SpendExpense } from '@/lib/spend'
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

    // Each trip's exchange rates, from its logged currency exchanges — the same
    // blended rates the rest of the app values foreign spend with (lib/spend.ts).
    // The app never writes cost_converted_usd, so without these every non-USD
    // expense valued at $0 on the map.
    const rateRes = await pool.query(
        `SELECT e.trip_id, e.paid_by, e.currency,
                SUM(e.cost_original) AS usd_paid,
                SUM(e.local_currency_received) AS local_received
         FROM expenses e
         JOIN expense_categories ec ON ec.id = e.category_id AND ec.slug = 'currency_exchange'
         JOIN trip_participants tp
              ON tp.trip_id = e.trip_id AND tp.user_id = $1 AND tp.left_at IS NULL
         WHERE e.deleted_at IS NULL AND e.local_currency_received > 0
         GROUP BY e.trip_id, e.paid_by, e.currency`,
        [userId]
    )
    // BIGINT ids arrive as strings but are typed number; key the rate maps by
    // the string on both sides so lookups match
    const payerKey = (id: unknown) => String(id) as unknown as number
    const exchangesByTrip = new Map<string, SpendExpense[]>()
    for (const r of rateRes.rows) {
        const list = exchangesByTrip.get(String(r.trip_id)) ?? []
        // Pre-summed per (payer, currency) — computeBlendedRates pools sums, so
        // one synthetic exchange per group gives the same rates
        list.push({
            categorySlug: 'currency_exchange',
            currency: r.currency,
            costOriginal: parseFloat(r.usd_paid),
            localCurrencyReceived: parseFloat(r.local_received),
            costConvertedUsd: NaN,
            paidBy: { id: payerKey(r.paid_by) },
            isEveryone: false,
            splitBetween: [],
            coveredParticipants: [],
        })
        exchangesByTrip.set(String(r.trip_id), list)
    }
    const ratesByTrip = new Map<string, BlendedRates>()
    exchangesByTrip.forEach((list, tripId) => ratesByTrip.set(tripId, computeBlendedRates(list)))

    // Spend is grouped down to (payer, currency, category) so it can be valued
    // with the payer's own rate, then summed back up to (place, trip) below
    const spendCols = `e.paid_by, e.currency, ec.slug AS category_slug,
                SUM(e.cost_original) AS cost,
                SUM(e.cost_converted_usd) AS converted_usd`

    const res = await pool.query(
        `SELECT pd.google_place_id, pd.name, pd.lat, pd.lng, pd.address_components,
                MAX(l.name) AS location_name,
                t.id AS trip_id, t.name AS trip_name, t.slug AS trip_slug,
                t.start_date AS trip_start, t.end_date AS trip_end,
                ${spendCols}
         FROM expenses e
         JOIN place_details pd ON e.google_place_id = pd.google_place_id
         JOIN trips t ON e.trip_id = t.id
         LEFT JOIN locations l ON e.location_id = l.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         JOIN trip_participants tp
              ON tp.trip_id = t.id AND tp.user_id = $1 AND tp.left_at IS NULL
         WHERE e.deleted_at IS NULL
           AND t.deleted_at IS NULL
           AND pd.lat IS NOT NULL AND pd.lng IS NOT NULL
         GROUP BY pd.google_place_id, pd.name, pd.lat, pd.lng, pd.address_components,
                  t.id, t.name, t.slug, t.start_date, t.end_date,
                  e.paid_by, e.currency, ec.slug`,
        [userId]
    )

    // Expenses with NO Google place still land on the map as a city dot via
    // their geocoded location (pre-autocomplete trips; lat/lng filled by the
    // location-geo backfill). Same (thing, trip) grain as the place query.
    const locRes = await pool.query(
        `SELECT l.id AS location_id, l.name AS location_name, l.lat, l.lng, l.country_code,
                t.id AS trip_id, t.name AS trip_name, t.slug AS trip_slug,
                t.start_date AS trip_start, t.end_date AS trip_end,
                ${spendCols}
         FROM expenses e
         JOIN locations l ON e.location_id = l.id
         JOIN trips t ON e.trip_id = t.id
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         JOIN trip_participants tp
              ON tp.trip_id = t.id AND tp.user_id = $1 AND tp.left_at IS NULL
         WHERE e.deleted_at IS NULL
           AND t.deleted_at IS NULL
           AND l.deleted_at IS NULL
           AND e.google_place_id IS NULL
           AND l.lat IS NOT NULL AND l.lng IS NOT NULL
         GROUP BY l.id, l.name, l.lat, l.lng, l.country_code,
                  t.id, t.name, t.slug, t.start_date, t.end_date,
                  e.paid_by, e.currency, ec.slug`,
        [userId]
    )

    const toDay = (d: string | Date): string =>
        typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)

    type SpendRow = {
        trip_id: string
        paid_by: string
        currency: string
        category_slug: string | null
        cost: string
        converted_usd: string | null
    }

    // Value one (payer, currency, category) group into a map row, mirroring
    // lib/spend.ts getExpenseUsdValue: payer's rate → trip's pooled rate →
    // stored converted value. With none of those, the local amount still
    // shows and the row is flagged unconverted instead of claiming $0.
    const addSpend = (row: TripMapPlace, r: SpendRow) => {
        const cost = parseFloat(r.cost)
        if (!Number.isFinite(cost)) return
        // A currency exchange moves money rather than spending it
        if (r.category_slug === 'currency_exchange') return
        if (r.currency === 'USD') {
            row.spendUsd += cost
            return
        }
        row.spendLocal[r.currency] = (row.spendLocal[r.currency] ?? 0) + cost
        const rates = ratesByTrip.get(String(r.trip_id))
        const rate =
            rates?.byPayer.get(payerKey(r.paid_by))?.get(r.currency) ??
            rates?.pooled.get(r.currency)
        const converted = r.converted_usd != null ? parseFloat(r.converted_usd) : NaN
        if (rate && rate > 0) row.spendUsd += cost / rate
        else if (Number.isFinite(converted)) row.spendUsd += converted
        else row.unconverted = true
    }

    // Collapse the (…, payer, currency, category) groups back to one row per
    // (thing, trip)
    const collect = <R extends SpendRow>(
        rows: R[],
        keyOf: (r: R) => string,
        make: (r: R) => Omit<TripMapPlace, 'spendUsd' | 'spendLocal' | 'unconverted'>
    ): TripMapPlace[] => {
        const byKey = new Map<string, TripMapPlace>()
        for (const r of rows) {
            const key = `${keyOf(r)}|${r.trip_id}`
            let row = byKey.get(key)
            if (!row) {
                row = { ...make(r), spendUsd: 0, spendLocal: {}, unconverted: false }
                byKey.set(key, row)
            }
            addSpend(row, r)
        }
        return Array.from(byKey.values())
    }

    const tripFields = (r: { trip_id: string; trip_name: string; trip_slug: string; trip_start: string | Date; trip_end: string | Date }) => ({
        tripId: String(r.trip_id),
        tripName: r.trip_name,
        tripSlug: r.trip_slug,
        tripStart: toDay(r.trip_start),
        tripEnd: toDay(r.trip_end),
    })

    const placeRows = collect(
        res.rows,
        (r) => r.google_place_id,
        (r) => ({
            googlePlaceId: r.google_place_id,
            name: r.name,
            // DOUBLE PRECISION / NUMERIC arrive as strings — parse defensively.
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lng),
            addressComponents: r.address_components || null,
            locationName: r.location_name || null,
            ...tripFields(r),
        })
    )

    const locationRows = collect(
        locRes.rows,
        (r) => `loc:${r.location_id}`,
        (r) => ({
            // Synthetic key — never collides with a Google place id, and keeps a
            // location distinct in the city centroid's per-"place" dedupe.
            googlePlaceId: `loc:${r.location_id}`,
            name: r.location_name,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lng),
            addressComponents: null,
            countryCode: r.country_code || null,
            locationName: r.location_name,
            ...tripFields(r),
        })
    )

    // Location rows join the Cities view (they ARE cities); the Places view
    // stays venues-only — a city-level dot there would masquerade as a venue.
    const cities = aggregateTripMapCities([...placeRows, ...locationRows])
    const places = aggregateTripMapPlaces(placeRows)
    const body: TripMapResponse = { cities, places, summary: summarizeTripMap(cities, places) }
    return NextResponse.json(body)
}
