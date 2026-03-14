import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { MuscleGroupWithParents } from '@/lib/health-types'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rows } = await pool.query(
        `SELECT mg.id, mg.name,
                COALESCE(
                    json_agg(
                        json_build_object('id', p.id, 'name', p.name)
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'
                ) AS parents
         FROM muscle_groups mg
         LEFT JOIN muscle_group_parents mgp ON mgp.child_id = mg.id
         LEFT JOIN muscle_groups p ON p.id = mgp.parent_id
         GROUP BY mg.id, mg.name
         ORDER BY mg.name`
    )

    const muscleGroups: MuscleGroupWithParents[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        parents: r.parents,
    }))

    return NextResponse.json(muscleGroups)
}
