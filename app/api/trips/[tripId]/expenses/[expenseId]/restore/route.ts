import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { withAuditUser } from '@/lib/db-audit'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole, canDeleteExpense } from '@/lib/permissions'

type RouteParams = { params: Promise<{ tripId: string; expenseId: string }> }

// ── POST: Restore a soft-deleted expense (the Activity page's Restore) ──
// Whoever may delete an expense may bring it back. Its split rows were left
// untouched by the soft delete, so clearing deleted_at restores it whole.

export async function POST(_request: Request, { params }: RouteParams) {
    const { tripId, expenseId } = await params
    const tripIdNum = parseInt(tripId, 10)
    const expenseIdNum = parseInt(expenseId, 10)
    if (isNaN(tripIdNum) || isNaN(expenseIdNum)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    const { role } = await getUserTripRole(userId, tripIdNum)
    const reporterRes = await pool.query(
        'SELECT reported_by FROM expenses WHERE id = $1 AND trip_id = $2 AND deleted_at IS NOT NULL',
        [expenseIdNum, tripIdNum]
    )
    if (reporterRes.rows.length === 0) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    const isReporter = String(reporterRes.rows[0].reported_by) === String(userId)
    if (!canDeleteExpense(role, isAdmin, isReporter)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        await withAuditUser(userId, (client) =>
            client.query(
                `UPDATE expenses SET deleted_at = NULL
                 WHERE id = $1 AND trip_id = $2 AND deleted_at IS NOT NULL`,
                [expenseIdNum, tripIdNum]
            )
        )
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Error restoring expense:', err)
        return NextResponse.json({ error: 'Failed to restore expense' }, { status: 500 })
    }
}
