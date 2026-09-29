/**
 * One workout per day (00044): logging a routine or saving the new-workout
 * form on a day that already has a workout adds to that workout instead of
 * creating a second one. Server-only; call inside withAuditUser.
 */
import type { PoolClient } from 'pg'

/** The day's workout, created if there isn't one. `ON CONFLICT` against the
 *  partial unique index makes two quick taps land on the same row. */
export async function getOrCreateDayWorkout(
    client: PoolClient,
    userId: number,
    date: string,
): Promise<{ workoutId: number; created: boolean }> {
    const ins = await client.query(
        `INSERT INTO workouts (user_id, date) VALUES ($1, $2)
         ON CONFLICT (user_id, date) WHERE deleted_at IS NULL DO NOTHING
         RETURNING id`,
        [userId, date],
    )
    if (ins.rows.length > 0) return { workoutId: Number(ins.rows[0].id), created: true }
    const existing = await client.query(
        `SELECT id FROM workouts
         WHERE user_id = $1 AND date = $2 AND deleted_at IS NULL
         FOR UPDATE`,
        [userId, date],
    )
    return { workoutId: Number(existing.rows[0].id), created: false }
}

/** Adds muscle groups the workout doesn't have yet; returns the ones added. */
export async function addMuscleGroups(
    client: PoolClient,
    workoutId: number,
    muscleGroupIds: (number | string)[],
): Promise<number[]> {
    if (muscleGroupIds.length === 0) return []
    const res = await client.query(
        `INSERT INTO workout_muscle_groups (workout_id, muscle_group_id)
         SELECT $1, unnest($2::bigint[])
         ON CONFLICT (workout_id, muscle_group_id) DO NOTHING
         RETURNING muscle_group_id`,
        [workoutId, muscleGroupIds.map(Number)],
    )
    return res.rows.map((r) => Number(r.muscle_group_id))
}

/** Next free sort_order, so added exercises land after the existing ones. */
export async function nextExerciseSortOrder(client: PoolClient, workoutId: number): Promise<number> {
    const res = await client.query(
        `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM workout_exercises WHERE workout_id = $1`,
        [workoutId],
    )
    return Number(res.rows[0].next)
}

/** Joins new notes onto the workout's existing notes. */
export async function appendNotes(client: PoolClient, workoutId: number, notes: string | null | undefined) {
    const text = notes?.trim()
    if (!text) return
    await client.query(
        `UPDATE workouts SET notes = concat_ws(E'\\n\\n', NULLIF(notes, ''), $2::text) WHERE id = $1`,
        [workoutId, text],
    )
}
