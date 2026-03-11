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
            e.google_place_id,
            pd.name AS place_name, pd.address AS place_address,
            pd.lat AS place_lat, pd.lng AS place_lng,
            pd.price_level AS place_price_level, pd.rating AS place_rating,
            pd.primary_type AS place_primary_type, pd.types AS place_types,
            pd.website AS place_website, pd.hours_json AS place_hours_json,
            pd.photo_refs AS place_photo_refs,
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
        LEFT JOIN place_details pd ON e.google_place_id = pd.google_place_id
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
            googlePlaceId: e.google_place_id || null,
            place: e.google_place_id ? {
                googlePlaceId: e.google_place_id,
                name: e.place_name,
                address: e.place_address || null,
                lat: e.place_lat != null ? parseFloat(e.place_lat) : null,
                lng: e.place_lng != null ? parseFloat(e.place_lng) : null,
                priceLevel: e.place_price_level != null ? e.place_price_level : null,
                rating: e.place_rating != null ? parseFloat(e.place_rating) : null,
                primaryType: e.place_primary_type || null,
                types: e.place_types || null,
                website: e.place_website || null,
                hoursJson: e.place_hours_json || null,
                photoRefs: e.place_photo_refs || null,
            } : null,
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
    google_place_id?: string
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

            // Upsert place_details if Google Place data is provided
            if (body.google_place_id && body.google_place_name) {
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

        return NextResponse.json({ id: expenseId }, { status: 201 })
    } catch (err) {
        console.error('Error creating expense:', err)
        const message = err instanceof Error ? err.message : 'Failed to create expense'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
