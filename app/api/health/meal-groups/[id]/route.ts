import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

type Params = { id: string }

/**
 * PUT /api/health/meal-groups/[id]
 * Transactional update of an entire meal group + its food logs.
 * Body: { date?, label?, quantity?, foods?: { foodId, quantity }[] }
 * All fields optional — only provided fields are updated.
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { date, label, quantity, foods } = body as {
        date?: string
        label?: string | null
        quantity?: number
        foods?: { foodId: number; quantity: number }[]
    }

    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 1)) {
        return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 })
    }

    const check = await pool.query(
        'SELECT id, user_id, date, label FROM meal_groups WHERE id = $1 AND user_id = $2',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const currentDate = check.rows[0].date.toISOString().split('T')[0]
    const currentLabel = check.rows[0].label
    const newDate = date || currentDate
    const newLabel = label !== undefined ? label : currentLabel
    const newQuantity = quantity ?? undefined

    await withAuditUser(authUser.userId, async (client) => {
        // If label is being cleared (set to null/empty), un-group the food logs
        if (newLabel === null || newLabel === '') {
            // Move all food logs to standalone (clear meal_group_id, update date)
            await client.query(
                `UPDATE food_logs SET meal_group_id = NULL, date = $1, updated_at = now()
                 WHERE meal_group_id = $2`,
                [newDate, id]
            )
            // Delete the now-empty meal group
            await client.query('DELETE FROM meal_groups WHERE id = $1', [id])
        } else {
            // Update meal group fields
            const updates: string[] = []
            const vals: (string | number)[] = []
            let paramIdx = 1

            if (newDate !== currentDate) {
                updates.push(`date = $${paramIdx}`)
                vals.push(newDate)
                paramIdx++
            }
            if (newLabel !== currentLabel) {
                updates.push(`label = $${paramIdx}`)
                vals.push(newLabel)
                paramIdx++
            }
            if (newQuantity !== undefined) {
                updates.push(`quantity = $${paramIdx}`)
                vals.push(newQuantity)
                paramIdx++
            }

            if (updates.length > 0) {
                updates.push('updated_at = now()')
                vals.push(Number(id))
                await client.query(
                    `UPDATE meal_groups SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
                    vals
                )
            }

            // Update food logs date if date changed
            if (newDate !== currentDate) {
                await client.query(
                    `UPDATE food_logs SET date = $1, updated_at = now() WHERE meal_group_id = $2`,
                    [newDate, id]
                )
            }
        }

        // Reconcile food logs if foods array provided
        if (foods && (newLabel !== null && newLabel !== '')) {
            // Get existing food logs for this meal group
            const existing = await client.query(
                'SELECT id, food_id, quantity FROM food_logs WHERE meal_group_id = $1',
                [id]
            )
            const existingMap = new Map(
                existing.rows.map((r) => [Number(r.food_id), { id: Number(r.id), quantity: r.quantity }])
            )

            const desiredFoodIds = new Set(foods.map((f) => f.foodId))

            // Delete removed foods
            for (const [foodId, log] of Array.from(existingMap)) {
                if (!desiredFoodIds.has(foodId)) {
                    await client.query('DELETE FROM food_logs WHERE id = $1', [log.id])
                }
            }

            // Insert new or update changed foods
            for (const food of foods) {
                const existing = existingMap.get(food.foodId)
                if (existing) {
                    if (existing.quantity !== food.quantity) {
                        await client.query(
                            'UPDATE food_logs SET quantity = $1, updated_at = now() WHERE id = $2',
                            [food.quantity, existing.id]
                        )
                    }
                } else {
                    await client.query(
                        `INSERT INTO food_logs (user_id, food_id, date, quantity, meal_group_id)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [authUser.userId, food.foodId, newDate, food.quantity, id]
                    )
                }
            }
        }

        // If foods provided for un-grouped (label cleared), handle standalone reconciliation
        if (foods && (newLabel === null || newLabel === '')) {
            // Get existing standalone food logs for this date
            const existing = await client.query(
                `SELECT id, food_id, quantity FROM food_logs
                 WHERE user_id = $1 AND date = $2 AND meal_group_id IS NULL`,
                [authUser.userId, newDate]
            )
            const existingMap = new Map(
                existing.rows.map((r) => [Number(r.food_id), { id: Number(r.id), quantity: r.quantity }])
            )

            // For un-grouped foods, upsert each
            for (const food of foods) {
                const existing = existingMap.get(food.foodId)
                if (existing) {
                    if (existing.quantity !== food.quantity) {
                        await client.query(
                            'UPDATE food_logs SET quantity = $1, updated_at = now() WHERE id = $2',
                            [food.quantity, existing.id]
                        )
                    }
                } else {
                    await client.query(
                        `INSERT INTO food_logs (user_id, food_id, date, quantity)
                         VALUES ($1, $2, $3, $4)`,
                        [authUser.userId, food.foodId, newDate, food.quantity]
                    )
                }
            }
        }
    })

    return NextResponse.json({ success: true })
}

/**
 * DELETE /api/health/meal-groups/[id]
 * Deletes a meal group and all its food logs in one transaction.
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const check = await pool.query(
        'SELECT id FROM meal_groups WHERE id = $1 AND user_id = $2',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query('DELETE FROM food_logs WHERE meal_group_id = $1', [id])
        await client.query('DELETE FROM meal_groups WHERE id = $1', [id])
    })

    return NextResponse.json({ success: true })
}
