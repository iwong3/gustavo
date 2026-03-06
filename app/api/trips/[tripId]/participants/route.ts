import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'

type RouteParams = { params: Promise<{ tripId: string }> }

async function resolveUserId(email: string): Promise<number | null> {
    const res = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    return res.rows.length > 0 ? res.rows[0].id : null
}

// ── POST: Add participant to trip ──

export async function POST(request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: { userId: number } = await request.json()
    if (!body.userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const currentUserId = await resolveUserId(session.user.email)

    try {
        await withAuditUser(currentUserId, async (client) => {
            // Check if already a participant (including soft-removed)
            const existing = await client.query(
                'SELECT id, left_at FROM trip_participants WHERE trip_id = $1 AND user_id = $2',
                [id, body.userId]
            )

            if (existing.rows.length > 0) {
                if (existing.rows[0].left_at) {
                    // Re-add: clear left_at
                    await client.query(
                        'UPDATE trip_participants SET left_at = NULL WHERE id = $1',
                        [existing.rows[0].id]
                    )
                }
                // Already active — no-op
            } else {
                await client.query(
                    'INSERT INTO trip_participants (trip_id, user_id) VALUES ($1, $2)',
                    [id, body.userId]
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

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: { userId: number } = await request.json()
    if (!body.userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const currentUserId = await resolveUserId(session.user.email)

    try {
        await withAuditUser(currentUserId, async (client) => {
            const res = await client.query(
                `UPDATE trip_participants SET left_at = NOW()
                 WHERE trip_id = $1 AND user_id = $2 AND left_at IS NULL
                 RETURNING id`,
                [id, body.userId]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
        }
        console.error('Error removing participant:', err)
        return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 })
    }
}
