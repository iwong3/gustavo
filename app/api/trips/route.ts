import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
    const { rows } = await pool.query<{
        id: number
        name: string
        slug: string
        start_date: string
        end_date: string
        participants: string[]
    }>(`
        SELECT
            t.id,
            t.name,
            t.slug,
            t.start_date,
            t.end_date,
            ARRAY_AGG(
                DISTINCT split_part(u.name, ' ', 1)
                ORDER BY split_part(u.name, ' ', 1)
            ) FILTER (WHERE u.name IS NOT NULL) AS participants
        FROM trips t
        LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.left_at IS NULL
        LEFT JOIN users u ON tp.user_id = u.id
        WHERE t.deleted_at IS NULL
        GROUP BY t.id
        ORDER BY t.start_date DESC
    `)

    return NextResponse.json(rows)
}
