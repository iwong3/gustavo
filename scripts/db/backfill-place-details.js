#!/usr/bin/env node
/**
 * Backfill Google Place metadata for places we cached before we asked for it.
 *
 * Why this exists: migration 00020 created place_details by copying only
 * name/address/lat/lng off the old expense columns, and the app never re-fetches
 * a place it already has (that's what keeps Places usage inside the free
 * credit). So every place saved before the metadata field mask landed has NULL
 * rating / price / type / website / address_components forever, and the expense
 * details page renders no chips and no "Shibuya, Tokyo" area for them.
 *
 * This is a ONE-OFF per environment. New places pick everything up at save time.
 *
 * COSTS MONEY: one Google Place Details call per row, on the Enterprise SKU
 * (the mask includes rating/priceLevel/priceRange/userRatingCount/websiteUri).
 * It is billed against the monthly free credit. The script therefore refuses to
 * call Google until you pass --confirm, so you can see the row count first.
 *
 * Usage:
 *   pnpm db:backfill-places              # dry run — counts rows, calls nothing
 *   pnpm db:backfill-places --confirm    # actually fetch + update
 *   pnpm db:backfill-places --confirm --all   # re-fetch every place, not just gaps
 *
 * Prod: DATABASE_URL=<prod url> GOOGLE_MAPS_API_KEY=<key> node scripts/db/backfill-place-details.js --confirm
 */

const { Client } = require('pg')

// Must stay in sync with app/api/places/[placeId]/route.ts
const FIELD_MASK =
    'id,displayName,formattedAddress,location,addressComponents,types,primaryType,priceLevel,priceRange,rating,userRatingCount,regularOpeningHours,websiteUri,photos'

const PRICE_LEVEL_MAP = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPlace(placeId, apiKey) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
    })
    if (!res.ok) {
        throw new Error(`${res.status} ${await res.text()}`)
    }
    return res.json()
}

async function main() {
    const confirm = process.argv.includes('--confirm')
    const all = process.argv.includes('--all')

    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set')
        process.exit(1)
    }
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey && confirm) {
        console.error('❌ GOOGLE_MAPS_API_KEY is not set')
        process.exit(1)
    }

    const client = new Client({ connectionString })
    await client.connect()

    try {
        // "Needs backfill" = never got the metadata pass. address_components is
        // the marker: it's the one field the 00020 copy could not have produced.
        const where = all
            ? ''
            : 'WHERE address_components IS NULL OR user_rating_count IS NULL'
        const { rows } = await client.query(
            `SELECT google_place_id, name FROM place_details ${where} ORDER BY name`
        )

        if (rows.length === 0) {
            console.log('✅ Nothing to backfill.')
            return
        }

        console.log(`${rows.length} place(s) ${all ? 'to re-fetch' : 'missing metadata'}:`)
        for (const r of rows) console.log(`   · ${r.name}`)
        console.log()

        if (!confirm) {
            console.log(`This would make ${rows.length} Google Place Details call(s) (Enterprise SKU,`)
            console.log('billed against the monthly free credit).')
            console.log('\nRe-run with --confirm to proceed.')
            return
        }

        let updated = 0
        let failed = 0
        for (const row of rows) {
            try {
                const d = await fetchPlace(row.google_place_id, apiKey)

                const priceLevel =
                    typeof d.priceLevel === 'string'
                        ? (PRICE_LEVEL_MAP[d.priceLevel] ?? null)
                        : (d.priceLevel ?? null)
                const components = (d.addressComponents || []).map((c) => ({
                    longText: c.longText,
                    shortText: c.shortText,
                    types: c.types,
                }))
                const photoRefs = (d.photos || []).slice(0, 3).map((p) => p.name).filter(Boolean)

                // COALESCE-free: this is a deliberate refresh, so Google wins.
                // Empty arrays are stored as NULL, never as '[]' — '[]' would
                // read as "known to have none" and block a later backfill.
                await client.query(
                    `UPDATE place_details SET
                        name = COALESCE($2, name),
                        address = COALESCE($3, address),
                        lat = COALESCE($4, lat),
                        lng = COALESCE($5, lng),
                        price_level = $6,
                        price_range = $7,
                        rating = $8,
                        user_rating_count = $9,
                        primary_type = $10,
                        types = $11,
                        website = $12,
                        hours_json = $13,
                        photo_refs = $14,
                        address_components = $15,
                        fetched_at = NOW()
                     WHERE google_place_id = $1`,
                    [
                        row.google_place_id,
                        d.displayName?.text || null,
                        d.formattedAddress || null,
                        d.location?.latitude ?? null,
                        d.location?.longitude ?? null,
                        priceLevel,
                        d.priceRange ? JSON.stringify(d.priceRange) : null,
                        d.rating ?? null,
                        d.userRatingCount ?? null,
                        d.primaryType || null,
                        d.types?.length ? JSON.stringify(d.types) : null,
                        d.websiteUri || null,
                        d.regularOpeningHours ? JSON.stringify(d.regularOpeningHours) : null,
                        photoRefs.length ? JSON.stringify(photoRefs) : null,
                        components.length ? JSON.stringify(components) : null,
                    ]
                )
                updated++
                console.log(`✅ ${row.name}${d.rating ? ` — ${d.rating}★` : ''}`)
            } catch (err) {
                failed++
                // A dead place id (closed venue) is expected and not fatal —
                // that row simply keeps what it has.
                console.error(`⚠️  ${row.name}: ${err.message.slice(0, 120)}`)
            }
            await sleep(120) // be polite to the API
        }

        console.log(`\n${updated} updated, ${failed} failed.`)
    } finally {
        await client.end()
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
