#!/usr/bin/env node
// Quick sanity check for the three API route queries.
// Run: node --env-file=.env.local scripts/backfill/test-api-queries.js

const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
    // ----------------------------------------------------------------
    // /api/trips
    // ----------------------------------------------------------------
    const trips = await pool.query(`
        SELECT
            t.id, t.name, t.start_date, t.end_date,
            ARRAY_AGG(
                DISTINCT split_part(u.name, ' ', 1)
                ORDER BY split_part(u.name, ' ', 1)
            ) FILTER (WHERE u.name IS NOT NULL) AS participants
        FROM trips t
        LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.left_at IS NULL
        LEFT JOIN users u ON tp.user_id = u.id
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.start_date DESC
    `)
    console.log(`=== /api/trips (${trips.rows.length} trips) ===`)
    for (const t of trips.rows) {
        console.log(`  [${t.id}] ${t.name}  →  ${(t.participants || []).join(', ')}`)
    }

    // ----------------------------------------------------------------
    // /api/trips/[tripId]/expenses — test each trip
    // ----------------------------------------------------------------
    for (const trip of trips.rows) {
        const [expRes, partRes] = await Promise.all([
            pool.query(`
                SELECT
                    e.id, e.name, e.date, e.cost_original, e.currency, e.cost_converted_usd,
                    e.conversion_error, e.category, e.notes,
                    l.name AS location_name,
                    payer.name AS paid_by_name,
                    reporter.email AS reported_by_email,
                    ARRAY_AGG(
                        DISTINCT split_part(participant.name, ' ', 1)
                        ORDER BY split_part(participant.name, ' ', 1)
                    ) FILTER (WHERE participant.name IS NOT NULL) AS split_between
                FROM expenses e
                JOIN users payer ON e.paid_by = payer.id
                LEFT JOIN users reporter ON e.reported_by = reporter.id
                LEFT JOIN locations l ON e.location_id = l.id
                LEFT JOIN expense_participants ep ON ep.expense_id = e.id
                LEFT JOIN users participant ON ep.user_id = participant.id
                WHERE e.trip_id = $1 AND e.deleted_at IS NULL
                GROUP BY e.id, l.name, payer.name, reporter.email
                ORDER BY e.date, e.created_at
            `, [trip.id]),
            pool.query(
                'SELECT COUNT(*)::int AS count FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL',
                [trip.id]
            ),
        ])

        const participantCount = partRes.rows[0].count
        const expenses = expRes.rows
        const everyoneCount = expenses.filter(
            (r) => (r.split_between || []).length === participantCount
        ).length

        console.log(`\n=== /api/trips/${trip.id}/expenses — ${trip.name} ===`)
        console.log(`  Total expenses: ${expenses.length}`)
        console.log(`  "Everyone" splits: ${everyoneCount}`)
        console.log(`  Individual splits: ${expenses.length - everyoneCount}`)
        console.log(`  Conversion errors: ${expenses.filter((r) => r.conversion_error).length}`)

        // Print first 2 rows as a spot-check
        for (const r of expenses.slice(0, 2)) {
            const isEveryone = (r.split_between || []).length === participantCount
            const dateStr = r.date.toISOString().slice(0, 10)
            const payer = r.paid_by_name.split(' ')[0]
            const split = isEveryone ? 'Everyone' : (r.split_between || []).join(', ')
            console.log(`  ${dateStr}  ${r.name.slice(0, 35).padEnd(35)}  ${payer.padEnd(8)}  [${split}]`)
        }
    }

    // ----------------------------------------------------------------
    // /api/trips/[tripId]/locations — test each trip
    // ----------------------------------------------------------------
    console.log('\n=== /api/trips/[tripId]/locations ===')
    for (const trip of trips.rows) {
        const locsRes = await pool.query(
            'SELECT id, name FROM locations WHERE trip_id = $1 AND deleted_at IS NULL ORDER BY name',
            [trip.id]
        )
        console.log(`  ${trip.name}: ${locsRes.rows.map((l) => l.name).join(', ')}`)
    }

    await pool.end()
    console.log('\nAll checks passed.')
}

run().catch((err) => {
    console.error(`❌ ${err.message}`)
    process.exit(1)
})
