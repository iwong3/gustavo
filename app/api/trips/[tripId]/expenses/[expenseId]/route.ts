import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'

type RouteParams = { params: Promise<{ tripId: string; expenseId: string }> }

async function resolveUserId(email: string): Promise<number | null> {
    const res = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    return res.rows.length > 0 ? res.rows[0].id : null
}

// ── PUT: Update expense ──

type UpdateExpenseBody = {
    name?: string
    date?: string
    cost?: number
    currency?: string
    category_id?: number | null
    paid_by?: string // first name
    split_between?: string[] // first names, or ["Everyone"]
    location?: string | null // location name
    notes?: string
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const { tripId, expenseId } = await params
    const tripIdNum = parseInt(tripId, 10)
    const expenseIdNum = parseInt(expenseId, 10)
    if (isNaN(tripIdNum) || isNaN(expenseIdNum)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = await resolveUserId(session.user.email)
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

            if (sets.length > 0) {
                values.push(expenseIdNum)
                await client.query(
                    `UPDATE expenses SET ${sets.join(', ')} WHERE id = $${idx}`,
                    values
                )
            }

            // Update split_between if provided
            if (body.split_between !== undefined) {
                // Delete existing participants
                await client.query(
                    'DELETE FROM expense_participants WHERE expense_id = $1',
                    [expenseIdNum]
                )

                // Resolve new participants
                let participantIds: number[]
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

                for (const uid of participantIds) {
                    await client.query(
                        'INSERT INTO expense_participants (expense_id, user_id) VALUES ($1, $2)',
                        [expenseIdNum, uid]
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

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = await resolveUserId(session.user.email)

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
