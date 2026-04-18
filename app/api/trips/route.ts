import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { TripRole } from '@/lib/permissions'

function formatDate(d: string | Date): string {
    return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10)
}

function mapUser(u: { id: number; name: string; first_name: string; email: string | null; avatar_url: string | null; initials: string | null; icon_color: string | null; venmo_url: string | null }) {
    return {
        id: u.id,
        name: u.name,
        firstName: u.first_name,
        email: u.email,
        avatarUrl: u.avatar_url,
        initials: u.initials,
        iconColor: u.icon_color,
        venmoUrl: u.venmo_url,
    }
}

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const slug = request.nextUrl.searchParams.get('slug')

    if (slug) {
        // Single trip by slug
        const tripRes = await pool.query(
            `SELECT t.id, t.name, t.slug, t.description, t.start_date, t.end_date,
                    t.created_by, t.visibility, t.currency,
                    tp.role AS user_role
             FROM trips t
             LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.user_id = $2 AND tp.left_at IS NULL
             WHERE t.slug = $1 AND t.deleted_at IS NULL`,
            [slug, userId]
        )
        if (tripRes.rows.length === 0) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        const trip = tripRes.rows[0]

        // Visibility check: participant, public trip, or admin viewing public trip
        if (!trip.user_role && trip.visibility !== 'all_users') {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }

        const [participantsRes, currenciesRes, countriesRes] = await Promise.all([
            pool.query(
                `SELECT u.id, u.name, split_part(u.name, ' ', 1) AS first_name,
                        u.email, u.avatar_url, u.initials, u.icon_color, u.venmo_url,
                        tp.role
                 FROM trip_participants tp
                 JOIN users u ON tp.user_id = u.id
                 WHERE tp.trip_id = $1 AND tp.left_at IS NULL
                 ORDER BY u.name`,
                [trip.id]
            ),
            pool.query(
                'SELECT currency_code FROM trip_currencies WHERE trip_id = $1 ORDER BY currency_code',
                [trip.id]
            ),
            pool.query(
                'SELECT country_code FROM trip_countries WHERE trip_id = $1 ORDER BY country_code',
                [trip.id]
            ),
        ])

        const currencies = currenciesRes.rows.map((r) => r.currency_code)
        // USD is always available on the expense form, even if not in trip_currencies
        if (!currencies.includes('USD')) currencies.unshift('USD')

        return NextResponse.json({
            id: trip.id,
            name: trip.name,
            slug: trip.slug,
            description: trip.description,
            startDate: formatDate(trip.start_date),
            endDate: formatDate(trip.end_date),
            createdBy: trip.created_by,
            visibility: trip.visibility,
            currency: trip.currency,
            currencies,
            countries: countriesRes.rows.map((r) => r.country_code),
            userRole: trip.user_role as TripRole | null,
            isAdmin,
            currentUserId: userId,
            participants: participantsRes.rows.map((u) => ({
                ...mapUser(u),
                role: u.role as TripRole,
            })),
        })
    }

    // All trips visible to user (participant OR public)
    const tripsRes = await pool.query(
        `SELECT t.id, t.name, t.slug, t.description, t.start_date, t.end_date,
                t.created_by, t.visibility, t.currency,
                tp.role AS user_role
         FROM trips t
         LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.user_id = $1 AND tp.left_at IS NULL
         WHERE t.deleted_at IS NULL
           AND (tp.user_id IS NOT NULL OR t.visibility = 'all_users')
         ORDER BY t.start_date DESC`,
        [userId]
    )

    const tripIds = tripsRes.rows.map((t) => t.id)
    if (tripIds.length === 0) {
        return NextResponse.json([])
    }

    // Fetch all participants, currencies, and countries for all trips in parallel
    const [participantsRes, currenciesRes, countriesRes] = await Promise.all([
        pool.query(
            `SELECT tp.trip_id, u.id, u.name, split_part(u.name, ' ', 1) AS first_name,
                    u.email, u.avatar_url, u.initials, u.icon_color, u.venmo_url,
                    tp.role
             FROM trip_participants tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.trip_id = ANY($1) AND tp.left_at IS NULL
             ORDER BY u.name`,
            [tripIds]
        ),
        pool.query(
            'SELECT trip_id, currency_code FROM trip_currencies WHERE trip_id = ANY($1) ORDER BY currency_code',
            [tripIds]
        ),
        pool.query(
            'SELECT trip_id, country_code FROM trip_countries WHERE trip_id = ANY($1) ORDER BY country_code',
            [tripIds]
        ),
    ])

    // Group participants by trip
    const participantsByTrip = new Map<number, typeof participantsRes.rows>()
    for (const p of participantsRes.rows) {
        const list = participantsByTrip.get(p.trip_id) ?? []
        list.push(p)
        participantsByTrip.set(p.trip_id, list)
    }

    const currenciesByTrip = new Map<number, string[]>()
    for (const r of currenciesRes.rows) {
        const list = currenciesByTrip.get(r.trip_id) ?? []
        list.push(r.currency_code)
        currenciesByTrip.set(r.trip_id, list)
    }

    const countriesByTrip = new Map<number, string[]>()
    for (const r of countriesRes.rows) {
        const list = countriesByTrip.get(r.trip_id) ?? []
        list.push(r.country_code)
        countriesByTrip.set(r.trip_id, list)
    }

    const trips = tripsRes.rows.map((t) => {
        const currencies = currenciesByTrip.get(t.id) ?? []
        if (!currencies.includes('USD')) currencies.unshift('USD')
        return {
            id: t.id,
            name: t.name,
            slug: t.slug,
            description: t.description,
            startDate: formatDate(t.start_date),
            endDate: formatDate(t.end_date),
            createdBy: t.created_by,
            visibility: t.visibility,
            currency: t.currency,
            currencies,
            countries: countriesByTrip.get(t.id) ?? [],
            userRole: t.user_role as TripRole | null,
            isAdmin,
            currentUserId: userId,
            participants: (participantsByTrip.get(t.id) ?? []).map((u) => ({
                ...mapUser(u),
                role: u.role as TripRole,
            })),
        }
    })

    return NextResponse.json(trips)
}

