#!/usr/bin/env node
/**
 * Pull prod data into the local dev database
 *
 * 1. Backs up prod (scripts/db/backup-prod.js → backups/prod-<ts>.dump)
 * 2. Drops and recreates the local gustavo_dev database (docker Postgres)
 * 3. pg_restores the dump into it
 * 4. Runs pending local migrations on top (pnpm db:migrate)
 *
 * Prod is only ever READ; the only database written to is localhost.
 *
 * Usage:
 *   pnpm db:pull-prod              # prompts for confirmation
 *   pnpm db:pull-prod --yes        # skip the prompt
 *
 * Requires pg_dump / pg_restore / psql on PATH (PostgreSQL 17 client tools).
 */

const { spawnSync } = require('child_process')
const path = require('path')
const readline = require('readline')
const { backupProd } = require('./backup-prod')

// Matches infra/docker-compose.yml. Override with LOCAL_DATABASE_URL if needed.
const LOCAL_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://gus:yellow_shirt_dev@localhost:5432/gustavo_dev'

function run(cmd, args, opts = {}) {
    const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
    if (result.error) {
        console.error(`❌ Could not run ${cmd}: ${result.error.message}`)
        process.exit(1)
    }
    return result.status
}

function assertLocalUrl(url) {
    const host = new URL(url).hostname
    if (!['localhost', '127.0.0.1'].includes(host)) {
        console.error(`❌ Refusing to restore into non-local host: ${host}`)
        process.exit(1)
    }
}

function confirm(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        rl.question(question, (answer) => {
            rl.close()
            resolve(answer.trim().toLowerCase() === 'y')
        })
    })
}

async function pullProd() {
    assertLocalUrl(LOCAL_URL)
    const local = new URL(LOCAL_URL)
    const dbName = local.pathname.slice(1)
    // Same credentials, but connect to the maintenance DB for drop/create
    const adminUrl = new URL(LOCAL_URL)
    adminUrl.pathname = '/postgres'

    if (!process.argv.includes('--yes')) {
        const ok = await confirm(`⚠️  This will DROP local database "${dbName}" and replace it with prod data. Continue? [y/N] `)
        if (!ok) {
            console.log('Aborted.')
            process.exit(0)
        }
    }

    // 1. Backup prod
    const dumpFile = backupProd()

    // 2. Recreate local DB
    console.log(`\n🗑️  Recreating local ${dbName}...`)
    const psql = (sql) => run('psql', ['--quiet', '-v', 'ON_ERROR_STOP=1', '-c', sql, adminUrl.toString()])
    if (psql(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();`) !== 0) process.exit(1)
    if (psql(`DROP DATABASE IF EXISTS ${dbName};`) !== 0) process.exit(1)
    if (psql(`CREATE DATABASE ${dbName};`) !== 0) process.exit(1)

    // 3. Restore
    console.log(`\n📥 Restoring ${path.basename(dumpFile)} into local...`)
    const status = run('pg_restore', ['--no-owner', '--no-privileges', `--dbname=${LOCAL_URL}`, dumpFile])
    if (status !== 0) {
        // pg_restore returns 1 for non-fatal warnings (e.g. missing extensions); data is usually fine
        console.warn(`⚠️  pg_restore exited with code ${status} — check output above for anything beyond warnings`)
    }

    // 4. Apply any local-only migrations
    console.log('\n🏗️  Running local migrations...')
    const envLocal = path.join(__dirname, '..', '..', '.env.local')
    if (run(process.execPath, [`--env-file=${envLocal}`, path.join(__dirname, 'migrate.js')]) !== 0) process.exit(1)

    console.log(`\n🎉 Local ${dbName} now mirrors prod (as of ${path.basename(dumpFile)})`)
}

pullProd()
