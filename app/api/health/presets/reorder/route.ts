import { NextRequest, NextResponse } from 'next/server'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function PUT(request: NextRequest) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { presetIds } = await request.json()

    if (!Array.isArray(presetIds) || presetIds.length === 0) {
        return NextResponse.json({ error: 'presetIds array is required' }, { status: 400 })
    }

    await withAuditUser(authUser.userId, async (client) => {
        for (let i = 0; i < presetIds.length; i++) {
            await client.query(
                `UPDATE presets SET sort_order = $1 WHERE id = $2 AND user_id = $3`,
                [i, presetIds[i], authUser.userId]
            )
        }
    })

    return NextResponse.json({ ok: true })
}
