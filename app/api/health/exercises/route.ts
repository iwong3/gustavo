import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Exercise } from '@/lib/health-types'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rows } = await pool.query(
        `SELECT e.id, e.name, e.is_bodyweight,
                COALESCE(
                    json_agg(
                        json_build_object('id', mg.id, 'name', mg.name)
                        ORDER BY mg.name
                    ) FILTER (WHERE mg.id IS NOT NULL),
                    '[]'
                ) AS muscle_groups
         FROM exercises e
         LEFT JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
         LEFT JOIN muscle_groups mg ON mg.id = emg.muscle_group_id
         WHERE e.user_id = $1 AND e.deleted_at IS NULL
         GROUP BY e.id, e.name, e.is_bodyweight
         ORDER BY e.name`,
        [authUser.userId]
    )

    const exercises: Exercise[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        isBodyweight: r.is_bodyweight,
        muscleGroups: r.muscle_groups,
    }))

    return NextResponse.json(exercises)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, isBodyweight, muscleGroupIds } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    if (!muscleGroupIds || !Array.isArray(muscleGroupIds) || muscleGroupIds.length === 0) {
        return NextResponse.json(
            { error: 'muscleGroupIds (non-empty array) is required' },
            { status: 400 }
        )
    }

    try {
        const exercise = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO exercises (user_id, name, is_bodyweight)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, is_bodyweight`,
                [authUser.userId, name.trim(), isBodyweight ?? false]
            )

            const exerciseId = res.rows[0].id

            // Insert muscle group associations
            const values = muscleGroupIds
                .map((_: number, i: number) => `($1, $${i + 2})`)
                .join(', ')
            await client.query(
                `INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id) VALUES ${values}`,
                [exerciseId, ...muscleGroupIds]
            )

            // Fetch muscle groups for response
            const mgRes = await client.query(
                `SELECT mg.id, mg.name FROM muscle_groups mg
                 JOIN exercise_muscle_groups emg ON emg.muscle_group_id = mg.id
                 WHERE emg.exercise_id = $1
                 ORDER BY mg.name`,
                [exerciseId]
            )

            return {
                id: res.rows[0].id,
                name: res.rows[0].name,
                isBodyweight: res.rows[0].is_bodyweight,
                muscleGroups: mgRes.rows.map((r) => ({ id: r.id, name: r.name })),
            } as Exercise
        })

        return NextResponse.json(exercise, { status: 201 })
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'An exercise with that name already exists' }, { status: 409 })
        }
        console.error('Error creating exercise:', err)
        return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
    }
}
