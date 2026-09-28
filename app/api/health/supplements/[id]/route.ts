import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { Supplement } from '@/lib/health-types'
import { isValidDailyDoses } from '@/lib/health/supplement-stack'

type Params = { id: string }

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, dosage, isActive } = body
    // dailyDoses: absent = unchanged, null = leave the daily stack
    const setDailyDoses = Object.prototype.hasOwnProperty.call(body, 'dailyDoses')
    if (setDailyDoses && !isValidDailyDoses(body.dailyDoses)) {
        return NextResponse.json({ error: 'dailyDoses must be null or a whole number from 1 to 12' }, { status: 400 })
    }

    // Verify ownership
    const check = await pool.query(
        'SELECT id FROM supplements WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    try {
        const updated = await withAuditUser(authUser.userId, async (client) => {
            const res = await client.query(
                `UPDATE supplements
                 SET name = COALESCE($1, name),
                     dosage = COALESCE($2, dosage),
                     is_active = COALESCE($3, is_active),
                     daily_doses = CASE WHEN $5::boolean THEN $6::int ELSE daily_doses END
                 WHERE id = $4
                 RETURNING id, name, dosage, is_active, daily_doses`,
                [name?.trim() || null, dosage, isActive, id, setDailyDoses, setDailyDoses ? body.dailyDoses : null]
            )
            return res.rows[0]
        })

        return NextResponse.json({
            id: updated.id,
            name: updated.name,
            dosage: updated.dosage,
            isActive: updated.is_active,
            dailyDoses: updated.daily_doses ?? null,
        } as Supplement)
    } catch (err) {
        console.error('Error updating supplement:', err)
        return NextResponse.json({ error: 'Failed to update supplement' }, { status: 500 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<Params> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Verify ownership
    const check = await pool.query(
        'SELECT id FROM supplements WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, authUser.userId]
    )
    if (check.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            'UPDATE supplements SET deleted_at = now() WHERE id = $1',
            [id]
        )
    })

    return NextResponse.json({ success: true })
}
