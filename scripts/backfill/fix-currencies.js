#!/usr/bin/env node
/**
 * Fix currency data for trips where the CSV had a duplicate "Currency" column,
 * causing all expenses to be imported as USD.
 *
 * Reads the CSV (handling duplicate columns properly), matches expenses by
 * name + date + trip, and updates currency, cost_original, cost_converted_usd,
 * and exchange_rate.
 *
 * Usage:
 *   node scripts/backfill/fix-currencies.js --file "scripts/backfill/data/2024 Japan Spend.csv" --trip-id 1
 *   node scripts/backfill/fix-currencies.js --file "..." --trip-id 1 --dry-run
 *
 * Prod:
 *   DATABASE_URL=<neon-url> node scripts/backfill/fix-currencies.js --file ... --trip-id 1
 */

const { Client } = require('pg')
const fs = require('fs')

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
const dryRun = hasFlag('--dry-run')

if (!csvFile || !tripId) {
    console.error('Usage: fix-currencies.js --file <path> --trip-id <n> [--dry-run]')
    process.exit(1)
}

if (!fs.existsSync(csvFile)) {
    console.error(`File not found: ${csvFile}`)
    process.exit(1)
}

// ---------------------------------------------------------------------------
// Custom CSV parser that handles duplicate column names
// ---------------------------------------------------------------------------

function parseCSVWithDuplicateColumns(raw) {
    // Use csv-parse but with column indices, not names
    const { parse } = require('csv-parse/sync')
    const rows = parse(raw, {
        columns: false,       // return arrays, not objects
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
    })

    if (rows.length === 0) return []

    // Find the FIRST occurrence of each column name in the header
    const header = rows[0]
    const colIndex = {}
    for (let i = 0; i < header.length; i++) {
        const name = header[i].trim()
        if (!(name in colIndex)) {
            colIndex[name] = i  // first occurrence wins
        }
    }

    // Map data rows to objects using first-occurrence indices
    const records = []
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r]
        const obj = {}
        for (const [name, idx] of Object.entries(colIndex)) {
            obj[name] = row[idx] || ''
        }
        records.push(obj)
    }

    return records
}

// ---------------------------------------------------------------------------
// Date parsing (same as import-expenses.js)
// ---------------------------------------------------------------------------

