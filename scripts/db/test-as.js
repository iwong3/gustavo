// Usage:
//   pnpm db:test-as viewer              — set your role to viewer on all trips
//   pnpm db:test-as editor              — set your role to editor on all trips
//   pnpm db:test-as owner               — set your role to owner on all trips
//   pnpm db:test-as --no-admin          — remove admin flag
//   pnpm db:test-as --admin             — restore admin flag
//   pnpm db:test-as viewer --no-admin   — combine both
//   pnpm db:test-as reset               — restore owner + admin (original state)
//   pnpm db:test-as status              — show current role/admin state

const { Client } = require('pg')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    console.error('❌ DATABASE_URL is not set')
    process.exit(1)
}

const EMAIL = 'ivanwong15@gmail.com'
const VALID_ROLES = ['owner', 'editor', 'viewer']

async function main() {
    const args = process.argv.slice(2)
    const role = args.find((a) => VALID_ROLES.includes(a) || a === 'reset' || a === 'status')
    const adminFlag = args.find((a) => a === '--admin' || a === '--no-admin')

    if (!role && !adminFlag) {
        console.log('Usage: pnpm db:test-as <role|reset|status> [--admin|--no-admin]')
        console.log('  Roles: viewer, editor, owner')
        console.log('  reset: restore owner + admin')
        console.log('  status: show current state')
        process.exit(0)
    }

    const client = new Client({ connectionString })
    await client.connect()

    try {
        const { rows: [user] } = await client.query(
            `SELECT id FROM users WHERE email = $1`, [EMAIL]
        )
        if (!user) {
            console.error(`❌ User ${EMAIL} not found`)
            process.exit(1)
        }

        if (role === 'status') {
            const { rows: [u] } = await client.query(
                `SELECT is_admin FROM users WHERE id = $1`, [user.id]
            )
            const { rows: trips } = await client.query(
                `SELECT t.name, tp.role FROM trip_participants tp
                 JOIN trips t ON t.id = tp.trip_id
                 WHERE tp.user_id = $1 AND t.deleted_at IS NULL
                 ORDER BY t.name`, [user.id]
            )
            console.log(`Admin: ${u.is_admin ? 'yes' : 'no'}`)
            console.log('Trips:')
            for (const t of trips) {
                console.log(`  ${t.name}: ${t.role}`)
            }
            return
        }

        const isReset = role === 'reset'
        const targetRole = isReset ? 'owner' : role
        const targetAdmin = isReset ? true : adminFlag === '--admin' ? true : adminFlag === '--no-admin' ? false : null

        if (targetRole) {
            await client.query(
                `UPDATE trip_participants SET role = $1
                 WHERE user_id = $2 AND left_at IS NULL`,
                [targetRole, user.id]
            )
            console.log(`✅ Role set to: ${targetRole} (all trips)`)
        }

        if (targetAdmin !== null) {
            await client.query(
                `UPDATE users SET is_admin = $1 WHERE id = $2`,
                [targetAdmin, user.id]
            )
            console.log(`✅ Admin: ${targetAdmin ? 'yes' : 'no'}`)
        }

        if (isReset) {
            console.log('🔄 Reset to original state (owner + admin)')
        }
    } finally {
        await client.end()
    }
}

main().catch((err) => {
    console.error('❌', err.message)
    process.exit(1)
})
