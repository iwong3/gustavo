import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const res = await pool.query(
        'SELECT default_trip_visibility, default_participant_role, initials, icon_color, is_admin FROM users WHERE id = $1',
        [authUser.userId]
    )
    if (res.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
        defaultTripVisibility: res.rows[0].default_trip_visibility,
        defaultParticipantRole: res.rows[0].default_participant_role,
        initials: res.rows[0].initials,
        iconColor: res.rows[0].icon_color,
        isAdmin: res.rows[0].is_admin ?? false,
    })
}

export async function PUT(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (body.defaultTripVisibility !== undefined) {
        if (body.defaultTripVisibility !== 'participants' && body.defaultTripVisibility !== 'all_users') {
            return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 })
        }
        sets.push(`default_trip_visibility = $${idx++}`)
        values.push(body.defaultTripVisibility)
    }

    if (body.defaultParticipantRole !== undefined) {
        if (body.defaultParticipantRole !== 'editor' && body.defaultParticipantRole !== 'viewer') {
            return NextResponse.json({ error: 'Invalid role value' }, { status: 400 })
        }
        sets.push(`default_participant_role = $${idx++}`)
        values.push(body.defaultParticipantRole)
    }

    if (body.initials !== undefined) {
        if (typeof body.initials !== 'string' || body.initials.length < 1 || body.initials.length > 3) {
            return NextResponse.json({ error: 'Initials must be 1-3 characters' }, { status: 400 })
        }
        sets.push(`initials = $${idx++}`)
        values.push(body.initials.toUpperCase())
    }

    if (body.iconColor !== undefined) {
        if (typeof body.iconColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(body.iconColor)) {
            return NextResponse.json({ error: 'Invalid hex color' }, { status: 400 })
        }
        sets.push(`icon_color = $${idx++}`)
        values.push(body.iconColor)
    }

    if (sets.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(authUser.userId)
    await pool.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`,
        values
    )

    return NextResponse.json({ success: true })
}
