import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { DaysSince } from '@/lib/health-types'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // For each group-level muscle (those with no parent entries), find the most
    // recent workout containing that group OR any of its children (targets).
    // This is the parent rollup: logging "Lats" counts as logging "Back".
    const { rows } = await pool.query(
        `WITH group_muscles AS (
            -- All group-level muscles (no parent rows)
            SELECT mg.id, mg.name
            FROM muscle_groups mg
            WHERE NOT EXISTS (
                SELECT 1 FROM muscle_group_parents mgp WHERE mgp.child_id = mg.id
            )
        ),
        group_with_children AS (
            -- For each group, collect itself + all its children
            SELECT gm.id AS group_id, gm.name AS group_name, gm.id AS muscle_id
            FROM group_muscles gm
            UNION ALL
            SELECT gm.id AS group_id, gm.name AS group_name, mgp.child_id AS muscle_id
            FROM group_muscles gm
            JOIN muscle_group_parents mgp ON mgp.parent_id = gm.id
        ),
        latest_per_group AS (
            SELECT gwc.group_id, gwc.group_name, MAX(w.date) AS last_date
            FROM group_with_children gwc
            JOIN workout_muscle_groups wmg ON wmg.muscle_group_id = gwc.muscle_id
            JOIN workouts w ON w.id = wmg.workout_id
                AND w.user_id = $1
                AND w.deleted_at IS NULL
            GROUP BY gwc.group_id, gwc.group_name
        )
        SELECT gm.name AS muscle_group,
               lpg.last_date,
               CASE
                   WHEN lpg.last_date IS NOT NULL
                   THEN CURRENT_DATE - lpg.last_date
                   ELSE NULL
               END AS days_since
        FROM group_muscles gm
        LEFT JOIN latest_per_group lpg ON lpg.group_id = gm.id
        ORDER BY days_since DESC NULLS FIRST, gm.name`,
        [authUser.userId]
    )

    const daysSince: DaysSince[] = rows.map((r) => ({
        muscleGroup: r.muscle_group,
        daysSince: r.days_since != null ? parseInt(r.days_since, 10) : null,
        lastDate: r.last_date ? r.last_date.toISOString().split('T')[0] : null,
    }))

    return NextResponse.json(daysSince)
}
