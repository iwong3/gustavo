import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { SupplementEvent } from '@/lib/health-types'

/**
 * GET /api/health/supplement-events — every stack change (started / stopped /
 * dose_changed) for the signed-in user, oldest first. Written by the
 * supplements API (create, edit, stop/start); read-only here.
 */
export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rows } = await pool.query(
        `SELECT e.id, e.supplement_id, to_char(e.date, 'YYYY-MM-DD') AS date,
                e.kind, e.daily_doses, e.updated_at
         FROM supplement_events e
         JOIN supplements s ON s.id = e.supplement_id AND s.deleted_at IS NULL
         WHERE e.user_id = $1 AND e.deleted_at IS NULL
         ORDER BY e.date, e.id`,
        [authUser.userId]
    )

    const events: SupplementEvent[] = rows.map((r) => ({
        id: Number(r.id),
        supplementId: Number(r.supplement_id),
        date: r.date,
        kind: r.kind,
        dailyDoses: r.daily_doses ?? null,
        recordedAt: r.updated_at.toISOString(),
    }))
    return NextResponse.json(events)
}
