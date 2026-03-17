import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Workout, WorkoutExercise } from '@/lib/health-types'

/** Fetch exercises + sets for a list of workout IDs. Returns a map of workoutId → WorkoutExercise[] */
async function fetchWorkoutExercises(
    workoutIds: number[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: (text: string, params: unknown[]) => Promise<{ rows: any[] }>
): Promise<Map<number, WorkoutExercise[]>> {
    const map = new Map<number, WorkoutExercise[]>()
    if (workoutIds.length === 0) return map

    const placeholders = workoutIds.map((_, i) => `$${i + 1}`).join(', ')

    const { rows } = await queryFn(
        `SELECT we.id AS we_id, we.workout_id, we.sort_order, we.weight_lbs,
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
         WHERE we.workout_id IN (${placeholders})
         GROUP BY we.id, we.workout_id, we.sort_order, we.weight_lbs, e.id, e.name, e.is_bodyweight
         ORDER BY we.sort_order, we.id`,
        workoutIds
    )

    for (const r of rows) {
        const entry: WorkoutExercise = {
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
        }
        const list = map.get(r.workout_id) || []
        list.push(entry)
        map.set(r.workout_id, list)
    }

    return map
}

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

    // Fetch exercises for all workouts in one query
    const workoutIds = rows.map((r) => r.id)
    const exerciseMap = await fetchWorkoutExercises(workoutIds, (text, p) => pool.query(text, p))

    const workouts: Workout[] = rows.map((r) => ({
        id: r.id,
        date: r.date.toISOString().split('T')[0],
        notes: r.notes,
        muscleGroups: r.muscle_groups,
        exercises: exerciseMap.get(r.id) || [],
        createdAt: r.created_at.toISOString(),
    }))

    return NextResponse.json(workouts)
}

type ExerciseInput = {
    exerciseId: number
    sortOrder: number
    weightLbs?: number
    sets?: { reps?: number }[]
}

/** Insert workout exercises + sets within a transaction */
async function insertWorkoutExercises(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { query: (text: string, params: unknown[]) => Promise<{ rows: any[] }> },
    workoutId: number,
    exercises: ExerciseInput[]
) {
    for (const ex of exercises) {
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

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, muscleGroupIds, notes, exercises } = await request.json()

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

            // Insert exercises + sets if provided
            if (exercises && Array.isArray(exercises) && exercises.length > 0) {
                await insertWorkoutExercises(client, workoutId, exercises)
            }

            // Fetch the muscle groups for the response
            const mgRes = await client.query(
                `SELECT mg.id, mg.name FROM muscle_groups mg
                 JOIN workout_muscle_groups wmg ON wmg.muscle_group_id = mg.id
                 WHERE wmg.workout_id = $1
                 ORDER BY mg.name`,
                [workoutId]
            )

            // Fetch exercises for response
            const exerciseData = await fetchWorkoutExercises(
                [workoutId],
                (text, p) => client.query(text, p)
            )

            return {
                id: res.rows[0].id,
                date: res.rows[0].date.toISOString().split('T')[0],
                notes: res.rows[0].notes,
                muscleGroups: mgRes.rows.map((r) => ({ id: r.id, name: r.name })),
                exercises: exerciseData.get(workoutId) || [],
                createdAt: res.rows[0].created_at.toISOString(),
            }
        })

        return NextResponse.json(workout, { status: 201 })
    } catch (err) {
        console.error('Error creating workout:', err)
        return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
    }
}
