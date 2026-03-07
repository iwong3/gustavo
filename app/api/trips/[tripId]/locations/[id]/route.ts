import { NextRequest, NextResponse } from 'next/server'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canManageLocations } from '@/lib/permissions'

type RouteParams = { params: Promise<{ tripId: string; id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { tripId, id: idStr } = await params
    const tripIdNum = parseInt(tripId, 10)
    const id = parseInt(idStr, 10)
    if (isNaN(tripIdNum) || isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { role } = await getUserTripRole(userId, tripIdNum)
    if (!canManageLocations(role, isAdmin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    try {
        await withAuditUser(userId, async (client) => {
            const res = await client.query(
                `UPDATE locations SET name = $1
                 WHERE id = $2 AND trip_id = $3 AND deleted_at IS NULL
                 RETURNING id`,
                [name.trim(), id, tripIdNum]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })
        return NextResponse.json({ id, name: name.trim() })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }
        console.error('Error updating location:', err)
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { tripId, id: idStr } = await params
    const tripIdNum = parseInt(tripId, 10)
    const id = parseInt(idStr, 10)
    if (isNaN(tripIdNum) || isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { role } = await getUserTripRole(userId, tripIdNum)
    if (!canManageLocations(role, isAdmin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        await withAuditUser(userId, async (client) => {
            const res = await client.query(
                `UPDATE locations SET deleted_at = now()
                 WHERE id = $1 AND trip_id = $2 AND deleted_at IS NULL
                 RETURNING id`,
                [id, tripIdNum]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })
        return NextResponse.json({ ok: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }
        console.error('Error deleting location:', err)
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
}
