#!/usr/bin/env node
/**
 * Start all local development services:
 *   - Docker (Postgres + Metabase)
 *   - Next.js dev server
 *
 * Usage: pnpm start:local
 */

const { execSync, spawn } = require('child_process')

console.log('Starting Docker services...')
execSync('docker compose -f infra/docker-compose.yml up -d', { stdio: 'inherit' })

console.log('\nDocker services running:')
console.log('  Postgres  → localhost:5432')
console.log('  Metabase  → localhost:3001')
console.log('\nStarting Next.js...\n')

const dev = spawn('pnpm', ['dev'], { stdio: 'inherit', shell: true })
dev.on('exit', (code) => process.exit(code ?? 0))
