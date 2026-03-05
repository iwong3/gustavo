#!/usr/bin/env node
/**
 * Database seed runner
 *
 * Runs all seed files in database/seeds/ in order.
 * Seed files should be idempotent (use ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   pnpm db:seed                              # local (reads .env.local via --env-file)
 *   DATABASE_URL=<url> node scripts/seed.js   # any environment
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function seed() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set')
        process.exit(1)
    }

    const client = new Client({ connectionString })
    await client.connect()
    console.log('Connected to database\n')

    try {
        const seedsDir = path.join(__dirname, '..', 'database', 'seeds')

        if (!fs.existsSync(seedsDir)) {
            console.log('No seeds directory found at database/seeds/')
            return
        }

        const files = fs
            .readdirSync(seedsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort()

        if (files.length === 0) {
            console.log('No seed files found in database/seeds/')
            return
        }

        let count = 0
        for (const file of files) {
            console.log(`🌱 Running ${file}...`)
            const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8')

            await client.query('BEGIN')
            try {
                await client.query(sql)
                await client.query('COMMIT')
                console.log(`✅ ${file} applied`)
                count++
            } catch (err) {
                await client.query('ROLLBACK')
                throw new Error(`Seed ${file} failed: ${err.message}`)
            }
        }

        console.log(`\n${count} seed file(s) applied.`)
    } finally {
        await client.end()
    }
}

seed().catch((err) => {
    console.error(`\n❌ ${err.message}`)
    process.exit(1)
})
