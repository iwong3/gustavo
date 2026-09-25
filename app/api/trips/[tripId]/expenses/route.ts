import { NextRequest, NextResponse } from 'next/server'
import { loadTripExpenses } from '@/lib/expense-rows'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canAddExpense } from '@/lib/permissions'
import { upsertPlaceDetails, type PlaceUpsertBody } from '@/lib/place-details'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    return NextResponse.json(await loadTripExpenses(id))
}

type CreateExpenseBody = PlaceUpsertBody & {
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

            // Cache the picked place (no-op when the expense has no place)
            await upsertPlaceDetails(client, body)

            // Insert expense (only google_place_id FK, details are in place_details)
            const expenseRes = await client.query(
                `INSERT INTO expenses (trip_id, name, date, cost_original, currency, category_id, location_id, paid_by, notes, reported_by, reported_at, local_currency_received, google_place_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12)
                 RETURNING id`,
                [id, body.name, body.date, body.cost, body.currency, body.category_id || null, locationId, payerId, body.notes || '', reporterId, body.local_currency_received || null, body.google_place_id || null]
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

        // The saved expense in list shape, so the client can seed its cache
        const [expense] = await loadTripExpenses(id, [expenseId])
        return NextResponse.json(expense ?? { id: expenseId }, { status: 201 })
    } catch (err) {
        console.error('Error creating expense:', err)
        const message = err instanceof Error ? err.message : 'Failed to create expense'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
