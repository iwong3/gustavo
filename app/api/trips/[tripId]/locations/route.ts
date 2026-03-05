import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ tripId: string }> }
) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const { rows } = await pool.query(
        `SELECT id, name FROM locations
         WHERE trip_id = $1 AND deleted_at IS NULL
         ORDER BY name`,
        [id]
    )

    return NextResponse.json(rows)
}
