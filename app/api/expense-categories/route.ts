import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'

export async function GET(request: NextRequest) {
    const includeCount = request.nextUrl.searchParams.get('includeCount') === 'true'

    if (includeCount) {
        const { rows } = await pool.query(
            `SELECT ec.id, ec.name,
                    COUNT(e.id)::int AS usage_count
             FROM expense_categories ec
             LEFT JOIN expenses e ON e.category_id = ec.id AND e.deleted_at IS NULL
             WHERE ec.deleted_at IS NULL
             GROUP BY ec.id, ec.name
             ORDER BY ec.name`
        )
        return NextResponse.json(rows.map((r) => ({
            id: r.id, name: r.name, usageCount: r.usage_count,
        })))
    }

    const { rows } = await pool.query(
        `SELECT id, name FROM expense_categories
         WHERE deleted_at IS NULL
         ORDER BY name`
    )
    return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
    const session = await auth()
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const trimmed = name.trim()

    // Resolve current user for audit
    const userRes = await pool.query(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [session.user.email]
    )
    const userId = userRes.rows[0]?.id ?? null

    try {
        const result = await withAuditUser(userId, async (client) => {
            // Check if category exists (including soft-deleted — revive it)
            const existing = await client.query(
                `SELECT id, deleted_at FROM expense_categories WHERE name = $1`,
                [trimmed]
            )
            if (existing.rows.length > 0) {
                if (existing.rows[0].deleted_at) {
                    // Revive soft-deleted category
                    await client.query(
                        `UPDATE expense_categories SET deleted_at = NULL WHERE id = $1`,
                        [existing.rows[0].id]
                    )
                    return { id: existing.rows[0].id, name: trimmed }
                }
                throw new Error('DUPLICATE')
            }

            const res = await client.query(
                `INSERT INTO expense_categories (name) VALUES ($1) RETURNING id`,
                [trimmed]
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
