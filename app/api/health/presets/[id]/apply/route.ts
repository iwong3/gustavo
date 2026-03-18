import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

type Params = { id: string }

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const presetId = parseInt(id, 10)
    if (isNaN(presetId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    // Verify ownership and get type
    const check = await pool.query(
        'SELECT id, type FROM presets WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [presetId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const type = check.rows[0].type
    const body = await request.json().catch(() => ({}))
    const date = body.date || new Date().toISOString().split('T')[0]

    try {
        if (type === 'workout') {
            const result = await applyWorkoutPreset(authUser.userId, presetId, date)
            return NextResponse.json(result, { status: 201 })
        } else {
            const result = await applySupplementPreset(authUser.userId, presetId, date)
            return NextResponse.json(result, { status: 201 })
        }
    } catch (err) {
        console.error('Error applying preset:', err)
        return NextResponse.json({ error: 'Failed to apply preset' }, { status: 500 })
    }
}

async function applyWorkoutPreset(userId: number, presetId: number, date: string) {
    return withAuditUser(userId, async (client) => {
        // Get preset muscle groups
        const mgRes = await client.query(
            `SELECT muscle_group_id FROM preset_muscle_groups WHERE preset_id = $1`,
            [presetId]
        )

        // Get preset exercises
        const exRes = await client.query(
            `SELECT exercise_id, sort_order FROM preset_exercises
             WHERE preset_id = $1 ORDER BY sort_order`,
            [presetId]
        )

        // Create workout
        const workoutRes = await client.query(
            `INSERT INTO workouts (user_id, date) VALUES ($1, $2) RETURNING id`,
            [userId, date]
        )
        const workoutId = workoutRes.rows[0].id

        // Insert muscle groups
        for (const mg of mgRes.rows) {
            await client.query(
                `INSERT INTO workout_muscle_groups (workout_id, muscle_group_id) VALUES ($1, $2)`,
                [workoutId, mg.muscle_group_id]
            )
        }

        // Insert exercises with most recent weights
        for (const ex of exRes.rows) {
            // Find most recent weight for this exercise
            const weightRes = await client.query(
                `SELECT we.weight_lbs FROM workout_exercises we
                 JOIN workouts w ON w.id = we.workout_id
                 WHERE we.exercise_id = $1 AND w.user_id = $2 AND w.deleted_at IS NULL
                   AND we.weight_lbs IS NOT NULL
                 ORDER BY w.date DESC, w.created_at DESC
                 LIMIT 1`,
                [ex.exercise_id, userId]
            )
            const lastWeight = weightRes.rows.length > 0 ? weightRes.rows[0].weight_lbs : null

            await client.query(
                `INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, weight_lbs)
                 VALUES ($1, $2, $3, $4)`,
                [workoutId, ex.exercise_id, ex.sort_order, lastWeight]
            )
        }

        return { workoutId: Number(workoutId) }
    })
}

async function applySupplementPreset(userId: number, presetId: number, date: string) {
    return withAuditUser(userId, async (client) => {
        // Get preset supplements
        const supRes = await client.query(
            `SELECT supplement_id FROM preset_supplements WHERE preset_id = $1`,
            [presetId]
        )

        const logged: number[] = []
        for (const sup of supRes.rows) {
            await client.query(
                `INSERT INTO supplement_logs (user_id, supplement_id, date, quantity)
                 VALUES ($1, $2, $3, 1)
                 ON CONFLICT (user_id, supplement_id, date)
                 DO UPDATE SET quantity = supplement_logs.quantity + 1, updated_at = now()`,
                [userId, sup.supplement_id, date]
            )
            logged.push(Number(sup.supplement_id))
        }

        return { logged, date }
    })
}
