import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = `
        SELECT id, date, weight_lbs, created_at
        FROM weight_logs
        WHERE user_id = $1 AND deleted_at IS NULL`

    const params: (string | number)[] = [authUser.userId]

    if (from) {
        params.push(from)
        query += ` AND date >= $${params.length}`
    }
    if (to) {
        params.push(to)
        query += ` AND date <= $${params.length}`
    }

    query += ` ORDER BY date DESC, created_at DESC`

    const { rows } = await pool.query(query, params)

    return NextResponse.json(
        rows.map((r) => ({
            id: Number(r.id),
            date: r.date.toISOString().split('T')[0],
            weightLbs: Number(r.weight_lbs),
            createdAt: r.created_at.toISOString(),
        }))
    )
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, weightLbs } = await request.json()

    if (!date || weightLbs == null) {
        return NextResponse.json(
            { error: 'date and weightLbs are required' },
            { status: 400 }
        )
    }

    try {
        const log = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO weight_logs (user_id, date, weight_lbs)
                 VALUES ($1, $2, $3)
                 RETURNING id, date, weight_lbs, created_at`,
                [authUser.userId, date, weightLbs]
            )
            return res.rows[0]
        })

        return NextResponse.json({
            id: Number(log.id),
            date: log.date.toISOString().split('T')[0],
            weightLbs: Number(log.weight_lbs),
            createdAt: log.created_at.toISOString(),
        }, { status: 201 })
    } catch (err) {
        console.error('Error logging weight:', err)
        return NextResponse.json({ error: 'Failed to log weight' }, { status: 500 })
    }
}
