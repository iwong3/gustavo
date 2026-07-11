/**
 * Regression tests for the OCC millisecond contract (lib/occ.ts).
 *
 * Background: Postgres stores updated_at with microsecond precision, but
 * clients only ever see milliseconds (serialization goes through a JS Date).
 * A raw SQL equality against the client token therefore never matches, which
 * made every expense/trip/category delete fail with a false 409 conflict.
 *
 * The SQL tests run against the local docker Postgres (pnpm docker:up) so
 * they exercise real timestamptz semantics — a pure JS test can't catch a
 * broken SQL predicate. Everything runs in a rolled-back transaction on a
 * temp table; no app data is touched.
 */
import { Pool, PoolClient } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { occMatchSql, occTokensMatch } from '../lib/occ'

describe('occTokensMatch (JS-side comparison)', () => {
    it('matches when the client token equals the db value at ms precision', () => {
        expect(occTokensMatch('2026-07-11T10:00:00.123Z', '2026-07-11T10:00:00.123Z')).toBe(true)
        expect(occTokensMatch(new Date('2026-07-11T10:00:00.123Z'), '2026-07-11T10:00:00.123Z')).toBe(true)
    })

    it('rejects a stale token', () => {
        expect(occTokensMatch('2026-07-11T10:00:00.123Z', '2026-07-11T10:00:00.122Z')).toBe(false)
    })
})

describe('occMatchSql (SQL predicate against real Postgres)', () => {
    const pool = new Pool({
        connectionString:
            process.env.TEST_DATABASE_URL ??
            'postgres://gus:yellow_shirt_dev@localhost:5432/gustavo_dev',
    })
    let client: PoolClient
    /** The token as the API serializes it: through a JS Date, ms precision. */
    let clientToken: string

    beforeAll(async () => {
        client = await pool.connect()
        await client.query('BEGIN')
        await client.query(
            'CREATE TEMP TABLE occ_test (id INT PRIMARY KEY, updated_at TIMESTAMPTZ NOT NULL) ON COMMIT DROP'
        )
        // Microsecond-precision timestamp, like every NOW()-written row in prod
        await client.query(
            `INSERT INTO occ_test (id, updated_at) VALUES (1, '2026-07-11T10:00:00.123456+00')`
        )
        const res = await client.query('SELECT updated_at FROM occ_test WHERE id = 1')
        clientToken = new Date(res.rows[0].updated_at).toISOString()
    })

    afterAll(async () => {
        await client?.query('ROLLBACK')
        client?.release()
        await pool.end()
    })

    it('sanity: the client token really has lost microsecond precision', () => {
        expect(clientToken).toBe('2026-07-11T10:00:00.123Z')
    })

    it('raw equality fails against a microsecond timestamp (the original bug)', async () => {
        const res = await client.query(
            'SELECT id FROM occ_test WHERE id = 1 AND updated_at = $1',
            [clientToken]
        )
        expect(res.rows).toHaveLength(0)
    })

    it('occMatchSql matches the row the client saw', async () => {
        const res = await client.query(
            `SELECT id FROM occ_test WHERE id = 1 AND ${occMatchSql('updated_at', '$1')}`,
            [clientToken]
        )
        expect(res.rows).toHaveLength(1)
    })

    it('occMatchSql still detects a genuine conflict (stale token)', async () => {
        const staleToken = '2026-07-11T09:59:59.999Z'
        const res = await client.query(
            `SELECT id FROM occ_test WHERE id = 1 AND ${occMatchSql('updated_at', '$1')}`,
            [staleToken]
        )
        expect(res.rows).toHaveLength(0)
    })

    it('soft-delete UPDATE with occMatchSql affects the row (the delete path shape)', async () => {
        const res = await client.query(
            `UPDATE occ_test SET updated_at = NOW()
             WHERE id = 1 AND ${occMatchSql('updated_at', '$1')}
             RETURNING id`,
            [clientToken]
        )
        expect(res.rows).toHaveLength(1)
    })
})
