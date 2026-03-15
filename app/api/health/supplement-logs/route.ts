import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')

    let query = `
        SELECT sl.id, sl.supplement_id, s.name AS supplement_name, sl.date, sl.created_at
        FROM supplement_logs sl
        JOIN supplements s ON s.id = sl.supplement_id
        WHERE sl.user_id = $1`

    const params: (string | number)[] = [authUser.userId]

    if (date) {
        params.push(date)
        query += ` AND sl.date = $${params.length}`
    }

    query += ` ORDER BY sl.date DESC, s.name`

    const { rows } = await pool.query(query, params)

    return NextResponse.json(
        rows.map((r) => ({
            id: r.id,
            supplementId: r.supplement_id,
            supplementName: r.supplement_name,
            date: r.date.toISOString().split('T')[0],
            createdAt: r.created_at.toISOString(),
        }))
    )
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, supplementId } = await request.json()

    if (!date || !supplementId) {
        return NextResponse.json(
            { error: 'date and supplementId are required' },
            { status: 400 }
        )
    }

    // Verify supplement belongs to user
    const check = await pool.query(
        'SELECT id FROM supplements WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [supplementId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Supplement not found' }, { status: 404 })
    }

    try {
        const log = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO supplement_logs (user_id, supplement_id, date)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, supplement_id, date) DO NOTHING
                 RETURNING id, supplement_id, date, created_at`,
                [authUser.userId, supplementId, date]
            )
            // If ON CONFLICT hit, return existing
            if (res.rows.length === 0) {
                const existing = await client.query(
                    `SELECT id, supplement_id, date, created_at
                     FROM supplement_logs
                     WHERE user_id = $1 AND supplement_id = $2 AND date = $3`,
                    [authUser.userId, supplementId, date]
                )
                return existing.rows[0]
            }
            return res.rows[0]
        })

        return NextResponse.json({
            id: log.id,
            supplementId: log.supplement_id,
            date: log.date.toISOString().split('T')[0],
            createdAt: log.created_at.toISOString(),
        }, { status: 201 })
    } catch (err) {
        console.error('Error logging supplement:', err)
        return NextResponse.json({ error: 'Failed to log supplement' }, { status: 500 })
    }
}
