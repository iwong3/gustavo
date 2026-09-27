import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canEditTrip, canManageRoles } from '@/lib/permissions'

type RouteParams = { params: Promise<{ tripId: string }> }

const GRANTABLE_ROLES = new Set(['admin', 'editor', 'viewer'])

// ── POST: Add participant to trip ──

export async function POST(request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUserId = authUser.userId

    const { role: currentRole } = await getUserTripRole(currentUserId, id)
    if (!canEditTrip(currentRole, authUser.isAdmin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: { userId: number; role?: string } = await request.json()
    if (!body.userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get trip creator's default participant role
    const prefsRes = await pool.query(
        `SELECT u.default_participant_role FROM trips t JOIN users u ON t.created_by = u.id WHERE t.id = $1`,
        [id]
    )
    const defaultRole = body.role ?? prefsRes.rows[0]?.default_participant_role ?? 'viewer'
    // Never a second owner; granting admin is role management (owner/admin only)
    if (!GRANTABLE_ROLES.has(defaultRole)) {
        return NextResponse.json({ error: 'Role must be "admin", "editor", or "viewer"' }, { status: 400 })
    }
    if (defaultRole === 'admin' && !canManageRoles(currentRole, authUser.isAdmin)) {
        return NextResponse.json({ error: 'Only the owner or an admin can add an admin' }, { status: 403 })
    }

    try {
        await withAuditUser(currentUserId, async (client) => {
            // Check if already a participant (including soft-removed)
            const existing = await client.query(
                'SELECT id, left_at FROM trip_participants WHERE trip_id = $1 AND user_id = $2',
                [id, body.userId]
            )

            if (existing.rows.length > 0) {
                if (existing.rows[0].left_at) {
                    // Re-add: clear left_at, set role
                    await client.query(
                        'UPDATE trip_participants SET left_at = NULL, role = $2 WHERE id = $1',
                        [existing.rows[0].id, defaultRole]
                    )
                }
                // Already active — no-op
            } else {
                await client.query(
                    'INSERT INTO trip_participants (trip_id, user_id, role) VALUES ($1, $2, $3)',
                    [id, body.userId, defaultRole]
                )
            }
        })

        return NextResponse.json({ success: true }, { status: 201 })
    } catch (err) {
        console.error('Error adding participant:', err)
        return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
    }
}

// ── DELETE: Remove participant from trip (set left_at) ──

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUserId = authUser.userId

    const { role: currentRole } = await getUserTripRole(currentUserId, id)
    if (!canEditTrip(currentRole, authUser.isAdmin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: { userId: number } = await request.json()
    if (!body.userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    try {
        await withAuditUser(currentUserId, async (client) => {
            // The owner can't be removed; removing an admin is role
            // management (owner/admin only). Row-locked so a concurrent role
            // change can't slip past the check.
            const target = await client.query(
                `SELECT role FROM trip_participants
                 WHERE trip_id = $1 AND user_id = $2 AND left_at IS NULL
                 FOR UPDATE`,
                [id, body.userId]
            )
            if (target.rows.length === 0) throw new Error('NOT_FOUND')
            const targetRole = target.rows[0].role
            if (targetRole === 'owner') throw new Error('OWNER')
            if (targetRole === 'admin' && !canManageRoles(currentRole, authUser.isAdmin)) {
                throw new Error('ADMIN')
            }

            await client.query(
                `UPDATE trip_participants SET left_at = NOW()
                 WHERE trip_id = $1 AND user_id = $2 AND left_at IS NULL`,
                [id, body.userId]
            )
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }
        if (err instanceof Error && err.message === 'OWNER') {
            return NextResponse.json({ error: "The trip's owner can't be removed" }, { status: 403 })
        }
        if (err instanceof Error && err.message === 'ADMIN') {
            return NextResponse.json({ error: 'Only the owner or an admin can remove an admin' }, { status: 403 })
        }
        console.error('Error removing participant:', err)
        return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 })
    }
}
