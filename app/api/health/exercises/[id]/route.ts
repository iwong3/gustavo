import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Exercise } from '@/lib/health-types'

type Params = { id: string }

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const exerciseId = parseInt(id, 10)
    if (isNaN(exerciseId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

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

    // Deduplicate and cast to numbers
    const uniqueMgIds = Array.from(new Set(muscleGroupIds.map(Number)))

    // Verify ownership
    const check = await pool.query(
        'SELECT id FROM exercises WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [exerciseId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    try {
        const exercise = await withAuditUser(authUser.userId, async (client) => {
            await client.query(
                `UPDATE exercises SET name = $1, is_bodyweight = $2 WHERE id = $3`,
                [name.trim(), isBodyweight ?? false, exerciseId]
            )

            // Replace muscle group associations
            await client.query(
                `DELETE FROM exercise_muscle_groups WHERE exercise_id = $1`,
                [exerciseId]
            )

            const values = uniqueMgIds
                .map((_: number, i: number) => `($1, $${i + 2})`)
                .join(', ')
            await client.query(
                `INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id) VALUES ${values}`,
                [exerciseId, ...uniqueMgIds]
            )

            // Fetch updated data
            const res = await client.query(
                `SELECT id, name, is_bodyweight FROM exercises WHERE id = $1`,
                [exerciseId]
            )
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
                muscleGroups: mgRes.rows.map((r: { id: number; name: string }) => ({
                    id: r.id,
                    name: r.name,
                })),
            } as Exercise
        })

        return NextResponse.json(exercise)
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'An exercise with that name already exists' }, { status: 409 })
        }
        console.error('Error updating exercise:', err)
        return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const exerciseId = parseInt(id, 10)
    if (isNaN(exerciseId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    // Verify ownership
    const check = await pool.query(
        'SELECT id FROM exercises WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [exerciseId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            'UPDATE exercises SET deleted_at = now() WHERE id = $1',
            [exerciseId]
        )
    })

    return NextResponse.json({ success: true })
}
