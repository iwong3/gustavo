import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

type Params = { id: string }

// Replace all members for a food group (full sync)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { foodIds } = await request.json()

    if (!Array.isArray(foodIds)) {
        return NextResponse.json({ error: 'foodIds must be an array' }, { status: 400 })
    }

    const check = await pool.query(
        'SELECT id FROM food_groups WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        // Clear existing members
        await client.query('DELETE FROM food_group_members WHERE food_group_id = $1', [id])

        // Insert new members
        if (foodIds.length > 0) {
            const values = foodIds.map((_: number, i: number) => `($1, $${i + 2})`).join(', ')
            await client.query(
                `INSERT INTO food_group_members (food_group_id, food_id) VALUES ${values}`,
                [id, ...foodIds]
            )
        }
    })

    return NextResponse.json({ success: true })
}
