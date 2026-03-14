import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Workout } from '@/lib/health-types'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = `
        SELECT w.id, w.date, w.notes, w.created_at,
               COALESCE(
                   json_agg(
                       json_build_object('id', mg.id, 'name', mg.name)
                       ORDER BY mg.name
                   ) FILTER (WHERE mg.id IS NOT NULL),
                   '[]'
               ) AS muscle_groups
        FROM workouts w
        LEFT JOIN workout_muscle_groups wmg ON wmg.workout_id = w.id
        LEFT JOIN muscle_groups mg ON mg.id = wmg.muscle_group_id
        WHERE w.user_id = $1 AND w.deleted_at IS NULL`

    const params: (string | number)[] = [authUser.userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND w.date >= $${params.length}`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND w.date <= $${params.length}`
    }

    query += ` GROUP BY w.id, w.date, w.notes, w.created_at ORDER BY w.date DESC, w.created_at DESC`

    const { rows } = await pool.query(query, params)

    const workouts: Workout[] = rows.map((r) => ({
        id: r.id,
        date: r.date.toISOString().split('T')[0],
        notes: r.notes,
        muscleGroups: r.muscle_groups,
        createdAt: r.created_at.toISOString(),
    }))

    return NextResponse.json(workouts)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, muscleGroupIds, notes } = await request.json()

    if (!date || !muscleGroupIds || !Array.isArray(muscleGroupIds) || muscleGroupIds.length === 0) {
        return NextResponse.json(
            { error: 'date and muscleGroupIds (non-empty array) are required' },
            { status: 400 }
        )
    }

    try {
        const workout = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO workouts (user_id, date, notes)
                 VALUES ($1, $2, $3)
                 RETURNING id, date, notes, created_at`,
                [authUser.userId, date, notes || null]
            )

            const workoutId = res.rows[0].id

            // Insert muscle group associations
            const values = muscleGroupIds
                .map((_: number, i: number) => `($1, $${i + 2})`)
                .join(', ')
            const mgParams = [workoutId, ...muscleGroupIds]

            await client.query(
                `INSERT INTO workout_muscle_groups (workout_id, muscle_group_id) VALUES ${values}`,
                mgParams
            )

            // Fetch the muscle groups for the response
            const mgRes = await client.query(
                `SELECT mg.id, mg.name FROM muscle_groups mg
                 JOIN workout_muscle_groups wmg ON wmg.muscle_group_id = mg.id
                 WHERE wmg.workout_id = $1
                 ORDER BY mg.name`,
                [workoutId]
            )

            return {
                id: res.rows[0].id,
                date: res.rows[0].date.toISOString().split('T')[0],
                notes: res.rows[0].notes,
                muscleGroups: mgRes.rows.map((r) => ({ id: r.id, name: r.name })),
                createdAt: res.rows[0].created_at.toISOString(),
            }
        })

        return NextResponse.json(workout, { status: 201 })
    } catch (err) {
        console.error('Error creating workout:', err)
        return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
    }
}
