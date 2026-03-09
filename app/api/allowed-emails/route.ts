import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!authUser.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const res = await pool.query(
        `SELECT ae.id, ae.email, ae.created_at,
                u.name AS added_by_name,
                eu.id AS user_id, eu.name AS user_name
         FROM allowed_emails ae
         LEFT JOIN users u ON u.id = ae.added_by
         LEFT JOIN users eu ON LOWER(eu.email) = LOWER(ae.email) AND eu.deleted_at IS NULL
         ORDER BY ae.created_at DESC`
    )

    return NextResponse.json(
        res.rows.map((r) => ({
            id: r.id,
            email: r.email,
            createdAt: r.created_at,
            addedByName: r.added_by_name,
            hasAccount: r.user_id != null,
            userName: r.user_name,
        }))
    )
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!authUser.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const email = (body.email ?? '').trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await pool.query(
        'SELECT 1 FROM allowed_emails WHERE LOWER(email) = $1 LIMIT 1',
        [email]
    )
    if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Email already in allowlist' }, { status: 409 })
    }

    const res = await pool.query(
        'INSERT INTO allowed_emails (email, added_by) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, authUser.userId]
    )

    return NextResponse.json({
        id: res.rows[0].id,
        email: res.rows[0].email,
        createdAt: res.rows[0].created_at,
        addedByName: null,
        hasAccount: false,
        userName: null,
    }, { status: 201 })
}
