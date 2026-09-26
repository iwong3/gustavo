import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, getTripAccess, canSettlePayment, canViewTrip } from '@/lib/permissions'
import { isSettlePlan, planOf } from '@/lib/debt-proof'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await getTripAccess(authUser.userId, id)
    if (!access.tripExists) {
        return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (!canViewTrip(access.role, access.isAdmin, access.visibility)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const res = await pool.query(
        `SELECT id, from_user_id, to_user_id, amount_usd, plan, note, settled_on, created_by, created_at
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
            plan: planOf(r),
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

    const body = await request.json()
    const fromUserId = String(body.fromUserId ?? '')
    const toUserId = String(body.toUserId ?? '')
    const plan = body.plan
    if (!isSettlePlan(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { role } = await getUserTripRole(userId, id)
    const isInvolved = String(userId) === fromUserId || String(userId) === toUserId
    if (!canSettlePayment(role, isAdmin, isInvolved)) {
        return NextResponse.json(
            { error: 'Only the payer, the receiver or a trip admin can settle this' },
            { status: 403 }
        )
    }
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
            // A trip never mixes plans. Lock the trip row so two people
            // settling at once under different plans can't both get in.
            await client.query('SELECT 1 FROM trips WHERE id = $1 FOR UPDATE', [id])
            const live = await client.query(
                `SELECT COALESCE(plan, 'fewest') AS plan FROM settlements
                 WHERE trip_id = $1 AND deleted_at IS NULL LIMIT 1`,
                [id]
            )
            if (live.rows.length > 0 && live.rows[0].plan !== plan) return null
            const ins = await client.query(
                `INSERT INTO settlements (trip_id, from_user_id, to_user_id, amount_usd, plan, note, settled_on, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8)
                 RETURNING id`,
                [id, fromUserId, toUserId, amountUsd.toFixed(2), plan, note, settledOn, userId]
            )
            return ins.rows[0]
        })
        if (!created) {
            return NextResponse.json(
                { error: 'This trip already settles with the other plan. Undo its payments to switch.' },
                { status: 409 }
            )
        }
        return NextResponse.json({ id: created.id }, { status: 201 })
    } catch (err) {
        console.error('Error creating settlement:', err)
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
