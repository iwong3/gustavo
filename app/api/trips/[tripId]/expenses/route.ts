import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canAddExpense } from '@/lib/permissions'

function userSummary(row: { id: number; name: string; email: string | null; avatar_url: string | null; initials: string | null; icon_color: string | null; venmo_url: string | null }) {
    return {
        id: row.id,
        name: row.name,
        firstName: row.name.split(' ')[0],
        email: row.email,
        avatarUrl: row.avatar_url,
        initials: row.initials,
        iconColor: row.icon_color,
        venmoUrl: row.venmo_url,
    }
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

    // Fetch expenses with payer + reporter + category + location
    const expensesRes = await pool.query(
        `SELECT
            e.id, e.name, e.date, e.cost_original, e.currency,
            e.cost_converted_usd, e.exchange_rate, e.conversion_error,
            e.category_id, ec.name AS category_name, ec.slug AS category_slug,
            e.local_currency_received,
            e.location_id, l.name AS location_name,
            e.notes, e.reported_at,
            payer.id AS payer_id, payer.name AS payer_name, payer.email AS payer_email,
            payer.avatar_url AS payer_avatar_url, payer.initials AS payer_initials,
            payer.icon_color AS payer_icon_color, payer.venmo_url AS payer_venmo_url,
            reporter.id AS reporter_id, reporter.name AS reporter_name,
            reporter.email AS reporter_email, reporter.avatar_url AS reporter_avatar_url,
            reporter.initials AS reporter_initials, reporter.icon_color AS reporter_icon_color,
            reporter.venmo_url AS reporter_venmo_url
        FROM expenses e
        JOIN users payer ON e.paid_by = payer.id
        LEFT JOIN users reporter ON e.reported_by = reporter.id
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        LEFT JOIN locations l ON e.location_id = l.id
        WHERE e.trip_id = $1 AND e.deleted_at IS NULL
        ORDER BY e.date, e.created_at`,
        [id]
    )

    if (expensesRes.rows.length === 0) {
        return NextResponse.json([])
    }

    const expenseIds = expensesRes.rows.map((e) => e.id)

    // Fetch all expense participants in one query (including covered_by)
    const epRes = await pool.query(
        `SELECT ep.expense_id, ep.covered_by, u.id, u.name, u.email, u.avatar_url, u.initials, u.icon_color, u.venmo_url
         FROM expense_participants ep
         JOIN users u ON ep.user_id = u.id
         WHERE ep.expense_id = ANY($1)
         ORDER BY u.name`,
        [expenseIds]
    )

    // Group participants by expense
    const participantsByExpense = new Map<number, typeof epRes.rows>()
    for (const p of epRes.rows) {
        const list = participantsByExpense.get(p.expense_id) ?? []
        list.push(p)
        participantsByExpense.set(p.expense_id, list)
    }

    // Trip participant count for "everyone" detection
    const tpCountRes = await pool.query(
        'SELECT COUNT(*)::int AS count FROM trip_participants WHERE trip_id = $1 AND left_at IS NULL',
        [id]
    )
    const tripParticipantCount: number = tpCountRes.rows[0].count

    const expenses = expensesRes.rows.map((e) => {
        const participants = participantsByExpense.get(e.id) ?? []
        const splitBetween = participants.map(userSummary)
        const coveredParticipants = participants
            .filter((p) => p.covered_by != null)
            .map(userSummary)
        return {
            id: e.id,
            name: e.name,
            date: typeof e.date === 'string' ? e.date.slice(0, 10) : new Date(e.date).toISOString().slice(0, 10),
            costOriginal: parseFloat(e.cost_original),
            currency: e.currency,
            costConvertedUsd: parseFloat(e.cost_converted_usd),
            exchangeRate: e.exchange_rate ? parseFloat(e.exchange_rate) : null,
            conversionError: e.conversion_error,
            categoryId: e.category_id,
            categoryName: e.category_name,
            categorySlug: e.category_slug,
            locationId: e.location_id,
            locationName: e.location_name,
            notes: e.notes ?? '',
            reportedAt: e.reported_at,
            paidBy: userSummary({
                id: e.payer_id, name: e.payer_name, email: e.payer_email,
                avatar_url: e.payer_avatar_url, initials: e.payer_initials,
                icon_color: e.payer_icon_color, venmo_url: e.payer_venmo_url,
            }),
            reportedBy: e.reporter_id ? userSummary({
                id: e.reporter_id, name: e.reporter_name, email: e.reporter_email,
                avatar_url: e.reporter_avatar_url, initials: e.reporter_initials,
                icon_color: e.reporter_icon_color, venmo_url: e.reporter_venmo_url,
            }) : null,
            splitBetween,
            coveredParticipants,
            isEveryone: splitBetween.length === tripParticipantCount,
            localCurrencyReceived: e.local_currency_received ? parseFloat(e.local_currency_received) : null,
            receiptImageUrl: null,
        }
    })

    return NextResponse.json(expenses)
}

type CreateExpenseBody = {
    name: string
    date: string // YYYY-MM-DD
    cost: number
    currency: string
    category_id?: number
    paid_by: string // first name
    split_between: string[] // first names, or ["Everyone"]
    covered_participants?: string[] // first names of participants whose cost is covered by payer
    location?: string // location name
    notes?: string
    local_currency_received?: number
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

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const reporterId = authUser.userId

    const { role } = await getUserTripRole(authUser.userId, id)
    if (!canAddExpense(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: CreateExpenseBody = await request.json()

    // Validate required fields
    if (!body.name || !body.date || !body.cost || !body.currency || !body.paid_by) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
        const expenseId = await withAuditUser(reporterId, async (client) => {
            // Resolve paid_by first name → user ID
            const payerRes = await client.query(
                `SELECT id FROM users WHERE split_part(name, ' ', 1) = $1 LIMIT 1`,
                [body.paid_by]
            )
            if (payerRes.rows.length === 0) {
                throw new Error(`Unknown payer: ${body.paid_by}`)
            }
            const payerId = payerRes.rows[0].id

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
                `INSERT INTO expenses (trip_id, name, date, cost_original, currency, category_id, location_id, paid_by, notes, reported_by, reported_at, local_currency_received)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
                 RETURNING id`,
                [id, body.name, body.date, body.cost, body.currency, body.category_id || null, locationId, payerId, body.notes || '', reporterId, body.local_currency_received || null]
            )
            const expId = expenseRes.rows[0].id

            // Resolve split_between → user IDs
            let participantIds: number[]
            if (body.split_between.length === 1 && body.split_between[0] === 'Everyone') {
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

            // Insert expense_participants (with covered_by for covered participants)
            for (const userId of participantIds) {
                await client.query(
                    `INSERT INTO expense_participants (expense_id, user_id, covered_by) VALUES ($1, $2, $3)`,
                    [expId, userId, coveredIds.has(userId) ? payerId : null]
                )
            }

            return expId
        })

        return NextResponse.json({ id: expenseId }, { status: 201 })
    } catch (err) {
        console.error('Error creating expense:', err)
        const message = err instanceof Error ? err.message : 'Failed to create expense'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
