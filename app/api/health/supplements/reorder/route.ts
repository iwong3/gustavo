import { NextRequest, NextResponse } from 'next/server'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

/** Daily-stack order (Home card drag): sort_order = index in `supplementIds`. */
export async function PUT(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { supplementIds } = await request.json()

    if (
        !Array.isArray(supplementIds) ||
        supplementIds.length === 0 ||
        !supplementIds.every((id) => /^\d+$/.test(String(id)))
    ) {
        return NextResponse.json({ error: 'supplementIds array is required' }, { status: 400 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        await client.query(
            `UPDATE supplements s SET sort_order = v.ord::int - 1
             FROM unnest($1::bigint[]) WITH ORDINALITY AS v(id, ord)
             WHERE s.id = v.id AND s.user_id = $2 AND s.deleted_at IS NULL`,
            [supplementIds.map(String), authUser.userId]
        )
    })

    return NextResponse.json({ ok: true })
}
