import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { FoodGroup } from '@/lib/health-types'

type Params = { id: string }

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { name, color, isActive } = await request.json()

    const check = await pool.query(
        'SELECT id FROM food_groups WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    try {
        const updated = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `UPDATE food_groups
                 SET name = COALESCE($1, name),
                     color = COALESCE($2, color),
                     is_active = COALESCE($3, is_active),
                     updated_at = now()
                 WHERE id = $4
                 RETURNING id, name, color, is_active`,
                [name?.trim() || null, color?.trim() || null, isActive, id]
            )
            return res.rows[0]
        })

        // Fetch members
        const { rows: members } = await pool.query(
            'SELECT food_id FROM food_group_members WHERE food_group_id = $1 ORDER BY food_id',
            [id]
        )

        return NextResponse.json({
            id: Number(updated.id),
            name: updated.name,
            color: updated.color,
            isActive: updated.is_active,
            foodIds: members.map((m) => Number(m.food_id)),
        } as FoodGroup)
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'A food group with that name already exists' }, { status: 409 })
        }
        console.error('Error updating food group:', err)
        return NextResponse.json({ error: 'Failed to update food group' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const check = await pool.query(
        'SELECT id FROM food_groups WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        // Remove members first
        await client.query('DELETE FROM food_group_members WHERE food_group_id = $1', [id])
        await client.query('UPDATE food_groups SET deleted_at = now() WHERE id = $1', [id])
    })

    return NextResponse.json({ success: true })
}
