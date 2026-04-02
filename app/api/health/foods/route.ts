import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Food } from '@/lib/health-types'

export async function GET(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const showAll = request.nextUrl.searchParams.get('all') === 'true'

    let query = `
        SELECT f.id, f.name, f.is_active,
               COALESCE(
                   json_agg(json_build_object('id', fg.id, 'name', fg.name, 'color', fg.color) ORDER BY fg.name)
                   FILTER (WHERE fg.id IS NOT NULL),
                   '[]'
               ) AS groups
        FROM foods f
        LEFT JOIN food_group_members fgm ON fgm.food_id = f.id
        LEFT JOIN food_groups fg ON fg.id = fgm.food_group_id AND fg.deleted_at IS NULL
        WHERE f.user_id = $1 AND f.deleted_at IS NULL`

    if (!showAll) {
        query += ` AND f.is_active = true`
    }

    query += ` GROUP BY f.id ORDER BY f.name`

    const { rows } = await pool.query(query, [authUser.userId])

    const foods: Food[] = rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        isActive: r.is_active,
        groups: r.groups,
    }))

    return NextResponse.json(foods)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    try {
        const food = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `INSERT INTO foods (user_id, name)
                 VALUES ($1, $2)
                 RETURNING id, name, is_active`,
                [authUser.userId, name.trim()]
            )
            return res.rows[0]
        })

        return NextResponse.json(
            {
                id: Number(food.id),
                name: food.name,
                isActive: food.is_active,
                groups: [],
            } as Food,
            { status: 201 }
        )
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'A food with that name already exists' }, { status: 409 })
        }
        console.error('Error creating food:', err)
        return NextResponse.json({ error: 'Failed to create food' }, { status: 500 })
    }
}
