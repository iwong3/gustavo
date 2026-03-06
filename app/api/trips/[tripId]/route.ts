import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'

type RouteParams = { params: Promise<{ tripId: string }> }

async function resolveUserId(email: string): Promise<number | null> {
    const res = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    return res.rows.length > 0 ? res.rows[0].id : null
}

// ── PUT: Update trip ──

type UpdateTripBody = {
    name?: string
    slug?: string
    startDate?: string
    endDate?: string
    description?: string | null
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = await resolveUserId(session.user.email)
    const body: UpdateTripBody = await request.json()

    try {
        await withAuditUser(userId, async (client) => {
            const existing = await client.query(
                'SELECT id FROM trips WHERE id = $1 AND deleted_at IS NULL',
                [id]
            )
            if (existing.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }

            const sets: string[] = []
            const values: unknown[] = []
            let idx = 1

            if (body.name !== undefined) {
                sets.push(`name = $${idx++}`)
                values.push(body.name)
            }
            if (body.slug !== undefined) {
                sets.push(`slug = $${idx++}`)
                values.push(body.slug)
            }
            if (body.startDate !== undefined) {
                sets.push(`start_date = $${idx++}`)
                values.push(body.startDate)
            }
            if (body.endDate !== undefined) {
                sets.push(`end_date = $${idx++}`)
                values.push(body.endDate)
            }
            if (body.description !== undefined) {
                sets.push(`description = $${idx++}`)
                values.push(body.description)
            }

            if (sets.length > 0) {
                values.push(id)
                await client.query(
                    `UPDATE trips SET ${sets.join(', ')} WHERE id = $${idx}`,
                    values
                )
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        console.error('Error updating trip:', err)
        return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
    }
}

// ── DELETE: Soft-delete trip ──

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = await resolveUserId(session.user.email)

    try {
        await withAuditUser(userId, async (client) => {
            const res = await client.query(
                `UPDATE trips SET deleted_at = NOW()
                 WHERE id = $1 AND deleted_at IS NULL
                 RETURNING id`,
                [id]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        console.error('Error deleting trip:', err)
        return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
    }
}
