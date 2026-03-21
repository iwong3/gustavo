import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { DietDay, FoodLogEntry, MealGroup } from '@/lib/health-types'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = `
        SELECT fl.id, fl.food_id, f.name AS food_name, f.is_active,
               fl.date, fl.quantity, fl.meal_group_id,
               mg.label AS meal_label, mg.quantity AS meal_quantity
        FROM food_logs fl
        JOIN foods f ON f.id = fl.food_id
        LEFT JOIN meal_groups mg ON mg.id = fl.meal_group_id
        WHERE fl.user_id = $1`

    const params: (string | number)[] = [authUser.userId]

    if (date) {
        params.push(date)
        query += ` AND fl.date = $${params.length}`
    } else {
        if (from) {
            params.push(from)
            query += ` AND fl.date >= $${params.length}`
        }
        if (to) {
            params.push(to)
            query += ` AND fl.date <= $${params.length}`
        }
    }

    query += ` ORDER BY fl.date DESC, mg.label NULLS LAST, f.name`

    const { rows } = await pool.query(query, params)

    // Group by date → DietDay[]
    const dayMap = new Map<string, { standalone: FoodLogEntry[]; mealMap: Map<number, MealGroup> }>()

    for (const r of rows) {
        const dateStr = r.date.toISOString().split('T')[0]
        if (!dayMap.has(dateStr)) {
            dayMap.set(dateStr, { standalone: [], mealMap: new Map() })
        }
        const day = dayMap.get(dateStr)!

        const entry: FoodLogEntry = {
            id: Number(r.id),
            food: { id: Number(r.food_id), name: r.food_name, isActive: r.is_active },
            quantity: r.quantity,
            mealGroupId: r.meal_group_id ? Number(r.meal_group_id) : null,
        }

        if (r.meal_group_id) {
            const mgId = Number(r.meal_group_id)
            if (!day.mealMap.has(mgId)) {
                day.mealMap.set(mgId, {
                    id: mgId,
                    label: r.meal_label,
                    quantity: r.meal_quantity ?? 1,
                    foods: [],
                })
            }
            day.mealMap.get(mgId)!.foods.push(entry)
        } else {
            day.standalone.push(entry)
        }
    }

    const dietDays: DietDay[] = Array.from(dayMap.entries()).map(([dateStr, day]) => ({
        date: dateStr,
        standaloneFoods: day.standalone,
        mealGroups: Array.from(day.mealMap.values()),
    }))

    return NextResponse.json(dietDays)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, foodId, quantity, mealLabel } = await request.json()

    if (!date || !foodId) {
        return NextResponse.json(
            { error: 'date and foodId are required' },
            { status: 400 }
        )
    }

    // Verify food belongs to user
    const check = await pool.query(
        'SELECT id FROM foods WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [foodId, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Food not found' }, { status: 404 })
    }

    try {
        const result = await withAuditUser(authUser.userId, async (client) => {
            let mealGroupId: number | null = null

            // Find or create meal group if label provided
            if (mealLabel && typeof mealLabel === 'string' && mealLabel.trim().length > 0) {
                const mgRes = await client.query(
                    `INSERT INTO meal_groups (user_id, date, label)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (user_id, date, lower(label)) DO UPDATE SET updated_at = now()
                     RETURNING id`,
                    [authUser.userId, date, mealLabel.trim()]
                )
                mealGroupId = Number(mgRes.rows[0].id)
            }

            // Insert or update food log
            if (mealGroupId) {
                const res = await client.query(
                    `INSERT INTO food_logs (user_id, food_id, date, quantity, meal_group_id)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (user_id, food_id, date, meal_group_id)
                         WHERE meal_group_id IS NOT NULL
                     DO UPDATE SET quantity = food_logs.quantity + COALESCE($4, 1), updated_at = now()
                     RETURNING id, food_id, date, quantity, meal_group_id`,
                    [authUser.userId, foodId, date, quantity || 1, mealGroupId]
                )
                return res.rows[0]
            } else {
                const res = await client.query(
                    `INSERT INTO food_logs (user_id, food_id, date, quantity)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (user_id, food_id, date)
                         WHERE meal_group_id IS NULL
                     DO UPDATE SET quantity = food_logs.quantity + COALESCE($4, 1), updated_at = now()
                     RETURNING id, food_id, date, quantity, meal_group_id`,
                    [authUser.userId, foodId, date, quantity || 1]
                )
                return res.rows[0]
            }
        })

        return NextResponse.json({
            id: Number(result.id),
            foodId: Number(result.food_id),
            date: result.date.toISOString().split('T')[0],
            quantity: result.quantity,
            mealGroupId: result.meal_group_id ? Number(result.meal_group_id) : null,
        }, { status: 201 })
    } catch (err) {
        console.error('Error logging food:', err)
        return NextResponse.json({ error: 'Failed to log food' }, { status: 500 })
    }
}
