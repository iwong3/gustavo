import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
    const includeCount = request.nextUrl.searchParams.get('includeCount') === 'true'

    if (includeCount) {
        const authUser = await requireAuthWithUserId()
        const { rows } = await pool.query(
            `SELECT ec.id, ec.name, ec.slug, ec.created_by,
                    COUNT(e.id)::int AS usage_count
             FROM expense_categories ec
             LEFT JOIN expenses e ON e.category_id = ec.id AND e.deleted_at IS NULL
             WHERE ec.deleted_at IS NULL
             GROUP BY ec.id, ec.name, ec.slug, ec.created_by
             ORDER BY ec.name`
        )
        const userId = authUser?.userId
        const isAdmin = authUser?.isAdmin ?? false
        return NextResponse.json(rows.map((r) => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            usageCount: r.usage_count,
            canEdit: r.slug ? false : (isAdmin || r.created_by === userId),
        })))
    }

    const { rows } = await pool.query(
        `SELECT id, name, slug FROM expense_categories
         WHERE deleted_at IS NULL
         ORDER BY name`
    )
    return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId } = authUser

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const trimmed = name.trim()

    try {
        const result = await withAuditUser(userId, async (client) => {
            // Check if category exists (including soft-deleted — revive it)
            const existing = await client.query(
                `SELECT id, deleted_at FROM expense_categories WHERE name = $1`,
                [trimmed]
            )
            if (existing.rows.length > 0) {
                if (existing.rows[0].deleted_at) {
                    // Revive soft-deleted category and claim ownership
                    await client.query(
                        `UPDATE expense_categories SET deleted_at = NULL, created_by = $2 WHERE id = $1`,
                        [existing.rows[0].id, userId]
                    )
                    return { id: existing.rows[0].id, name: trimmed }
                }
                throw new Error('DUPLICATE')
            }

            const res = await client.query(
                `INSERT INTO expense_categories (name, created_by) VALUES ($1, $2) RETURNING id`,
                [trimmed, userId]
            )
            return { id: res.rows[0].id, name: trimmed }
        })

        return NextResponse.json(result, { status: 201 })
    } catch (err) {
        if (err instanceof Error && err.message === 'DUPLICATE') {
            return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
        }
        console.error('Error creating expense category:', err)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }
}
