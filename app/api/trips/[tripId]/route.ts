import { NextRequest, NextResponse } from 'next/server'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canEditTrip, canDeleteTrip } from '@/lib/permissions'

type RouteParams = { params: Promise<{ tripId: string }> }

// ── PUT: Update trip ──

type UpdateTripBody = {
    name?: string
    slug?: string
    startDate?: string
    endDate?: string
    description?: string | null
    visibility?: 'participants' | 'all_users'
    currency?: string
    /** Replace the trip's country list (full set, not delta). */
    countries?: string[]
    /** Replace the trip's currency list (full set, not delta). USD is added if
     *  missing. Currencies that have expenses against them are protected — the
     *  client should not include removals for in-use currencies. */
    currencies?: string[]
    expectedUpdatedAt?: string
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { role } = await getUserTripRole(userId, id)
    if (!canEditTrip(role, isAdmin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: UpdateTripBody = await request.json()

    try {
        await withAuditUser(userId, async (client) => {
            const existing = await client.query(
                'SELECT id, updated_at FROM trips WHERE id = $1 AND deleted_at IS NULL',
                [id]
            )
            if (existing.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
            if (
                body.expectedUpdatedAt &&
                new Date(existing.rows[0].updated_at).toISOString() !==
                    new Date(body.expectedUpdatedAt).toISOString()
            ) {
                throw new Error('CONFLICT')
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
            if (body.visibility !== undefined) {
                sets.push(`visibility = $${idx++}`)
                values.push(body.visibility)
            }
            if (body.currency !== undefined) {
                sets.push(`currency = $${idx++}`)
                values.push(body.currency)
            }

            if (sets.length > 0) {
                values.push(id)
                await client.query(
                    `UPDATE trips SET ${sets.join(', ')} WHERE id = $${idx}`,
                    values
                )
            }

            // Replace currency + country sets if provided. We protect against
            // removing a currency that has expenses against it: such codes are
            // re-inserted even if the client omitted them.
            if (body.currencies !== undefined) {
                const desired = new Set(body.currencies)
                desired.add('USD')
                const inUseRes = await client.query(
                    `SELECT DISTINCT currency FROM expenses
                     WHERE trip_id = $1 AND deleted_at IS NULL`,
                    [id]
                )
                for (const row of inUseRes.rows) {
                    desired.add(row.currency)
                }
                await client.query('DELETE FROM trip_currencies WHERE trip_id = $1', [id])
                for (const code of Array.from(desired)) {
                    await client.query(
                        'INSERT INTO trip_currencies (trip_id, currency_code) VALUES ($1, $2)',
                        [id, code]
                    )
                }
            }

            if (body.countries !== undefined) {
                await client.query('DELETE FROM trip_countries WHERE trip_id = $1', [id])
                for (const code of body.countries) {
                    await client.query(
                        'INSERT INTO trip_countries (trip_id, country_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [id, code]
                    )
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        if (err instanceof Error && err.message === 'CONFLICT') {
            return NextResponse.json(
                { error: 'conflict', message: 'This trip was changed by someone else.' },
                { status: 409 }
            )
        }
        console.error('Error updating trip:', err)
        return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
    }
}

// ── DELETE: Soft-delete trip ──

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { role } = await getUserTripRole(userId, id)
    if (!canDeleteTrip(role, isAdmin)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const expectedUpdatedAt = request.nextUrl.searchParams.get('expectedUpdatedAt')

    try {
        await withAuditUser(userId, async (client) => {
            const sql = expectedUpdatedAt
                ? `UPDATE trips SET deleted_at = NOW()
                   WHERE id = $1 AND deleted_at IS NULL AND updated_at = $2
                   RETURNING id`
                : `UPDATE trips SET deleted_at = NOW()
                   WHERE id = $1 AND deleted_at IS NULL
                   RETURNING id`
            const args: unknown[] = expectedUpdatedAt
                ? [id, expectedUpdatedAt]
                : [id]
            const res = await client.query(sql, args)
            if (res.rows.length === 0) {
                if (expectedUpdatedAt) {
                    const check = await client.query(
                        'SELECT id FROM trips WHERE id = $1 AND deleted_at IS NULL',
                        [id]
                    )
                    throw new Error(check.rows.length > 0 ? 'CONFLICT' : 'NOT_FOUND')
                }
                throw new Error('NOT_FOUND')
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        if (err instanceof Error && err.message === 'CONFLICT') {
            return NextResponse.json(
                { error: 'conflict', message: 'This trip was changed by someone else.' },
                { status: 409 }
            )
        }
        console.error('Error deleting trip:', err)
        return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
    }
}