function fixDate(raw) {
    if (!raw) return null
    const str = raw.trim()
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (!match) return null
    let [, m, d, y] = match
    let year = parseInt(y, 10)
    if (year < 100) year += 2000
    if (year < 1000) year += 2000
    const month = m.padStart(2, '0')
    const day = d.padStart(2, '0')
    return `${year}-${month}-${day}`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set')
        process.exit(1)
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    console.log(`Connected to database${dryRun ? ' (DRY RUN)' : ''}\n`)

    try {
        // Verify trip
        const tripRes = await client.query(
            'SELECT id, name, currency FROM trips WHERE id = $1 AND deleted_at IS NULL',
            [tripId]
        )
        if (tripRes.rows.length === 0) throw new Error(`Trip id=${tripId} not found`)
        console.log(`Fixing currencies for: ${tripRes.rows[0].name} (id=${tripId})\n`)

        // Load existing expenses
        const expRes = await client.query(
            `SELECT id, name, date, currency, cost_original, cost_converted_usd
             FROM expenses WHERE trip_id = $1 AND deleted_at IS NULL
             ORDER BY date, id`,
            [tripId]
        )
        console.log(`Existing expenses in DB: ${expRes.rows.length}`)

        // Build lookup: "name|date" → [expense rows] (multiple matches possible)
        const dbLookup = new Map()
        for (const row of expRes.rows) {
            const dateStr = typeof row.date === 'string'
                ? row.date.slice(0, 10)
                : new Date(row.date).toISOString().slice(0, 10)
            const key = `${row.name.trim().toLowerCase()}|${dateStr}`
            const list = dbLookup.get(key) || []
            list.push(row)
            dbLookup.set(key, list)
        }

        // Parse CSV with duplicate column handling
        const raw = fs.readFileSync(csvFile, 'utf8')
        const records = parseCSVWithDuplicateColumns(raw)
        console.log(`CSV records: ${records.length}\n`)

        let updated = 0
        let alreadyCorrect = 0
        let notFound = 0
        let ambiguous = 0
        const warnings = []

        for (const row of records) {
            const name = (row['Item Name'] || '').trim()
            if (!name) continue

            const dateStr = fixDate(row['Date'])
            if (!dateStr) continue

            const csvCurrency = (row['Currency'] || 'USD').trim()
            const csvCost = parseFloat((row['Cost'] || '0').replace(/,/g, ''))
            const csvConverted = parseFloat((row['Converted Cost'] || '0').replace(/,/g, ''))

            if (isNaN(csvCost)) continue

            // Look up in DB
            const key = `${name.toLowerCase()}|${dateStr}`
            const matches = dbLookup.get(key)

            if (!matches || matches.length === 0) {
                notFound++
                warnings.push(`Not found in DB: "${name}" on ${dateStr}`)
                continue
            }

            if (matches.length > 1) {
                // Multiple expenses with same name+date — try to match by cost.
                // DB may have cost_original as JPY (already fixed) or as the USD-converted
                // value (imported incorrectly as USD). Check all combinations.
                const costMatch = matches.find((m) => {
                    const dbOriginal = parseFloat(m.cost_original)
                    const dbConverted = parseFloat(m.cost_converted_usd)
                    return (
                        Math.abs(dbOriginal - csvCost) < 0.01 ||
                        Math.abs(dbOriginal - csvConverted) < 0.01 ||
                        Math.abs(dbConverted - csvConverted) < 0.01
                    )
                })
                if (!costMatch) {
                    ambiguous++
                    warnings.push(`Ambiguous (${matches.length} matches): "${name}" on ${dateStr}`)
                    continue
                }
                matches.splice(0, matches.length, costMatch)
            }

            const dbRow = matches[0]
            const dbCurrency = dbRow.currency

            // Check if already correct
            if (dbCurrency === csvCurrency && Math.abs(parseFloat(dbRow.cost_original) - csvCost) < 0.01) {
                alreadyCorrect++
                continue
            }

            // Compute exchange rate
            let exchangeRate = null
            let costUsd = csvConverted
            if (!isNaN(csvConverted) && csvConverted > 0 && csvCost > 0 && csvCurrency !== 'USD') {
                exchangeRate = csvCost / csvConverted
            }
            if (csvCurrency === 'USD') {
                costUsd = csvCost
            }

            if (!dryRun) {
                await client.query(
                    `UPDATE expenses
                     SET currency = $1, cost_original = $2, cost_converted_usd = $3, exchange_rate = $4
                     WHERE id = $5`,
                    [csvCurrency, csvCost, costUsd, exchangeRate, dbRow.id]
                )
            }

            console.log(`  ${dryRun ? '[DRY] ' : ''}Updated: "${name}" (${dateStr}) — ${dbCurrency} ${parseFloat(dbRow.cost_original)} → ${csvCurrency} ${csvCost}`)
            updated++

            // Remove from lookup so duplicates don't re-match
            const idx = matches.indexOf(dbRow)
            if (idx !== -1) matches.splice(idx, 1)
        }

        console.log(`\nSummary:`)
        console.log(`  Updated:          ${updated}`)
        console.log(`  Already correct:  ${alreadyCorrect}`)
        console.log(`  Not found in DB:  ${notFound}`)
        console.log(`  Ambiguous:        ${ambiguous}`)

        if (warnings.length > 0) {
            console.log(`\nWarnings (${warnings.length}):`)
            warnings.forEach((w) => console.log(`  !  ${w}`))
        }
    } finally {
        await client.end()
    }
}

main().catch((err) => {
    console.error(`\n${err.message}`)
    process.exit(1)
})
