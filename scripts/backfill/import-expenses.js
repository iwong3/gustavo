#!/usr/bin/env node
/**
 * Expense backfill — imports a Google Sheets CSV export into the DB.
 *
 * Usage:
 *   pnpm db:backfill -- --file "scripts/backfill/data/2024 Japan Spend.csv" --trip-id 1
 *   pnpm db:backfill -- --file "..." --trip-id 2 --clear     # wipe trip expenses first
 *   pnpm db:backfill -- --file "..." --trip-id 3 --dry-run   # validate without writing
 *
 * Prod:
 *   DATABASE_URL=<neon-url> node scripts/backfill/import-expenses.js --file ... --trip-id 1
 *
 * Trip IDs:
 *   1 = Japan 2024        (2024 Japan Spend.csv)
 *   2 = Vancouver 2024    (2024 Vancouver Spend Tracking.csv)
 *   3 = South Korea 2025  (2025 South Korea Spend Tracking.csv)
 *   4 = Japan 2025        (2025 Japan Spend Tracking.csv)
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const getArg = (flag) => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : null
}
const hasFlag = (flag) => args.includes(flag)

const csvFile = getArg('--file')
const tripId = getArg('--trip-id') ? parseInt(getArg('--trip-id'), 10) : null
const clearFirst = hasFlag('--clear')
const dryRun = hasFlag('--dry-run')

if (!csvFile || !tripId) {
    console.error('Usage: import-expenses.js --file <path> --trip-id <n> [--clear] [--dry-run]')
    process.exit(1)
}

if (!fs.existsSync(csvFile)) {
    console.error(`❌ File not found: ${csvFile}`)
    process.exit(1)
}

// ---------------------------------------------------------------------------
// CSV column names (matches the Columns enum in app/utils/data-mapping.ts)
// ---------------------------------------------------------------------------

const COL = {
    Date: 'Date',
    ItemName: 'Item Name',
    Cost: 'Cost',
    ConvertedCost: 'Converted Cost',
    Currency: 'Currency',
    PaidBy: 'Paid By',
    SplitBetween: 'Split Between',
    SpendType: 'Type of Spend',
    Location: 'Location',
    Notes: 'Notes',
    Email: 'Email Address',
    Timestamp: 'Timestamp',
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set')
        process.exit(1)
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    console.log(`Connected to database${dryRun ? ' (DRY RUN — no writes)' : ''}\n`)

    try {
        // Verify trip exists
        const tripRes = await client.query(
            'SELECT id, name FROM trips WHERE id = $1 AND deleted_at IS NULL',
            [tripId]
        )
        if (tripRes.rows.length === 0) {
            throw new Error(`Trip id=${tripId} not found`)
        }
        const tripName = tripRes.rows[0].name
        console.log(`Importing into trip: ${tripName} (id=${tripId})`)
        if (clearFirst) console.log('  --clear: will soft-delete existing expenses first')
        console.log()

        // Build first-name → user ID map
        const usersRes = await client.query(
            "SELECT id, name, email, split_part(name, ' ', 1) AS first_name FROM users WHERE deleted_at IS NULL"
        )
        const nameToId = {}
        const emailToId = {}
        for (const row of usersRes.rows) {
            nameToId[row.first_name] = row.id
            if (row.email) emailToId[row.email.trim().toLowerCase()] = row.id
        }

        // Build location name → ID map for this trip
        const locsRes = await client.query(
            'SELECT id, name FROM locations WHERE trip_id = $1 AND deleted_at IS NULL',
            [tripId]
        )
        const locationToId = {}
        for (const row of locsRes.rows) {
            locationToId[row.name] = row.id
        }

        // Load trip participants (for "Everyone" expansion)
        const participantsRes = await client.query(
            'SELECT user_id FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL',
            [tripId]
        )
        const tripParticipantIds = participantsRes.rows.map((r) => r.user_id)

        // Clear existing expenses if requested
        if (clearFirst && !dryRun) {
            const cleared = await client.query(
                'UPDATE expenses SET deleted_at = NOW() WHERE trip_id = $1 AND deleted_at IS NULL',
                [tripId]
            )
            console.log(`Soft-deleted ${cleared.rowCount} existing expenses\n`)
        }

        // Parse CSV — csv-parse handles quoted fields, commas in values, CRLF
        const raw = fs.readFileSync(csvFile, 'utf8')
        const records = parse(raw, {
            columns: true,        // use header row as keys
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true, // tolerate extra/missing columns per row
        })

        // Counters
        let inserted = 0
        let skippedEmpty = 0
        let skippedUnknownPerson = 0
        const autoCreatedLocations = []
        const warnings = []

        for (const row of records) {
            // Skip rows with no item name
            if (!row[COL.ItemName] || row[COL.ItemName].trim() === '') {
                skippedEmpty++
                continue
            }

            // --- Date ---
            const dateStr = fixDate(row[COL.Date])
            if (!dateStr) {
                warnings.push(`Skipped (unparseable date): "${row[COL.ItemName]}" — raw: "${row[COL.Date]}"`)
                skippedEmpty++
                continue
            }

            // --- Costs ---
            const costOriginal = parseFloat((row[COL.Cost] || '0').replace(/,/g, ''))
            let costUsd = 0
            let conversionError = false
            const rawConverted = (row[COL.ConvertedCost] || '').trim()
            if (rawConverted === '#N/A' || rawConverted === '') {
                conversionError = true
            } else {
                costUsd = parseFloat(rawConverted.replace(/,/g, ''))
                if (isNaN(costUsd)) {
                    conversionError = true
                    costUsd = 0
                }
            }

            // --- Exchange rate ---
            let exchangeRate = null
            if (!conversionError && costUsd !== 0) {
                exchangeRate = costOriginal / costUsd
            }

            // --- Currency ---
            const currency = (row[COL.Currency] || 'USD').trim()

            // --- Category ---
            const category = (row[COL.SpendType] || '').trim() || null

            // --- Notes ---
            const notes = (row[COL.Notes] || '').trim() || null

            // --- Paid By (first name → user ID) ---
            const paidByName = (row[COL.PaidBy] || '').trim()
            const paidById = nameToId[paidByName]
            if (!paidById) {
                warnings.push(`Skipped (unknown paid_by "${paidByName}"): "${row[COL.ItemName]}"`)
                skippedUnknownPerson++
                continue
            }

            // --- Location (name → ID, auto-create if missing) ---
            const locationName = (row[COL.Location] || '').trim()
            let locationId = null
            if (locationName) {
                if (locationToId[locationName] !== undefined) {
                    locationId = locationToId[locationName]
                } else {
                    // Auto-create
                    if (!dryRun) {
                        const newLoc = await client.query(
                            'INSERT INTO locations (trip_id, name) VALUES ($1, $2) ON CONFLICT (trip_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                            [tripId, locationName]
                        )
                        locationId = newLoc.rows[0].id
                        locationToId[locationName] = locationId
                    } else {
                        locationId = -1 // placeholder for dry-run
                        locationToId[locationName] = locationId
                    }
                    autoCreatedLocations.push(locationName)
                }
            }

            // --- Reported by (email → user ID) ---
            const emailRaw = (row[COL.Email] || '').trim().toLowerCase()
            const reportedById = emailToId[emailRaw] || null

            // --- Reported at ---
            const reportedAt = parseTimestamp(row[COL.Timestamp])

            // --- Split Between → participant user IDs ---
            const splitRaw = (row[COL.SplitBetween] || '').trim()
            let participantIds = []
            if (splitRaw.toLowerCase() === 'everyone') {
                participantIds = tripParticipantIds
            } else {
                const names = splitRaw.split(',').map((n) => n.trim()).filter(Boolean)
                for (const n of names) {
                    const uid = nameToId[n]
                    if (uid) {
                        participantIds.push(uid)
                    } else {
                        warnings.push(`Unknown split participant "${n}" on "${row[COL.ItemName]}" — skipping that participant`)
                    }
                }
            }

            if (dryRun) {
                inserted++
                continue
            }

            // --- Insert expense + participants in a transaction ---
            await client.query('BEGIN')
            try {
                const expRes = await client.query(
                    `INSERT INTO expenses
                        (trip_id, name, date, cost_original, currency, cost_converted_usd,
                         exchange_rate, conversion_error, category, location_id,
                         paid_by, notes, reported_by, reported_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                     RETURNING id`,
                    [
                        tripId,
                        row[COL.ItemName].trim(),
                        dateStr,
                        isNaN(costOriginal) ? 0 : costOriginal,
                        currency,
                        costUsd,
                        exchangeRate,
                        conversionError,
                        category,
                        locationId,
                        paidById,
                        notes,
                        reportedById,
                        reportedAt,
                    ]
                )
                const expenseId = expRes.rows[0].id

                for (const uid of participantIds) {
                    await client.query(
                        'INSERT INTO expense_participants (expense_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [expenseId, uid]
                    )
                }

                await client.query('COMMIT')
                inserted++
            } catch (err) {
                await client.query('ROLLBACK')
                warnings.push(`Failed to insert "${row[COL.ItemName]}": ${err.message}`)
            }
        }

        // Summary
        console.log(`\nDone — ${tripName} (id=${tripId})${dryRun ? ' [DRY RUN]' : ''}`)
        console.log(`  Rows processed:          ${records.length}`)
        console.log(`  Expenses inserted:       ${inserted}`)
        console.log(`  Skipped (empty row):     ${skippedEmpty}`)
        console.log(`  Skipped (unknown person):${skippedUnknownPerson}`)
        if (autoCreatedLocations.length > 0) {
            const unique = [...new Set(autoCreatedLocations)]
            console.log(`  Locations auto-created:  ${unique.length} (${unique.join(', ')})`)
        }
        if (warnings.length > 0) {
            console.log(`\nWarnings (${warnings.length}):`)
            warnings.forEach((w) => console.log(`  ⚠  ${w}`))
        }
    } finally {
        await client.end()
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a date string from the CSV.
 * Handles M/D/YYYY, M/D/YY, and the known typo 0024 → 2024.
 * Returns an ISO date string (YYYY-MM-DD) or null if unparseable.
 */
function fixDate(raw) {
    if (!raw) return null
    const str = raw.trim()

    // Try M/D/YYYY or M/D/YY
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (!match) return null

    let [, m, d, y] = match
    let year = parseInt(y, 10)

    // Fix known typo: 0024 → 2024; also handle 2-digit years
    if (year < 100) year += 2000
    if (year < 1000) year += 2000  // e.g. 0024 parsed as 24 → 2024

    const month = m.padStart(2, '0')
    const day = d.padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Parse a Google Forms timestamp like "11/23/2024 5:25:06" or "3/29/2025 20:54:43"
 * into a value Postgres will accept as TIMESTAMPTZ. Returns null if empty.
 */
function parseTimestamp(raw) {
    if (!raw || raw.trim() === '') return null
    // Google Forms timestamps are local time without timezone info.
    // Store as-is and let Postgres use its server timezone (UTC on Neon).
    return raw.trim()
}

main().catch((err) => {
    console.error(`\n❌ ${err.message}`)
    process.exit(1)
})
