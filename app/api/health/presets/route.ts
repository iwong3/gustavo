import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { WorkoutPreset, SupplementPreset, DietPreset } from '@/lib/health-types'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const type = request.nextUrl.searchParams.get('type')
    if (!type || !['workout', 'supplement', 'diet'].includes(type)) {
        return NextResponse.json({ error: 'type query param required (workout | supplement | diet)' }, { status: 400 })
    }

    const { rows } = await pool.query(
        `SELECT id, name FROM presets
         WHERE user_id = $1 AND type = $2 AND deleted_at IS NULL
         ORDER BY sort_order, id`,
        [authUser.userId, type]
    )

    if (type === 'diet') {
        const presets: DietPreset[] = await Promise.all(
            rows.map(async (r) => {
                const foodRes = await pool.query(
                    `SELECT f.id, f.name, pf.quantity FROM foods f
                     JOIN preset_foods pf ON pf.food_id = f.id
                     WHERE pf.preset_id = $1 AND f.deleted_at IS NULL
                     ORDER BY f.name`,
                    [r.id]
                )
                return {
                    id: Number(r.id),
                    name: r.name,
                    items: foodRes.rows.map((f) => ({
                        foodId: Number(f.id),
                        foodName: f.name,
                        quantity: f.quantity,
                    })),
                }
            })
        )
        return NextResponse.json(presets)
    }

    if (type === 'workout') {
        const presets: WorkoutPreset[] = await Promise.all(
            rows.map(async (r) => {
                const mgRes = await pool.query(
                    `SELECT mg.id, mg.name FROM muscle_groups mg
                     JOIN preset_muscle_groups pmg ON pmg.muscle_group_id = mg.id
                     WHERE pmg.preset_id = $1
                     ORDER BY mg.name`,
                    [r.id]
                )
                const exRes = await pool.query(
                    `SELECT e.id, e.name, e.is_bodyweight,
                            COALESCE(
                                json_agg(
                                    json_build_object('id', emg.muscle_group_id, 'name', mg2.name)
                                    ORDER BY mg2.name
                                ) FILTER (WHERE mg2.id IS NOT NULL),
                                '[]'
                            ) AS muscle_groups
                     FROM preset_exercises pe
                     JOIN exercises e ON e.id = pe.exercise_id
                     LEFT JOIN exercise_muscle_groups emg ON emg.exercise_id = e.id
                     LEFT JOIN muscle_groups mg2 ON mg2.id = emg.muscle_group_id
                     WHERE pe.preset_id = $1 AND e.deleted_at IS NULL
                     GROUP BY e.id, e.name, e.is_bodyweight, pe.sort_order
                     ORDER BY pe.sort_order`,
                    [r.id]
                )
                return {
                    id: Number(r.id),
                    name: r.name,
                    muscleGroups: mgRes.rows.map((mg) => ({ id: Number(mg.id), name: mg.name })),
                    exercises: exRes.rows.map((ex) => ({
                        id: Number(ex.id),
                        name: ex.name,
                        isBodyweight: ex.is_bodyweight,
                        muscleGroups: ex.muscle_groups,
                    })),
                }
            })
        )
        return NextResponse.json(presets)
    }

    // Supplement presets
    const presets: SupplementPreset[] = await Promise.all(
        rows.map(async (r) => {
            const supRes = await pool.query(
                `SELECT s.id, s.name, s.dosage, s.is_active FROM supplements s
                 JOIN preset_supplements ps ON ps.supplement_id = s.id
                 WHERE ps.preset_id = $1 AND s.deleted_at IS NULL
                 ORDER BY s.name`,
                [r.id]
            )
            return {
                id: Number(r.id),
                name: r.name,
                supplements: supRes.rows.map((s) => ({
                    id: Number(s.id),
                    name: s.name,
                    dosage: s.dosage,
                    isActive: s.is_active,
                })),
            }
        })
    )
    return NextResponse.json(presets)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, type, muscleGroupIds, exerciseIds, supplementIds, foodItems } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!type || !['workout', 'supplement', 'diet'].includes(type)) {
        return NextResponse.json({ error: 'type must be workout, supplement, or diet' }, { status: 400 })
    }

    try {
        const preset = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO presets (user_id, name, type, sort_order)
                 VALUES ($1, $2, $3, COALESCE(
                     (SELECT MAX(sort_order) + 1 FROM presets WHERE user_id = $1 AND type = $3 AND deleted_at IS NULL),
                     0
                 ))
                 RETURNING id, name, type`,
                [authUser.userId, name.trim(), type]
            )
            const presetId = res.rows[0].id

            if (type === 'diet') {
                // Insert food items
                if (foodItems?.length) {
                    for (const item of foodItems as { foodId: number; quantity?: number }[]) {
                        await client.query(
                            `INSERT INTO preset_foods (preset_id, food_id, quantity) VALUES ($1, $2, $3)`,
                            [presetId, item.foodId, item.quantity || 1]
                        )
                    }
                }
            } else if (type === 'workout') {
                // Insert muscle groups
                if (muscleGroupIds?.length) {
                    const mgValues = muscleGroupIds
                        .map((_: number, i: number) => `($1, $${i + 2})`)
                        .join(', ')
                    await client.query(
                        `INSERT INTO preset_muscle_groups (preset_id, muscle_group_id) VALUES ${mgValues}`,
                        [presetId, ...muscleGroupIds]
                    )
                }
                // Insert exercises
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
                // Insert supplements
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

            return { id: Number(presetId), name: res.rows[0].name, type: res.rows[0].type }
        })

        return NextResponse.json(preset, { status: 201 })
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'A preset with that name already exists' }, { status: 409 })
        }
        console.error('Error creating preset:', err)
        return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 })
    }
}
