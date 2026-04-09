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
    const { date, weightLbs } = await request.json()

    const check = await pool.query(
        'SELECT id FROM weight_logs WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const setClauses: string[] = []
    const values: (string | number)[] = []
    let paramIdx = 1

    if (date != null) {
        setClauses.push(`date = $${paramIdx++}`)
        values.push(date)
    }
    if (weightLbs != null) {
        setClauses.push(`weight_lbs = $${paramIdx++}`)
        values.push(weightLbs)
    }

    if (setClauses.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    setClauses.push(`updated_at = now()`)
    values.push(id)

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            `UPDATE weight_logs SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
            values
        )
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
        'SELECT id FROM weight_logs WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            'UPDATE weight_logs SET deleted_at = now(), updated_at = now() WHERE id = $1',
            [id]
        )
    })

    return NextResponse.json({ success: true })
}
