import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'

type ExpenseRow = {
    id: number
    name: string
    date: string
    cost_original: string
    currency: string
    cost_converted_usd: string
    exchange_rate: string | null
    conversion_error: boolean
    category: string | null
    notes: string | null
    reported_at: string | null
    location_name: string | null
    paid_by_name: string
    reported_by_email: string | null
    split_between: string[] | null
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const [expensesRes, participantsRes] = await Promise.all([
        pool.query<ExpenseRow>(
            `SELECT
                e.id,
                e.name,
                e.date,
                e.cost_original,
                e.currency,
                e.cost_converted_usd,
                e.exchange_rate,
                e.conversion_error,
                e.category,
                e.notes,
                e.reported_at,
                l.name AS location_name,
                payer.name AS paid_by_name,
                reporter.email AS reported_by_email,
                ARRAY_AGG(
                    DISTINCT split_part(participant.name, ' ', 1)
                    ORDER BY split_part(participant.name, ' ', 1)
                ) FILTER (WHERE participant.name IS NOT NULL) AS split_between
            FROM expenses e
            JOIN users payer ON e.paid_by = payer.id
            LEFT JOIN users reporter ON e.reported_by = reporter.id
            LEFT JOIN locations l ON e.location_id = l.id
            LEFT JOIN expense_participants ep ON ep.expense_id = e.id
            LEFT JOIN users participant ON ep.user_id = participant.id
            WHERE e.trip_id = $1 AND e.deleted_at IS NULL
            GROUP BY e.id, l.name, payer.name, reporter.email
            ORDER BY e.date, e.created_at`,
            [id]
        ),
        pool.query(
            'SELECT COUNT(*)::int AS count FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL',
            [id]
        ),
    ])

    const tripParticipantCount: number = participantsRes.rows[0].count
    const expenses = expensesRes.rows.map((row) => ({
        ...row,
        is_everyone:
            (row.split_between ?? []).length === tripParticipantCount,
    }))

    return NextResponse.json(expenses)
}

type CreateExpenseBody = {
    name: string
    date: string // YYYY-MM-DD
    cost: number
    currency: string
    category?: string
    paid_by: string // first name
    split_between: string[] // first names, or ["Everyone"]
    location?: string // location name
    notes?: string
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateExpenseBody = await request.json()

    // Validate required fields
    if (!body.name || !body.date || !body.cost || !body.currency || !body.paid_by) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
        await client.query('BEGIN')

        // Resolve paid_by first name → user ID
        const payerRes = await client.query(
            `SELECT id FROM users WHERE split_part(name, ' ', 1) = $1 LIMIT 1`,
            [body.paid_by]
        )
        if (payerRes.rows.length === 0) {
            return NextResponse.json({ error: `Unknown payer: ${body.paid_by}` }, { status: 400 })
        }
        const payerId = payerRes.rows[0].id

        // Resolve reported_by from session email
        const reporterRes = await client.query(
            `SELECT id FROM users WHERE email = $1 LIMIT 1`,
            [session.user.email]
        )
        const reporterId = reporterRes.rows.length > 0 ? reporterRes.rows[0].id : null

        // Resolve location name → location ID (optional)
        let locationId: number | null = null
        if (body.location) {
            const locRes = await client.query(
                `SELECT id FROM locations WHERE name = $1 AND trip_id = $2 AND deleted_at IS NULL LIMIT 1`,
                [body.location, id]
            )
            if (locRes.rows.length > 0) {
                locationId = locRes.rows[0].id
            }
        }

        // Insert expense
        const expenseRes = await client.query(
            `INSERT INTO expenses (trip_id, name, date, cost_original, currency, category, location_id, paid_by, notes, reported_by, reported_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             RETURNING id`,
            [id, body.name, body.date, body.cost, body.currency, body.category || null, locationId, payerId, body.notes || '', reporterId]
        )
        const expenseId = expenseRes.rows[0].id

        // Resolve split_between → user IDs
        let participantIds: number[]
        if (body.split_between.length === 1 && body.split_between[0] === 'Everyone') {
            // Get all trip participants
            const tpRes = await client.query(
                `SELECT user_id FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL`,
                [id]
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

        // Insert expense_participants
        for (const userId of participantIds) {
            await client.query(
                `INSERT INTO expense_participants (expense_id, user_id) VALUES ($1, $2)`,
                [expenseId, userId]
            )
        }

        await client.query('COMMIT')
        return NextResponse.json({ id: expenseId }, { status: 201 })
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('Error creating expense:', err)
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
    } finally {
        client.release()
    }
}
