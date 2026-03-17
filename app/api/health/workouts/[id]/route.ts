import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

type ExerciseInput = {
    exerciseId: number
    sortOrder: number
    weightLbs?: number
    sets?: { reps?: number }[]
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const workoutId = parseInt(id, 10)
    if (isNaN(workoutId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const { date, muscleGroupIds, notes, exercises } = await request.json()

    if (!date || !muscleGroupIds || !Array.isArray(muscleGroupIds) || muscleGroupIds.length === 0) {
        return NextResponse.json(
            { error: 'date and muscleGroupIds (non-empty array) are required' },
            { status: 400 }
        )
    }

    try {
        const workout = await withAuditUser(authUser.userId, async (client) => {
            // Verify ownership
            const existing = await client.query(
                `SELECT id FROM workouts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
                [workoutId, authUser.userId]
            )
            if (existing.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }

            // Update workout
            await client.query(
                `UPDATE workouts SET date = $1, notes = $2 WHERE id = $3`,
                [date, notes || null, workoutId]
            )

            // Replace muscle group associations
            await client.query(
                `DELETE FROM workout_muscle_groups WHERE workout_id = $1`,
                [workoutId]
            )

            const values = muscleGroupIds
                .map((_: number, i: number) => `($1, $${i + 2})`)
                .join(', ')
            await client.query(
                `INSERT INTO workout_muscle_groups (workout_id, muscle_group_id) VALUES ${values}`,
                [workoutId, ...muscleGroupIds]
            )

            // Replace exercises + sets (CASCADE deletes old sets via workout_exercises FK)
            await client.query(
                `DELETE FROM workout_exercises WHERE workout_id = $1`,
                [workoutId]
            )

            if (exercises && Array.isArray(exercises) && exercises.length > 0) {
                for (const ex of exercises as ExerciseInput[]) {
                    const weRes = await client.query(
                        `INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, weight_lbs)
                         VALUES ($1, $2, $3, $4) RETURNING id`,
                        [workoutId, ex.exerciseId, ex.sortOrder, ex.weightLbs ?? null]
                    )
                    const weId = weRes.rows[0].id

                    if (ex.sets && ex.sets.length > 0) {
                        const setValues = ex.sets
                            .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
                            .join(', ')
                        const setParams: (number | null)[] = [weId]
                        ex.sets.forEach((s, i) => {
                            setParams.push(i + 1, s.reps ?? null)
                        })
                        await client.query(
                            `INSERT INTO workout_exercise_sets (workout_exercise_id, set_number, reps)
                             VALUES ${setValues}`,
                            setParams
                        )
                    }
                }
            }

            // Fetch updated data
            const res = await client.query(
                `SELECT w.id, w.date, w.notes, w.created_at FROM workouts w WHERE w.id = $1`,
                [workoutId]
            )
            const mgRes = await client.query(
                `SELECT mg.id, mg.name FROM muscle_groups mg
                 JOIN workout_muscle_groups wmg ON wmg.muscle_group_id = mg.id
                 WHERE wmg.workout_id = $1
                 ORDER BY mg.name`,
                [workoutId]
            )

            // Fetch exercises
            const weRows = await client.query(
                `SELECT we.id AS we_id, we.sort_order, we.weight_lbs,
                        e.id AS exercise_id, e.name AS exercise_name, e.is_bodyweight,
                        COALESCE(
                            json_agg(
                                json_build_object('id', emg_mg.id, 'name', emg_mg.name)
                                ORDER BY emg_mg.name
                            ) FILTER (WHERE emg_mg.id IS NOT NULL),
                            '[]'
                        ) AS exercise_muscle_groups,
                        COALESCE(
                            json_agg(
                                json_build_object('setNumber', wes.set_number, 'reps', wes.reps)
                                ORDER BY wes.set_number
                            ) FILTER (WHERE wes.id IS NOT NULL),
                            '[]'
                        ) AS sets
                 FROM workout_exercises we
                 JOIN exercises e ON e.id = we.exercise_id
                 LEFT JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
                 LEFT JOIN muscle_groups emg_mg ON emg_mg.id = emg.muscle_group_id
                 LEFT JOIN workout_exercise_sets wes ON wes.workout_exercise_id = we.id
                 WHERE we.workout_id = $1
                 GROUP BY we.id, we.sort_order, we.weight_lbs, e.id, e.name, e.is_bodyweight
                 ORDER BY we.sort_order, we.id`,
                [workoutId]
            )

            return {
                id: res.rows[0].id,
                date: res.rows[0].date.toISOString().split('T')[0],
                notes: res.rows[0].notes,
                muscleGroups: mgRes.rows.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name })),
                exercises: weRows.rows.map((r) => ({
                    id: r.we_id,
                    exercise: {
                        id: r.exercise_id,
                        name: r.exercise_name,
                        isBodyweight: r.is_bodyweight,
                        muscleGroups: r.exercise_muscle_groups,
                    },
                    weightLbs: r.weight_lbs != null ? Number(r.weight_lbs) : null,
                    sortOrder: r.sort_order,
                    sets: r.sets,
                })),
                createdAt: res.rows[0].created_at.toISOString(),
            }
        })

        return NextResponse.json(workout)
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
        }
        console.error('Error updating workout:', err)
        return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const workoutId = parseInt(id, 10)
    if (isNaN(workoutId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    try {
        await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `UPDATE workouts SET deleted_at = now()
                 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
                 RETURNING id`,
                [workoutId, authUser.userId]
            )
            if (res.rows.length === 0) {
                throw new Error('NOT_FOUND')
            }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
        }
        console.error('Error deleting workout:', err)
        return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 })
    }
}
