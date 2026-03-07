import { NextRequest, NextResponse } from 'next/server'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canManageRoles } from '@/lib/permissions'

type RouteParams = { params: Promise<{ tripId: string; userId: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { tripId, userId: targetUserIdStr } = await params
    const tripIdNum = parseInt(tripId, 10)
    const targetUserId = parseInt(targetUserIdStr, 10)
    if (isNaN(tripIdNum) || isNaN(targetUserId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    // Cannot change your own role
    if (userId === targetUserId) {
        return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    const { role: currentUserRole } = await getUserTripRole(userId, tripIdNum)
    if (!canManageRoles(currentUserRole, isAdmin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { role } = await request.json()
    if (role !== 'editor' && role !== 'viewer') {
        return NextResponse.json({ error: 'Role must be "editor" or "viewer"' }, { status: 400 })
    }

    try {
        await withAuditUser(userId, async (client) => {
            const res = await client.query(
                `UPDATE trip_participants SET role = $1
                 WHERE trip_id = $2 AND user_id = $3 AND left_at IS NULL AND role != 'owner'
                 RETURNING id`,
                [role, tripIdNum, targetUserId]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })
        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Participant not found or is the owner' }, { status: 404 })
        }
        console.error('Error updating participant role:', err)
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }
}
