import { NextRequest, NextResponse } from 'next/server'
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
