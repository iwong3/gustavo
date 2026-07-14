import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canAddSettlement } from '@/lib/permissions'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const res = await pool.query(
        `SELECT id, from_user_id, to_user_id, amount_usd, note, settled_on, created_by, created_at
         FROM settlements
         WHERE trip_id = $1 AND deleted_at IS NULL
         ORDER BY settled_on DESC, created_at DESC`,
        [id]
    )

    return NextResponse.json(
        res.rows.map((r) => ({
            id: r.id,
            fromUserId: r.from_user_id,
            toUserId: r.to_user_id,
            amountUsd: parseFloat(r.amount_usd),
            note: r.note,
            settledOn:
                typeof r.settled_on === 'string'
                    ? r.settled_on.slice(0, 10)
                    : new Date(r.settled_on).toISOString().slice(0, 10),
            createdBy: r.created_by,
            createdAt: r.created_at,
        }))
    )
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, isAdmin } = authUser

    const { role } = await getUserTripRole(userId, id)
    if (!canAddSettlement(role) && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const fromUserId = String(body.fromUserId ?? '')
    const toUserId = String(body.toUserId ?? '')
    const amountUsd = Number(body.amountUsd)
    const note = typeof body.note === 'string' && body.note.trim() !== '' ? body.note.trim() : null
    const settledOn =
        typeof body.settledOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.settledOn)
            ? body.settledOn
            : null // DB defaults to CURRENT_DATE

    if (!/^\d+$/.test(fromUserId) || !/^\d+$/.test(toUserId)) {
        return NextResponse.json({ error: 'Invalid payer or receiver' }, { status: 400 })
    }
    if (fromUserId === toUserId) {
        return NextResponse.json({ error: 'Payer and receiver must differ' }, { status: 400 })
    }
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    // Both people must be participants of this trip
    const tpRes = await pool.query(
        `SELECT user_id FROM trip_participants
         WHERE trip_id = $1 AND user_id = ANY($2::bigint[]) AND left_at IS NULL`,
        [id, [fromUserId, toUserId]]
    )
    if (tpRes.rows.length !== 2) {
        return NextResponse.json(
            { error: 'Both people must be participants of this trip' },
            { status: 400 }
        )
    }

    try {
        const created = await withAuditUser(userId, async (client) => {
            const ins = await client.query(
                `INSERT INTO settlements (trip_id, from_user_id, to_user_id, amount_usd, note, settled_on, created_by)
                 VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
                 RETURNING id`,
                [id, fromUserId, toUserId, amountUsd.toFixed(2), note, settledOn, userId]
            )
            return ins.rows[0]
        })
        return NextResponse.json({ id: created.id }, { status: 201 })
    } catch (err) {
        console.error('Error creating settlement:', err)
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
