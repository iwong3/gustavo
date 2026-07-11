import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { canEditCategory, canDeleteCategory } from '@/lib/permissions'
import { occMatchSql } from '@/lib/occ'

type RouteParams = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Check ownership
    const catRes = await pool.query(
        'SELECT created_by, slug FROM expense_categories WHERE id = $1 AND deleted_at IS NULL',
        [id]
    )
    if (catRes.rows.length === 0) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    if (catRes.rows[0].slug) {
        return NextResponse.json({ error: 'System categories cannot be renamed' }, { status: 403 })
    }
    if (!canEditCategory(isAdmin, catRes.rows[0].created_by === userId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, expectedUpdatedAt } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    try {
        await withAuditUser(userId, async (client) => {
            const sql = expectedUpdatedAt
                ? `UPDATE expense_categories SET name = $1
                   WHERE id = $2 AND deleted_at IS NULL AND ${occMatchSql('updated_at', '$3')}
                   RETURNING id`
                : `UPDATE expense_categories SET name = $1
                   WHERE id = $2 AND deleted_at IS NULL
                   RETURNING id`
            const args: unknown[] = expectedUpdatedAt
                ? [name.trim(), id, expectedUpdatedAt]
                : [name.trim(), id]
            const res = await client.query(sql, args)
            if (res.rows.length === 0) {
                if (expectedUpdatedAt) {
                    const check = await client.query(
                        'SELECT id FROM expense_categories WHERE id = $1 AND deleted_at IS NULL',
                        [id]
                    )
                    throw new Error(check.rows.length > 0 ? 'CONFLICT' : 'NOT_FOUND')
                }
                throw new Error('NOT_FOUND')
            }
        })
        return NextResponse.json({ id, name: name.trim() })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }
        if (err instanceof Error && err.message === 'CONFLICT') {
            return NextResponse.json(
                { error: 'conflict', message: 'This category was changed by someone else.' },
                { status: 409 }
            )
        }
        console.error('Error updating expense category:', err)
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Check ownership
    const catRes = await pool.query(
        'SELECT created_by, slug FROM expense_categories WHERE id = $1 AND deleted_at IS NULL',
        [id]
    )
    if (catRes.rows.length === 0) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    if (catRes.rows[0].slug) {
        return NextResponse.json({ error: 'System categories cannot be deleted' }, { status: 403 })
    }
    if (!canDeleteCategory(isAdmin, catRes.rows[0].created_by === userId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const expectedUpdatedAt = request.nextUrl.searchParams.get('expectedUpdatedAt')

    try {
        await withAuditUser(userId, async (client) => {
            const sql = expectedUpdatedAt
                ? `UPDATE expense_categories SET deleted_at = now()
                   WHERE id = $1 AND deleted_at IS NULL AND ${occMatchSql('updated_at', '$2')}
                   RETURNING id`
                : `UPDATE expense_categories SET deleted_at = now()
                   WHERE id = $1 AND deleted_at IS NULL
                   RETURNING id`
            const args: unknown[] = expectedUpdatedAt
                ? [id, expectedUpdatedAt]
                : [id]
            const res = await client.query(sql, args)
            if (res.rows.length === 0) {
                if (expectedUpdatedAt) {
                    const check = await client.query(
                        'SELECT id FROM expense_categories WHERE id = $1 AND deleted_at IS NULL',
                        [id]
                    )
                    throw new Error(check.rows.length > 0 ? 'CONFLICT' : 'NOT_FOUND')
                }
                throw new Error('NOT_FOUND')
            }
        })
        return NextResponse.json({ ok: true })
    } catch (err) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 })
        }
        if (err instanceof Error && err.message === 'CONFLICT') {
            return NextResponse.json(
                { error: 'conflict', message: 'This category was changed by someone else.' },
                { status: 409 }
            )
        }
        console.error('Error deleting expense category:', err)
        return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }
}
