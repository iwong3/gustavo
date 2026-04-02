import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { FoodGroup } from '@/lib/health-types'

export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rows } = await pool.query(
        `SELECT fg.id, fg.name, fg.color, fg.is_active,
                COALESCE(
                    json_agg(json_build_object('foodId', fgm.food_id) ORDER BY fgm.food_id)
                    FILTER (WHERE fgm.food_id IS NOT NULL),
                    '[]'
                ) AS members
         FROM food_groups fg
         LEFT JOIN food_group_members fgm ON fgm.food_group_id = fg.id
         WHERE fg.user_id = $1 AND fg.deleted_at IS NULL
         GROUP BY fg.id
         ORDER BY fg.name`,
        [authUser.userId]
    )

    const groups: FoodGroup[] = rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        color: r.color,
        isActive: r.is_active,
        foodIds: r.members.map((m: { foodId: string }) => Number(m.foodId)),
    }))

    return NextResponse.json(groups)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, color } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    if (!color || typeof color !== 'string') {
        return NextResponse.json({ error: 'color is required' }, { status: 400 })
    }

    try {
        const group = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO food_groups (user_id, name, color)
                 VALUES ($1, $2, $3)
                 RETURNING id, name, color, is_active`,
                [authUser.userId, name.trim(), color.trim()]
            )
            return res.rows[0]
        })

        return NextResponse.json(
            {
                id: Number(group.id),
                name: group.name,
                color: group.color,
                isActive: group.is_active,
                foodIds: [],
            } as FoodGroup,
            { status: 201 }
        )
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'A food group with that name already exists' }, { status: 409 })
        }
        console.error('Error creating food group:', err)
        return NextResponse.json({ error: 'Failed to create food group' }, { status: 500 })
    }
}
