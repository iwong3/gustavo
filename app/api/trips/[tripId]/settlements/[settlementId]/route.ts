import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canDeleteSettlement } from '@/lib/permissions'

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ tripId: string; settlementId: string }> }
) {
    const { tripId, settlementId } = await params
    const id = parseInt(tripId, 10)
    const sid = parseInt(settlementId, 10)
    if (isNaN(id) || isNaN(sid)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { userId, isAdmin } = authUser

    const res = await pool.query(
        `SELECT from_user_id, to_user_id, created_by FROM settlements
         WHERE id = $1 AND trip_id = $2 AND deleted_at IS NULL`,
        [sid, id]
    )
    if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }
    const s = res.rows[0]

    const { role } = await getUserTripRole(userId, id)
    const isCreator = String(s.created_by) === String(userId)
    const isInvolved =
        String(s.from_user_id) === String(userId) || String(s.to_user_id) === String(userId)
    if (!canDeleteSettlement(role, isAdmin, isCreator, isInvolved)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        await withAuditUser(userId, async (client) => {
            await client.query(
                'UPDATE settlements SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL',
                [sid]
            )
        })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Error deleting settlement:', err)
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
