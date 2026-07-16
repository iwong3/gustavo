import type { PoolClient } from 'pg'

import type { AddressComponent, PlacePriceRange } from '@/lib/types'

/**
 * Google Place fields as they arrive on an expense create/update body.
 *
 * The expense form sends the whole Place Details payload alongside the expense;
 * the API caches it in place_details so the place is never fetched from Google
 * twice (see schema.md § Google Places).
 */
export type PlaceUpsertBody = {
    google_place_id?: string | null
    google_place_name?: string
    google_place_address?: string
    google_place_lat?: number
    google_place_lng?: number
    google_place_price_level?: number | null
    google_place_price_range?: PlacePriceRange | null
    google_place_rating?: number | null
    google_place_user_rating_count?: number | null
    google_place_primary_type?: string | null
    google_place_types?: string[] | null
    google_place_website?: string | null
    google_place_hours_json?: Record<string, unknown> | null
    google_place_photo_refs?: string[] | null
    google_place_address_components?: AddressComponent[] | null
}

/** An empty array is truthy and JSON.stringify's to '[]', which COALESCE would
 *  happily write over good data — so empty means "absent" here, not "known to be
 *  empty". Matters on every expense edit: the form round-trips the place through
 *  a PlaceDetails shape that can carry [] for a field it doesn't display. */
const jsonbOrNull = (value: unknown[] | null | undefined): string | null =>
    value && value.length > 0 ? JSON.stringify(value) : null

/**
 * Cache a picked place. No-op unless both an id and a name are present.
 *
 * COALESCE on the metadata columns is deliberate: an older client (or a place
 * re-saved from a stale form) can post without the newer fields, and a row that
 * already knows a place's rating/components must not be blanked by a payload
 * that simply doesn't carry them. Identity columns (name/address/lat/lng)
 * overwrite, since those are what the user just picked.
 */
export async function upsertPlaceDetails(
    client: PoolClient,
    body: PlaceUpsertBody
): Promise<void> {
    if (!body.google_place_id || !body.google_place_name) return

    await client.query(
        `INSERT INTO place_details (
            google_place_id, name, address, lat, lng,
            price_level, price_range, rating, user_rating_count,
            primary_type, types, website, hours_json, photo_refs, address_components
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (google_place_id) DO UPDATE SET
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            price_level = COALESCE(EXCLUDED.price_level, place_details.price_level),
            price_range = COALESCE(EXCLUDED.price_range, place_details.price_range),
            rating = COALESCE(EXCLUDED.rating, place_details.rating),
            user_rating_count = COALESCE(EXCLUDED.user_rating_count, place_details.user_rating_count),
            primary_type = COALESCE(EXCLUDED.primary_type, place_details.primary_type),
            types = COALESCE(EXCLUDED.types, place_details.types),
            website = COALESCE(EXCLUDED.website, place_details.website),
            hours_json = COALESCE(EXCLUDED.hours_json, place_details.hours_json),
            photo_refs = COALESCE(EXCLUDED.photo_refs, place_details.photo_refs),
            address_components = COALESCE(EXCLUDED.address_components, place_details.address_components),
            fetched_at = NOW()`,
        [
            body.google_place_id,
            body.google_place_name,
            body.google_place_address || null,
            body.google_place_lat || null,
            body.google_place_lng || null,
            body.google_place_price_level ?? null,
            body.google_place_price_range ? JSON.stringify(body.google_place_price_range) : null,
            body.google_place_rating ?? null,
            body.google_place_user_rating_count ?? null,
            body.google_place_primary_type ?? null,
            jsonbOrNull(body.google_place_types),
            body.google_place_website ?? null,
            body.google_place_hours_json ? JSON.stringify(body.google_place_hours_json) : null,
            jsonbOrNull(body.google_place_photo_refs),
            jsonbOrNull(body.google_place_address_components),
        ]
    )
}
