import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Symptom } from '@/lib/health-types'

type Params = { id: string }

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { name, isActive } = await request.json()

    const check = await pool.query(
        'SELECT id FROM symptoms WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    try {
        const updated = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `UPDATE symptoms
                 SET name = COALESCE($1, name),
                     is_active = COALESCE($2, is_active)
                 WHERE id = $3
                 RETURNING id, name, is_active`,
                [name?.trim() || null, isActive, id]
            )
            return res.rows[0]
        })

        return NextResponse.json({
            id: Number(updated.id),
            name: updated.name,
            isActive: updated.is_active,
        } as Symptom)
    } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
            return NextResponse.json({ error: 'A symptom with that name already exists' }, { status: 409 })
        }
        console.error('Error updating symptom:', err)
        return NextResponse.json({ error: 'Failed to update symptom' }, { status: 500 })
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
        'SELECT id FROM symptoms WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            'UPDATE symptoms SET deleted_at = now() WHERE id = $1',
            [id]
        )
    })

    return NextResponse.json({ success: true })
}
