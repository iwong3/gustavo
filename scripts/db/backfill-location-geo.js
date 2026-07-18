#!/usr/bin/env node
/**
 * Geocode trip locations (city names) so expenses with no Google place can
 * appear on the trips world map as city dots.
 *
 * Why this exists: expenses from before the Google autocomplete feature carry
 * only a location (the trip's city list, e.g. "Kyoto"). Migration 00040 added
 * lat/lng/country_code to locations; this fills them, once per environment.
 * New-trip expenses generally get real places, so this is a legacy backfill,
 * but it's safe to re-run — it only ever touches rows with lat IS NULL.
 *
 * Ambiguity guard: results are REVIEWED before they're written. --fetch calls
 * Google and saves resolutions to a JSON file (no DB writes); --apply writes
 * that file to the DB. Each resolution is checked against the trip's selected
 * countries (trip_countries) and re-queried with an explicit country name on a
 * mismatch — "Victoria" won't land in Australia when the trip says Canada.
 *
 * COSTS MONEY: one Places Text Search call per distinct city name (Pro SKU,
 * billed against the monthly free credit; a mismatch retry adds one more).
 *
 * Usage:
 *   pnpm db:backfill-location-geo             # dry run — lists rows, calls nothing
 *   pnpm db:backfill-location-geo --fetch     # geocode + print for review (writes JSON, not DB)
 *   pnpm db:backfill-location-geo --apply     # write the reviewed JSON to the DB
 *
 * Prod: DATABASE_URL=<prod url> GOOGLE_MAPS_API_KEY=<key> node scripts/db/backfill-location-geo.js --fetch
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const RESULTS_FILE = path.join(__dirname, 'location-geo-results.json')
const FIELD_MASK =
    'places.id,places.displayName,places.location,places.addressComponents,places.types'

// Names that aren't cities — never geocode them.
const SKIP_NAMES = new Set(['other'])

const regionName = new Intl.DisplayNames(['en'], { type: 'region' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function searchText(textQuery, apiKey) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery }),
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    const data = await res.json()
    return data.places?.[0] ?? null
}

const placeCountry = (place) =>
    place?.addressComponents?.find((c) => c.types?.includes('country'))?.shortText ?? null

const resolutionOf = (place) =>
    place && {
        city: place.displayName?.text ?? null,
        countryCode: placeCountry(place),
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
    }

async function main() {
    const fetchMode = process.argv.includes('--fetch')
    const applyMode = process.argv.includes('--apply')

    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set')
        process.exit(1)
    }
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey && fetchMode) {
        console.error('❌ GOOGLE_MAPS_API_KEY is not set')
        process.exit(1)
    }

    const client = new Client({ connectionString })
    await client.connect()

    try {
        if (applyMode) {
            if (!fs.existsSync(RESULTS_FILE)) {
                console.error(`❌ ${RESULTS_FILE} not found — run --fetch first.`)
                process.exit(1)
            }
            const groups = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'))
            let updated = 0
            for (const g of groups) {
                if (!g.resolved || g.resolved.lat == null || g.resolved.lng == null) {
                    console.log(`⏭️  ${g.name} — no resolution, skipped`)
                    continue
                }
                const r = await client.query(
                    `UPDATE locations
                     SET lat = $2, lng = $3, country_code = $4, geocoded_at = NOW()
                     WHERE id = ANY($1::bigint[]) AND lat IS NULL AND deleted_at IS NULL`,
                    [g.locationIds, g.resolved.lat, g.resolved.lng, g.resolved.countryCode]
                )
                updated += r.rowCount
                console.log(`✅ ${g.name} → ${g.resolved.city}, ${g.resolved.countryCode} (${r.rowCount} row(s))`)
            }
            console.log(`\n${updated} location row(s) updated.`)
            return
        }

        // Rows needing geo, with each trip's selected countries as a sanity net.
        const { rows } = await client.query(
            `SELECT l.id, l.name, t.name AS trip_name,
                    COALESCE(array_agg(tc.country_code) FILTER (WHERE tc.country_code IS NOT NULL), '{}') AS trip_countries
             FROM locations l
             JOIN trips t ON l.trip_id = t.id
             LEFT JOIN trip_countries tc ON tc.trip_id = t.id
             WHERE l.deleted_at IS NULL AND t.deleted_at IS NULL AND l.lat IS NULL
             GROUP BY l.id, l.name, t.name
             ORDER BY l.name`
        )
        const todo = rows.filter((r) => !SKIP_NAMES.has(r.name.toLowerCase()))
        const skipped = rows.length - todo.length

        // One Google call per distinct (name, trip-country-set).
        const groups = new Map()
        for (const r of todo) {
            const countries = [...r.trip_countries].sort()
            const key = `${r.name.toLowerCase()}|${countries.join(',')}`
            const g = groups.get(key) ?? {
                name: r.name,
                tripCountries: countries,
                trips: [],
                locationIds: [],
            }
            g.locationIds.push(r.id)
            g.trips.push(r.trip_name)
            groups.set(key, g)
        }

        console.log(
            `${todo.length} location row(s) need geo (${skipped} skipped as non-city) — ${groups.size} distinct name(s):`
        )
        for (const g of groups.values()) {
            console.log(`   · ${g.name} [${g.tripCountries.join(', ') || 'no trip countries'}] — ${g.trips.join(', ')}`)
        }
        console.log()

        if (!fetchMode) {
            console.log(`--fetch would make ~${groups.size} Places Text Search call(s) (Pro SKU,`)
            console.log('billed against the monthly free credit), then save results for review.')
            console.log('\nRe-run with --fetch to geocode, then --apply to write.')
            return
        }

        const results = []
        for (const g of groups.values()) {
            try {
                let place = await searchText(g.name, apiKey)
                let country = placeCountry(place)
                let note = ''
                // Wrong country for this trip? Re-ask with the country spelled out.
                if (g.tripCountries.length > 0 && country && !g.tripCountries.includes(country)) {
                    for (const code of g.tripCountries) {
                        const retry = await searchText(`${g.name}, ${regionName.of(code)}`, apiKey)
                        if (placeCountry(retry) === code) {
                            place = retry
                            country = code
                            note = ` (retried with ${regionName.of(code)})`
                            break
                        }
                        await sleep(120)
                    }
                }
                const resolved = resolutionOf(place)
                const mismatch =
                    g.tripCountries.length > 0 && resolved?.countryCode
                        ? !g.tripCountries.includes(resolved.countryCode)
                        : false
                results.push({ ...g, resolved, mismatch })
                const flag = !resolved ? '❓ no result' : mismatch ? '⚠️  country mismatch' : '✅'
                console.log(
                    `${flag} ${g.name} → ${resolved ? `${resolved.city}, ${resolved.countryCode} (${resolved.lat?.toFixed(3)}, ${resolved.lng?.toFixed(3)})` : '—'}${note}`
                )
            } catch (err) {
                results.push({ ...g, resolved: null, mismatch: false, error: err.message })
                console.error(`⚠️  ${g.name}: ${err.message.slice(0, 120)}`)
            }
            await sleep(120)
        }

        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
        console.log(`\nSaved to ${RESULTS_FILE}`)
        console.log('Review it (edit/remove anything wrong), then re-run with --apply.')
    } finally {
        await client.end()
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
