import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = `
        SELECT sl.id, sl.symptom_id, s.name AS symptom_name, sl.date, sl.notes, sl.created_at
        FROM symptom_logs sl
        JOIN symptoms s ON s.id = sl.symptom_id
        WHERE sl.user_id = $1`

    const params: (string | number)[] = [authUser.userId]

    if (date) {
        params.push(date)
        query += ` AND sl.date = $${params.length}`
    } else {
        if (from) {
            params.push(from)
            query += ` AND sl.date >= $${params.length}`
        }
        if (to) {
            params.push(to)
            query += ` AND sl.date <= $${params.length}`
        }
    }

    query += ` ORDER BY sl.date DESC, s.name`

    const { rows } = await pool.query(query, params)

    return NextResponse.json(
        rows.map((r) => ({
            id: Number(r.id),
            symptomId: Number(r.symptom_id),
            symptomName: r.symptom_name,
            date: r.date.toISOString().split('T')[0],
            notes: r.notes,
            createdAt: r.created_at.toISOString(),
        }))
    )
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, symptomId, notes } = await request.json()

    if (!date || !symptomId) {
        return NextResponse.json(
            { error: 'date and symptomId are required' },
            { status: 400 }
        )
    }

    // Verify symptom belongs to user
    const check = await pool.query(
        'SELECT id FROM symptoms WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [symptomId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Symptom not found' }, { status: 404 })
    }

    try {
        const log = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO symptom_logs (user_id, symptom_id, date, notes)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, symptom_id, date)
                 DO UPDATE SET notes = COALESCE($4, symptom_logs.notes), updated_at = now()
                 RETURNING id, symptom_id, date, notes, created_at`,
                [authUser.userId, symptomId, date, notes || null]
            )
            return res.rows[0]
        })

        return NextResponse.json({
            id: Number(log.id),
            symptomId: Number(log.symptom_id),
            date: log.date.toISOString().split('T')[0],
            notes: log.notes,
            createdAt: log.created_at.toISOString(),
        }, { status: 201 })
    } catch (err) {
        console.error('Error logging symptom:', err)
        return NextResponse.json({ error: 'Failed to log symptom' }, { status: 500 })
    }
}