// ── POST: Create trip ──

type CreateTripBody = {
    name: string
    slug: string
    startDate: string // YYYY-MM-DD
    endDate: string   // YYYY-MM-DD
    description?: string
    participantIds?: number[]
    visibility?: 'participants' | 'all_users'
    /** ISO 3166-1 alpha-2 country codes. Currencies are derived in code. */
    countries?: string[]
    /** Final currency list to persist. Caller derives this from `countries` so
     *  the server doesn't need to know the country→currency map. USD is always
     *  added if missing. */
    currencies?: string[]
    /** @deprecated single-currency field — kept for backward compatibility
     *  while migrating callers to `currencies`. */
    currency?: string
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const creatorId = authUser.userId

    const body: CreateTripBody = await request.json()
    if (!body.name || !body.startDate || !body.endDate) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const slug = body.slug || slugify(body.name)

    try {
        const tripId = await withAuditUser(creatorId, async (client) => {
            // Get user's default preferences
            const prefsRes = await client.query(
                'SELECT default_trip_visibility, default_participant_role FROM users WHERE id = $1',
                [creatorId]
            )
            const visibility = body.visibility ?? prefsRes.rows[0]?.default_trip_visibility ?? 'participants'
            const defaultRole = prefsRes.rows[0]?.default_participant_role ?? 'viewer'

            // Currency list: prefer `currencies` (multi); fall back to legacy
            // `currency` (single). Legacy `trips.currency` column stores the
            // first non-USD entry for now (or USD if there isn't one) — it's
            // unused by new code but the column still has NOT NULL.
            const currencyList = (body.currencies && body.currencies.length > 0)
                ? body.currencies
                : [body.currency ?? 'USD']
            const currencySet = new Set(currencyList)
            currencySet.add('USD')
            const currencies = Array.from(currencySet)
            const legacyPrimary = currencies.find((c) => c !== 'USD') ?? 'USD'

            const res = await client.query(
                `INSERT INTO trips (name, slug, start_date, end_date, description, created_by, visibility, currency)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [body.name, slug, body.startDate, body.endDate, body.description || null, creatorId, visibility, legacyPrimary]
            )
            const newTripId = res.rows[0].id

            // Persist currency + country join rows
            for (const code of currencies) {
                await client.query(
                    'INSERT INTO trip_currencies (trip_id, currency_code) VALUES ($1, $2)',
                    [newTripId, code]
                )
            }
            if (body.countries) {
                for (const code of body.countries) {
                    await client.query(
                        'INSERT INTO trip_countries (trip_id, country_code) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [newTripId, code]
                    )
                }
            }

            // Add creator as owner
            await client.query(
                'INSERT INTO trip_participants (trip_id, user_id, role) VALUES ($1, $2, $3)',
                [newTripId, creatorId, 'owner']
            )

            // Add additional participants with default role
            if (body.participantIds) {
                for (const uid of body.participantIds) {
                    if (uid !== creatorId) {
                        await client.query(
                            'INSERT INTO trip_participants (trip_id, user_id, role) VALUES ($1, $2, $3)',
                            [newTripId, uid, defaultRole]
                        )
                    }
                }
            }

            return newTripId
        })

        return NextResponse.json({ id: tripId, slug }, { status: 201 })
    } catch (err) {
        console.error('Error creating trip:', err)
        const message = err instanceof Error ? err.message : 'Failed to create trip'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
