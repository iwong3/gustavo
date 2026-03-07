import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const res = await pool.query(
        'SELECT default_trip_visibility, default_participant_role FROM users WHERE id = $1',
        [authUser.userId]
    )
    if (res.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
        defaultTripVisibility: res.rows[0].default_trip_visibility,
        defaultParticipantRole: res.rows[0].default_participant_role,
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
