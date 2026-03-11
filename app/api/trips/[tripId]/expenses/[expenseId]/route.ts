import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canEditExpense, canDeleteExpense } from '@/lib/permissions'

type RouteParams = { params: Promise<{ tripId: string; expenseId: string }> }

// ── PUT: Update expense ──

type UpdateExpenseBody = {
    name?: string
    date?: string
    cost?: number
    currency?: string
    category_id?: number | null
    paid_by?: string // first name
    split_between?: string[] // first names, or ["Everyone"]
    covered_participants?: string[] // first names of participants whose cost is covered by payer
    location?: string | null // location name
    notes?: string
    local_currency_received?: number | null
    google_place_id?: string | null
    // Place details for upsert into place_details table
    google_place_name?: string
    google_place_address?: string
    google_place_lat?: number
    google_place_lng?: number
    google_place_price_level?: number | null
    google_place_rating?: number | null
    google_place_primary_type?: string | null
    google_place_types?: string[] | null
    google_place_website?: string | null
    google_place_hours_json?: Record<string, unknown> | null
    google_place_photo_refs?: string[] | null
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { tripId, expenseId } = await params
    const tripIdNum = parseInt(tripId, 10)
    const expenseIdNum = parseInt(expenseId, 10)
    if (isNaN(tripIdNum) || isNaN(expenseIdNum)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    // Check permission: role-based or reporter
    const { role } = await getUserTripRole(userId, tripIdNum)
    const reporterRes = await pool.query(
        'SELECT reported_by FROM expenses WHERE id = $1 AND trip_id = $2 AND deleted_at IS NULL',
        [expenseIdNum, tripIdNum]
    )
    if (reporterRes.rows.length === 0) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    const isReporter = reporterRes.rows[0].reported_by === userId
    if (!canEditExpense(role, isAdmin, isReporter)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: UpdateExpenseBody = await request.json()

    try {
        await withAuditUser(userId, async (client) => {
            // Verify expense exists and belongs to trip
            const existing = await client.query(
                'SELECT id FROM expenses WHERE id = $1 AND trip_id = $2 AND deleted_at IS NULL',
                [expenseIdNum, tripIdNum]
            )
            if (existing.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }

            // Build dynamic UPDATE
            const sets: string[] = []
            const values: unknown[] = []
            let idx = 1

            if (body.name !== undefined) {
                sets.push(`name = $${idx++}`)
                values.push(body.name)
            }
            if (body.date !== undefined) {
                sets.push(`date = $${idx++}`)
                values.push(body.date)
            }
            if (body.cost !== undefined) {
                sets.push(`cost_original = $${idx++}`)
                values.push(body.cost)
            }
            if (body.currency !== undefined) {
                sets.push(`currency = $${idx++}`)
                values.push(body.currency)
            }
            if (body.category_id !== undefined) {
                sets.push(`category_id = $${idx++}`)
                values.push(body.category_id)
            }
            if (body.notes !== undefined) {
                sets.push(`notes = $${idx++}`)
                values.push(body.notes)
            }
            if (body.local_currency_received !== undefined) {
                sets.push(`local_currency_received = $${idx++}`)
                values.push(body.local_currency_received)
            }

            // Resolve paid_by
            if (body.paid_by !== undefined) {
                const payerRes = await client.query(
                    `SELECT id FROM users WHERE split_part(name, ' ', 1) = $1 LIMIT 1`,
                    [body.paid_by]
                )
                if (payerRes.rows.length === 0) {
                    throw new Error(`Unknown payer: ${body.paid_by}`)
                }
                sets.push(`paid_by = $${idx++}`)
                values.push(payerRes.rows[0].id)
            }

            // Resolve location
            if (body.location !== undefined) {
                if (body.location === null || body.location === '') {
                    sets.push(`location_id = $${idx++}`)
                    values.push(null)
                } else {
                    const locRes = await client.query(
                        'SELECT id FROM locations WHERE name = $1 AND trip_id = $2 AND deleted_at IS NULL LIMIT 1',
                        [body.location, tripIdNum]
                    )
                    sets.push(`location_id = $${idx++}`)
                    values.push(locRes.rows.length > 0 ? locRes.rows[0].id : null)
                }
            }

            // Google Place: upsert place_details then set FK
            if (body.google_place_id !== undefined) {
                if (body.google_place_id && body.google_place_name) {
                    // Upsert place data
                    await client.query(
                        `INSERT INTO place_details (google_place_id, name, address, lat, lng, price_level, rating, primary_type, types, website, hours_json, photo_refs)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                         ON CONFLICT (google_place_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            address = EXCLUDED.address,
                            lat = EXCLUDED.lat,
                            lng = EXCLUDED.lng,
                            price_level = COALESCE(EXCLUDED.price_level, place_details.price_level),
                            rating = COALESCE(EXCLUDED.rating, place_details.rating),
                            primary_type = COALESCE(EXCLUDED.primary_type, place_details.primary_type),
                            types = COALESCE(EXCLUDED.types, place_details.types),
                            website = COALESCE(EXCLUDED.website, place_details.website),
                            hours_json = COALESCE(EXCLUDED.hours_json, place_details.hours_json),
                            photo_refs = COALESCE(EXCLUDED.photo_refs, place_details.photo_refs),
                            fetched_at = NOW()`,
                        [
                            body.google_place_id, body.google_place_name,
                            body.google_place_address || null, body.google_place_lat || null, body.google_place_lng || null,
                            body.google_place_price_level ?? null, body.google_place_rating ?? null,
                            body.google_place_primary_type ?? null,
                            body.google_place_types ? JSON.stringify(body.google_place_types) : null,
                            body.google_place_website ?? null,
                            body.google_place_hours_json ? JSON.stringify(body.google_place_hours_json) : null,
                            body.google_place_photo_refs ? JSON.stringify(body.google_place_photo_refs) : null,
                        ]
                    )
                }
                sets.push(`google_place_id = $${idx++}`)
                values.push(body.google_place_id)
            }

            if (sets.length > 0) {
                values.push(expenseIdNum)
                await client.query(
                    `UPDATE expenses SET ${sets.join(', ')} WHERE id = $${idx}`,
                    values
                )
            }

            // Update split_between and/or covered_participants if provided
            if (body.split_between !== undefined || body.covered_participants !== undefined) {
                // Resolve new participants (before deleting, in case we need existing IDs)
                let participantIds: number[]
                if (body.split_between !== undefined) {
                    if (body.split_between.length === 1 && body.split_between[0] === 'Everyone') {
                        const tpRes = await client.query(
                            'SELECT user_id FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL',
                            [tripIdNum]
                        )
                        participantIds = tpRes.rows.map((r: { user_id: number }) => r.user_id)
                    } else {
                        const placeholders = body.split_between.map((_, i) => `$${i + 1}`).join(', ')
                        const usersRes = await client.query(
                            `SELECT id FROM users WHERE split_part(name, ' ', 1) IN (${placeholders})`,
                            body.split_between
                        )
                        participantIds = usersRes.rows.map((r: { id: number }) => r.id)
                    }
                } else {
                    // split_between not changed, re-fetch existing participant IDs
                    const existingRes = await client.query(
                        'SELECT user_id FROM expense_participants WHERE expense_id = $1',
                        [expenseIdNum]
                    )
                    participantIds = existingRes.rows.map((r: { user_id: number }) => r.user_id)
                }

                // Delete existing participants
                await client.query(
                    'DELETE FROM expense_participants WHERE expense_id = $1',
                    [expenseIdNum]
                )

                // Resolve covered participants → user IDs
                const coveredIds = new Set<number>()
                if (body.covered_participants && body.covered_participants.length > 0) {
                    const covPlaceholders = body.covered_participants.map((_, i) => `$${i + 1}`).join(', ')
                    const covRes = await client.query(
                        `SELECT id FROM users WHERE split_part(name, ' ', 1) IN (${covPlaceholders})`,
                        body.covered_participants
                    )
                    for (const r of covRes.rows) coveredIds.add(r.id)
                }

                // Resolve payer ID for covered_by value
                const payerIdRes = await client.query(
                    'SELECT paid_by FROM expenses WHERE id = $1',
                    [expenseIdNum]
                )
                const expPayerId = payerIdRes.rows[0].paid_by

                for (const uid of participantIds) {
                    await client.query(
                        'INSERT INTO expense_participants (expense_id, user_id, covered_by) VALUES ($1, $2, $3)',
                        [expenseIdNum, uid, coveredIds.has(uid) ? expPayerId : null]
                    )
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
        }
        console.error('Error updating expense:', err)
        const message = err instanceof Error ? err.message : 'Failed to update expense'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// ── DELETE: Soft-delete expense ──

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const { tripId, expenseId } = await params
    const tripIdNum = parseInt(tripId, 10)
    const expenseIdNum = parseInt(expenseId, 10)
    if (isNaN(tripIdNum) || isNaN(expenseIdNum)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { role } = await getUserTripRole(userId, tripIdNum)
    const reporterRes = await pool.query(
        'SELECT reported_by FROM expenses WHERE id = $1 AND trip_id = $2 AND deleted_at IS NULL',
        [expenseIdNum, tripIdNum]
    )
    if (reporterRes.rows.length === 0) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    const isReporter = reporterRes.rows[0].reported_by === userId
    if (!canDeleteExpense(role, isAdmin, isReporter)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        await withAuditUser(userId, async (client) => {
            const res = await client.query(
                `UPDATE expenses SET deleted_at = NOW()
                 WHERE id = $1 AND trip_id = $2 AND deleted_at IS NULL
                 RETURNING id`,
                [expenseIdNum, tripIdNum]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
        }
        console.error('Error deleting expense:', err)
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
    }
}
