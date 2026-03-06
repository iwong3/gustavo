import { PoolClient } from 'pg'
import pool from '@/lib/db'

/**
 * Runs a DB transaction with audit user attribution.
 *
 * Sets `audit.changed_by` session variable so the audit trigger
 * records which user made the change. The variable is scoped to
 * the transaction (SET LOCAL) and is automatically cleared on commit/rollback.
 *
 * Usage:
 *   const result = await withAuditUser(userId, async (client) => {
 *       await client.query('UPDATE expenses SET ...', [...])
 *       return { ok: true }
 *   })
 */
export async function withAuditUser<T>(
    userId: number | null,
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        if (userId != null) {
            await client.query(`SET LOCAL audit.changed_by = '${userId}'`)
        }
        const result = await fn(client)
        await client.query('COMMIT')
        return result
    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    } finally {
        client.release()
    }
}
