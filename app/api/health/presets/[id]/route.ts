import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

type Params = { id: string }

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const presetId = parseInt(id, 10)
    if (isNaN(presetId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const { name, muscleGroupIds, exerciseIds, supplementIds, foodItems } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Verify ownership
    const check = await pool.query(
        'SELECT id, type FROM presets WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [presetId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const type = check.rows[0].type

    try {
        await withAuditUser(authUser.userId, async (client) => {
            await client.query(
                `UPDATE presets SET name = $1 WHERE id = $2`,
                [name.trim(), presetId]
            )

            if (type === 'diet') {
                // Replace food items
                await client.query(`DELETE FROM preset_foods WHERE preset_id = $1`, [presetId])
                if (foodItems?.length) {
                    for (const item of foodItems as { foodId: number; quantity?: number }[]) {
                        await client.query(
                            `INSERT INTO preset_foods (preset_id, food_id, quantity) VALUES ($1, $2, $3)`,
                            [presetId, item.foodId, item.quantity || 1]
                        )
                    }
                }
            } else if (type === 'workout') {
                // Replace muscle groups
                await client.query(`DELETE FROM preset_muscle_groups WHERE preset_id = $1`, [presetId])
                if (muscleGroupIds?.length) {
                    const mgValues = muscleGroupIds
                        .map((_: number, i: number) => `($1, $${i + 2})`)
                        .join(', ')
                    await client.query(
                        `INSERT INTO preset_muscle_groups (preset_id, muscle_group_id) VALUES ${mgValues}`,
                        [presetId, ...muscleGroupIds]
                    )
                }
                // Replace exercises
                await client.query(`DELETE FROM preset_exercises WHERE preset_id = $1`, [presetId])
                if (exerciseIds?.length) {
                    const exValues = exerciseIds
                        .map((_: number, i: number) => `($1, $${i + 2}, ${i})`)
                        .join(', ')
                    await client.query(
                        `INSERT INTO preset_exercises (preset_id, exercise_id, sort_order) VALUES ${exValues}`,
                        [presetId, ...exerciseIds]
                    )
                }
            } else {
                // Replace supplements
                await client.query(`DELETE FROM preset_supplements WHERE preset_id = $1`, [presetId])
                if (supplementIds?.length) {
                    const supValues = supplementIds
                        .map((_: number, i: number) => `($1, $${i + 2})`)
                        .join(', ')
                    await client.query(
                        `INSERT INTO preset_supplements (preset_id, supplement_id) VALUES ${supValues}`,
                        [presetId, ...supplementIds]
                    )
                }
            }
        })

        return NextResponse.json({ id: presetId, name: name.trim(), type })
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'A preset with that name already exists' }, { status: 409 })
        }
        console.error('Error updating preset:', err)
        return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const presetId = parseInt(id, 10)
    if (isNaN(presetId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const check = await pool.query(
        'SELECT id FROM presets WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [presetId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            'UPDATE presets SET deleted_at = now() WHERE id = $1',
            [presetId]
        )
    })

    return NextResponse.json({ success: true })
}
