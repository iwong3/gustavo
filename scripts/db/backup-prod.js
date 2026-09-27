#!/usr/bin/env node
/**
 * Prod database backup
 *
 * Runs pg_dump against the prod (Neon) database and writes a custom-format
 * dump to backups/prod-<timestamp>.dump. Read-only against prod.
 *
 * Usage:
 *   pnpm db:backup:prod            # reads .env.production.local via --env-file
 *
 * Requires pg_dump on PATH (PostgreSQL 17 client tools).
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups')

/** Refuse anything that isn't obviously the Neon prod host. */
function assertProdUrl(url) {
    const host = new URL(url).hostname
    if (!host.endsWith('.neon.tech')) {
        console.error(`❌ Refusing to back up non-Neon host: ${host}`)
        process.exit(1)
    }
}

/** Neon recommends the direct (non-pooler) endpoint for pg_dump. */
function toDirectEndpoint(url) {
    const u = new URL(url)
    u.hostname = u.hostname.replace('-pooler', '')
    return u.toString()
}

function timestamp() {
    return new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
}

function backupProd() {
    const prodUrl = process.env.DATABASE_URL
    if (!prodUrl) {
        console.error('❌ DATABASE_URL is not set (expected .env.production.local)')
        process.exit(1)
    }
    assertProdUrl(prodUrl)

    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    const file = path.join(BACKUP_DIR, `prod-${timestamp()}.dump`)

    console.log(`📦 Dumping prod → ${path.relative(process.cwd(), file)}`)
    const result = spawnSync(
        'pg_dump',
        ['--format=custom', '--no-owner', '--no-privileges', `--file=${file}`, toDirectEndpoint(prodUrl)],
        { stdio: 'inherit' },
    )
    if (result.error) {
        console.error(`❌ Could not run pg_dump: ${result.error.message} (is PostgreSQL bin on PATH?)`)
        process.exit(1)
    }
    if (result.status !== 0) {
        console.error(`❌ pg_dump exited with code ${result.status}`)
        process.exit(result.status ?? 1)
    }

    const sizeKb = Math.round(fs.statSync(file).size / 1024)
    console.log(`✅ Backup written (${sizeKb} KB)`)
    return file
}

module.exports = { backupProd }

if (require.main === module) {
    backupProd()
}
