import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!authUser.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    // Don't allow removing your own email
    const entry = await pool.query('SELECT email FROM allowed_emails WHERE id = $1', [id])
    if (entry.rows.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (entry.rows[0].email.toLowerCase() === authUser.email.toLowerCase()) {
        return NextResponse.json({ error: 'Cannot remove your own email' }, { status: 400 })
    }

    await pool.query('DELETE FROM allowed_emails WHERE id = $1', [id])

    return NextResponse.json({ success: true })
}
