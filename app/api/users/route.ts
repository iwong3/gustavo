import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const res = await pool.query(
        `SELECT id, name, split_part(name, ' ', 1) AS first_name,
                email, avatar_url, initials, icon_color, venmo_url
         FROM users
         WHERE deleted_at IS NULL
         ORDER BY name`
    )

    return NextResponse.json(
        res.rows.map((u) => ({
            id: u.id,
            name: u.name,
            firstName: u.first_name,
            email: u.email,
            avatarUrl: u.avatar_url,
            initials: u.initials,
            iconColor: u.icon_color,
            venmoUrl: u.venmo_url,
        }))
    )
}
