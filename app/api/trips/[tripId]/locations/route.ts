import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

type RouteParams = { params: Promise<{ tripId: string }> }

function parseTripId(tripId: string): number | null {
    const id = parseInt(tripId, 10)
    return isNaN(id) ? null : id
}

export async function GET(
    _request: NextRequest,
    { params }: RouteParams
) {
    const tripId = parseTripId((await params).tripId)
    if (!tripId) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const { rows } = await pool.query(
        `SELECT id, name FROM locations
         WHERE trip_id = $1 AND deleted_at IS NULL
         ORDER BY name`,
        [tripId]
    )

    return NextResponse.json(rows)
}

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId } = authUser

    const tripId = parseTripId((await params).tripId)
    if (!tripId) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const trimmed = name.trim()

    try {
        const result = await withAuditUser(userId, async (client) => {
            // Check if location exists (including soft-deleted — revive it)
            const existing = await client.query(
                `SELECT id, deleted_at FROM locations WHERE name = $1 AND trip_id = $2`,
                [trimmed, tripId]
            )
            if (existing.rows.length > 0) {
                if (existing.rows[0].deleted_at) {
                    await client.query(
                        `UPDATE locations SET deleted_at = NULL WHERE id = $1`,
                        [existing.rows[0].id]
                    )
                    return { id: existing.rows[0].id, name: trimmed }
                }
                throw new Error('DUPLICATE')
            }

            const res = await client.query(
                `INSERT INTO locations (trip_id, name) VALUES ($1, $2) RETURNING id`,
                [tripId, trimmed]
            )
            return { id: res.rows[0].id, name: trimmed }
        })

        return NextResponse.json(result, { status: 201 })
    } catch (err) {
        if (err instanceof Error && err.message === 'DUPLICATE') {
            return NextResponse.json({ error: 'Location already exists for this trip' }, { status: 409 })
        }
        console.error('Error creating location:', err)
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
