import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * POST /api/health/supplement-logs/dose — take (delta 1) or take back
 * (delta -1) one dose of a supplement on a date. Atomic, so rapid taps on the
 * home page's daily stack can't race: +1 upserts the day's row
 * (quantity + 1), −1 decrements it and deletes it at zero (supplement_logs
 * has no soft delete — same as DELETE /supplement-logs/[id]).
 * Returns the day's row, or `null` once it's gone.
 */
export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { supplementId, date, delta } = await request.json()
    if (!supplementId || typeof date !== 'string' || !DATE_RE.test(date) || (delta !== 1 && delta !== -1)) {
        return NextResponse.json(
            { error: 'supplementId, date (YYYY-MM-DD) and delta (1 or -1) are required' },
            { status: 400 }
        )
    }

    const check = await pool.query(
        'SELECT id FROM supplements WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [supplementId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Supplement not found' }, { status: 404 })
    }

    try {
        const row = await withAuditUser(authUser.userId, async (client) => {
            if (delta === 1) {
                const res = await client.query(
                    `INSERT INTO supplement_logs (user_id, supplement_id, date, quantity)
                     VALUES ($1, $2, $3, 1)
                     ON CONFLICT (user_id, supplement_id, date)
                     DO UPDATE SET quantity = supplement_logs.quantity + 1, updated_at = now()
                     RETURNING id, supplement_id, date, quantity, created_at`,
                    [authUser.userId, supplementId, date]
                )
                return res.rows[0]
            }
            const dec = await client.query(
                `UPDATE supplement_logs SET quantity = quantity - 1, updated_at = now()
                 WHERE user_id = $1 AND supplement_id = $2 AND date = $3 AND quantity > 1
                 RETURNING id, supplement_id, date, quantity, created_at`,
                [authUser.userId, supplementId, date]
            )
            if (dec.rows.length) return dec.rows[0]
            await client.query(
                `DELETE FROM supplement_logs
                 WHERE user_id = $1 AND supplement_id = $2 AND date = $3`,
                [authUser.userId, supplementId, date]
            )
            return null
        })

        return NextResponse.json(
            row && {
                id: Number(row.id),
                supplementId: Number(row.supplement_id),
                date: row.date.toISOString().split('T')[0],
                quantity: row.quantity,
                createdAt: row.created_at.toISOString(),
            }
        )
    } catch (err) {
        console.error('Error logging supplement dose:', err)
        return NextResponse.json({ error: 'Failed to log dose' }, { status: 500 })
    }
}
