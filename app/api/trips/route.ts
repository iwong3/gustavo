import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'

export async function GET(request: NextRequest) {
    const slug = request.nextUrl.searchParams.get('slug')

    if (slug) {
        // Single trip by slug
        const tripRes = await pool.query(
            `SELECT id, name, slug, description, start_date, end_date, created_by
             FROM trips WHERE slug = $1 AND deleted_at IS NULL`,
            [slug]
        )
        if (tripRes.rows.length === 0) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        const trip = tripRes.rows[0]

        const participantsRes = await pool.query(
            `SELECT u.id, u.name, split_part(u.name, ' ', 1) AS first_name,
                    u.email, u.avatar_url, u.initials, u.venmo_url
             FROM trip_participants tp
             JOIN users u ON tp.user_id = u.id
             WHERE tp.trip_id = $1 AND tp.left_at IS NULL
             ORDER BY u.name`,
            [trip.id]
        )

        return NextResponse.json({
            id: trip.id,
            name: trip.name,
            slug: trip.slug,
            description: trip.description,
            startDate: trip.start_date,
            endDate: trip.end_date,
            createdBy: trip.created_by,
            participants: participantsRes.rows.map((u) => ({
                id: u.id,
                name: u.name,
                firstName: u.first_name,
                email: u.email,
                avatarUrl: u.avatar_url,
                initials: u.initials,
                venmoUrl: u.venmo_url,
            })),
        })
    }

    // All trips with participants
    const tripsRes = await pool.query(
        `SELECT id, name, slug, description, start_date, end_date, created_by
         FROM trips WHERE deleted_at IS NULL
         ORDER BY start_date DESC`
    )

    const tripIds = tripsRes.rows.map((t) => t.id)
    if (tripIds.length === 0) {
        return NextResponse.json([])
    }

    // Fetch all participants for all trips in one query
    const participantsRes = await pool.query(
        `SELECT tp.trip_id, u.id, u.name, split_part(u.name, ' ', 1) AS first_name,
                u.email, u.avatar_url, u.initials, u.venmo_url
         FROM trip_participants tp
         JOIN users u ON tp.user_id = u.id
         WHERE tp.trip_id = ANY($1) AND tp.left_at IS NULL
         ORDER BY u.name`,
        [tripIds]
    )

    // Group participants by trip
    const participantsByTrip = new Map<number, typeof participantsRes.rows>()
    for (const p of participantsRes.rows) {
        const list = participantsByTrip.get(p.trip_id) ?? []
        list.push(p)
        participantsByTrip.set(p.trip_id, list)
    }

    const trips = tripsRes.rows.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        startDate: t.start_date,
        endDate: t.end_date,
        createdBy: t.created_by,
        participants: (participantsByTrip.get(t.id) ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            firstName: u.first_name,
            email: u.email,
            avatarUrl: u.avatar_url,
            initials: u.initials,
            venmoUrl: u.venmo_url,
        })),
    }))

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
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateTripBody = await request.json()
    if (!body.name || !body.startDate || !body.endDate) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const creatorRes = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [session.user.email])
    const creatorId: number | null = creatorRes.rows.length > 0 ? creatorRes.rows[0].id : null

    const slug = body.slug || slugify(body.name)

    try {
        const tripId = await withAuditUser(creatorId, async (client) => {
            const res = await client.query(
                `INSERT INTO trips (name, slug, start_date, end_date, description, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [body.name, slug, body.startDate, body.endDate, body.description || null, creatorId]
            )
            const newTripId = res.rows[0].id

            // Add creator as participant
            if (creatorId) {
                await client.query(
                    'INSERT INTO trip_participants (trip_id, user_id) VALUES ($1, $2)',
                    [newTripId, creatorId]
                )
            }

            // Add additional participants
            if (body.participantIds) {
                for (const uid of body.participantIds) {
                    if (uid !== creatorId) {
                        await client.query(
                            'INSERT INTO trip_participants (trip_id, user_id) VALUES ($1, $2)',
                            [newTripId, uid]
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
