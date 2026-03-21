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
    const { quantity, mealLabel, date } = await request.json()

    if (typeof quantity !== 'number' || quantity < 1) {
        return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 })
    }

    const check = await pool.query(
        'SELECT id, date FROM food_logs WHERE id = $1 AND user_id = $2',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        let mealGroupId: number | null = null

        if (mealLabel && typeof mealLabel === 'string' && mealLabel.trim().length > 0) {
            const logDate = date || check.rows[0].date.toISOString().split('T')[0]
            const mgRes = await client.query(
                `INSERT INTO meal_groups (user_id, date, label)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, date, lower(label)) DO UPDATE SET updated_at = now()
                 RETURNING id`,
                [authUser.userId, logDate, mealLabel.trim()]
            )
            mealGroupId = Number(mgRes.rows[0].id)
        }

        if (mealGroupId !== null) {
            await client.query(
                'UPDATE food_logs SET quantity = $1, meal_group_id = $2, updated_at = now() WHERE id = $3',
                [quantity, mealGroupId, id]
            )
        } else {
            await client.query(
                'UPDATE food_logs SET quantity = $1, updated_at = now() WHERE id = $2',
                [quantity, id]
            )
        }
    })

    return NextResponse.json({ success: true })
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const check = await pool.query(
        'SELECT id FROM food_logs WHERE id = $1 AND user_id = $2',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query('DELETE FROM food_logs WHERE id = $1', [id])
    })

    return NextResponse.json({ success: true })
}
