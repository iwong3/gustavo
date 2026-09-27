import { NextRequest, NextResponse } from 'next/server'
import { loadTripExpenses } from '@/lib/expense-rows'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, getTripAccess, canAddExpense, canViewTrip } from '@/lib/permissions'
import { upsertPlaceDetails, type PlaceUpsertBody } from '@/lib/place-details'
import {
    effectiveCovered,
    ExpensePeopleError,
    loadTripRoster,
    resolveExpensePeople,
    type ExpensePeopleInput,
} from '@/lib/expense-people'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const access = await getTripAccess(authUser.userId, id)
    if (!access.tripExists) {
        return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (!canViewTrip(access.role, access.isAdmin, access.visibility)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(await loadTripExpenses(id))
}

// People (payer, split, covered) are user ids — or first names from older
// clients — resolved against this trip only: see lib/expense-people.ts
type CreateExpenseBody = PlaceUpsertBody &
    ExpensePeopleInput & {
        name: string
        date: string // YYYY-MM-DD
        cost: number
        currency: string
        category_id?: number
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
    const hasPayer = body.paid_by_id !== undefined || body.paid_by !== undefined
    const hasSplit =
        body.split_everyone || body.split_between_ids !== undefined || body.split_between !== undefined
    if (!body.name || !body.date || !body.cost || !body.currency || !hasPayer || !hasSplit) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
        const expenseId = await withAuditUser(reporterId, async (client) => {
            // Payer, split and covered — only ever people on this trip
            const people = resolveExpensePeople(await loadTripRoster(client, id), body)
            const payerId = people.payerId!
            const participantIds = people.participantIds!
            const coveredIds = effectiveCovered(people.coveredIds ?? new Set(), participantIds, payerId)

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
        if (err instanceof ExpensePeopleError) {
            return NextResponse.json({ error: err.message }, { status: 400 })
        }
        console.error('Error creating expense:', err)
        const message = err instanceof Error ? err.message : 'Failed to create expense'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
