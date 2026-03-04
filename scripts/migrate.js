#!/usr/bin/env node
/**
 * Database migration runner
 *
 * Applies all pending migrations in database/migrations/ in order.
 * Tracks applied migrations in the schema_migrations table.
 *
 * Usage:
 *   pnpm db:migrate              # local (reads .env.local via --env-file)
 *   DATABASE_URL=<url> node scripts/migrate.js  # any environment
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function migrate() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set')
        process.exit(1)
    }

    const client = new Client({ connectionString })
    await client.connect()
    console.log('Connected to database\n')

    try {
        // Create migration tracking table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            )
        `)

        // Get already-applied migrations
        const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version')
        const applied = new Set(rows.map((r) => r.version))

        // Find migration files
        const migrationsDir = path.join(__dirname, '..', 'database', 'migrations')
        const files = fs
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort()

        if (files.length === 0) {
            console.log('No migration files found in database/migrations/')
            return
        }

        let count = 0
        for (const file of files) {
            const version = path.basename(file, '.sql')

            if (applied.has(version)) {
                console.log(`⏭  ${version} (already applied)`)
                continue
            }

            console.log(`🏗  Applying ${version}...`)
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

            await client.query('BEGIN')
            try {
                await client.query(sql)
                await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version])
                await client.query('COMMIT')
                console.log(`✅ ${version} applied`)
                count++
            } catch (err) {
                await client.query('ROLLBACK')
                throw new Error(`Migration ${version} failed: ${err.message}`)
            }
        }

        console.log(`\n${count} migration(s) applied.`)
    } finally {
        await client.end()
    }
}

migrate().catch((err) => {
    console.error(`\n❌ ${err.message}`)
    process.exit(1)
})
