// ── Google Place → display strings ────────────────────────────────────────────
//
// Leaf module (no imports beyond types) — safe to use from lib, utils, and
// components alike.
//
// Everything here derives display text from RAW Google data cached in
// place_details. Nothing is baked in at save time on purpose: the area rule
// below is per-country and we will get countries wrong, so keeping it in code
// means a fix is a deploy, not a re-fetch of every place we've ever saved
// (which would cost Places API calls).

import type { AddressComponent, PlaceInfo, PlacePriceRange } from '@/lib/types'

/** A place's area at two zoom levels. `fine` is the part you actually remember
 *  ("Shibuya"), `coarse` anchors it ("Tokyo"). Either can be null. */
export type PlaceArea = {
    fine: string | null
    coarse: string | null
}

const find = (components: AddressComponent[], type: string) =>
    components.find((c) => c.types.includes(type)) ?? null

/** Google returns Tokyo's special wards as "Shibuya City" / "Shibuya Ward".
 *  Nobody says that out loud. */
const stripWardSuffix = (name: string) => name.replace(/\s+(City|Ward)$/, '')

/**
 * Split a place's address components into a fine + coarse area.
 *
 * The reason this isn't a one-liner: Google's field names mean opposite things
 * in different countries.
 *
 *   Japan   locality = "Shibuya City" (the ward)    admin_1 = "Tokyo" (prefecture)
 *   US      locality = "New York" (the city)        admin_1 = "NY" (the STATE)
 *           sublocality = "Manhattan"
 *
 * So in Japan the ward hides in `locality` and the city we want is one level up,
 * while in the US the same `admin_1` slot holds a state we never want to show.
 * Hence: branch on country, and let anything we haven't special-cased fall
 * through to the sublocality/locality reading, which is correct for most places.
 */
export function derivePlaceArea(
    components: AddressComponent[] | null | undefined
): PlaceArea {
    if (!components || components.length === 0) return { fine: null, coarse: null }

    const country = find(components, 'country')
    const admin1 = find(components, 'administrative_area_level_1')
    const locality = find(components, 'locality')
    const sublocality =
        find(components, 'sublocality_level_1') ?? find(components, 'sublocality')
    const neighborhood = find(components, 'neighborhood')

    let fine: string | null
    let coarse: string | null

    if (country?.shortText === 'JP') {
        // Ward-as-locality, prefecture-as-admin_1.
        fine = locality
            ? stripWardSuffix(locality.longText)
            : (sublocality?.longText ?? null)
        coarse = admin1?.longText ?? null
    } else {
        // Everywhere else: the finer area is a sublocality/neighborhood when it
        // exists, and the city is the locality. admin_1 is only a fallback —
        // as a *state* it's noise ("Napa, California"), so it's last resort.
        fine = sublocality?.longText ?? neighborhood?.longText ?? null
        coarse = locality?.longText ?? admin1?.longText ?? null
    }

    // No distinct finer area → the city IS the answer ("Napa"), not "null, Napa".
    if (!fine) {
        fine = coarse
        coarse = null
    }
    // "Kyoto, Kyoto" and friends — locality and prefecture often coincide.
    if (fine && coarse && fine.toLowerCase() === coarse.toLowerCase()) {
        coarse = null
    }

    return { fine, coarse }
}

/** "Shibuya, Tokyo" · "Napa" · null. */
export function formatPlaceArea(
    components: AddressComponent[] | null | undefined
): string | null {
    const { fine, coarse } = derivePlaceArea(components)
    if (!fine) return null
    return coarse ? `${fine}, ${coarse}` : fine
}

/** The city a place belongs to — used for the trip's Location records, which
 *  stay city-level so filters don't fragment into neighborhoods. */
export function derivePlaceCity(
    components: AddressComponent[] | null | undefined
): string | null {
    const { fine, coarse } = derivePlaceArea(components)
    // coarse is the city when there's a finer area; otherwise fine already is.
    if (coarse) return coarse
    if (fine) return fine
    const country = components ? find(components, 'country') : null
    return country?.longText ?? null
}

/** Area for an expense's place, falling back to the trip's location name.
 *  Places saved before migration 00039 have no components — they fall back. */
export function expenseAreaLabel(
    place: Pick<PlaceInfo, 'addressComponents'> | null | undefined,
    locationName: string | null | undefined
): string | null {
    return formatPlaceArea(place?.addressComponents) ?? locationName ?? null
}

// ── Price ─────────────────────────────────────────────────────────────────────

/** Google sends money as {currencyCode, units} where units is an int64 encoded
 *  as a STRING (proto3 JSON). Parse defensively — a bad value must not NaN its
 *  way into the UI. */
const priceUnits = (
    price: { currencyCode?: string; units?: string } | null | undefined
): number | null => {
    if (!price?.units) return null
    const n = Number(price.units)
    return Number.isFinite(n) ? n : null
}

/** "¥1,000–2,000" · "$10–20" · "$10+" · null.
 *  Symbol appears once — the range reads as one amount, not two. */
export function formatPriceRange(range: PlacePriceRange | null | undefined): string | null {
    if (!range) return null

    const start = priceUnits(range.startPrice)
    const end = priceUnits(range.endPrice)
    const currency = range.startPrice?.currencyCode ?? range.endPrice?.currencyCode
    if (start == null && end == null) return null

    const withSymbol = (n: number) =>
        currency
            ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                  maximumFractionDigits: 0,
              }).format(n)
            : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
    const bare = (n: number) =>
        new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

    if (start != null && end != null) return `${withSymbol(start)}–${bare(end)}`
    if (start != null) return `${withSymbol(start)}+`
    return `Up to ${withSymbol(end!)}`
}

/** priceLevel 0-4 → "$".."$$$$". The fallback when priceRange is absent. */
export function formatPriceLevel(level: number | null | undefined): string | null {
    if (level == null || level <= 0) return null
    return '$'.repeat(Math.min(4, level))
}

/** Actual money if Google has it, else the vague $$ — whichever exists. */
export function formatPlacePrice(
    place: Pick<PlaceInfo, 'priceRange' | 'priceLevel'> | null | undefined
): string | null {
    if (!place) return null
    return formatPriceRange(place.priceRange) ?? formatPriceLevel(place.priceLevel)
}

// ── Rating ────────────────────────────────────────────────────────────────────

/** "4.6★ (2,431)" — a rating without its N is a rumour. Count omitted if unknown. */
export function formatRating(
    rating: number | null | undefined,
    count: number | null | undefined
): string | null {
    if (!Number.isFinite(rating)) return null
    const stars = `${rating}★`
    if (!Number.isFinite(count) || count! <= 0) return stars
    return `${stars} (${new Intl.NumberFormat('en-US').format(count!)})`
}

// ── Type ──────────────────────────────────────────────────────────────────────

/** 'ramen_restaurant' → 'Ramen Restaurant' */
export function humanizePlaceType(type: string | null | undefined): string | null {
    if (!type) return null
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
