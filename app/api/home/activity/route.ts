import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import type { HomeActivityEntry } from '@/lib/types'

/** How far back the home deck looks — older news isn't news. */
const WINDOW_DAYS = 7
/** Cards in the deck. */
const MAX_ENTRIES = 3
/** Raw audit rows scanned; several can collapse into one card (dedupe below). */
const SCAN_LIMIT = 60

/** Expense fields whose change is worth a card — the rest (conversion
 *  re-runs, timestamps, place ids) are background noise. */
const VISIBLE_FIELDS = [
    'name', 'cost_original', 'currency', 'date', 'category_id',
    'location_id', 'paid_by', 'notes',
]

type Data = Record<string, unknown>

function intentOf(action: string, oldData: Data | null, newData: Data | null): HomeActivityEntry['intent'] {
    if (action === 'INSERT') return 'create'
    if (action === 'DELETE') return 'delete'
    const nowDeleted = Boolean(newData?.deleted_at)
    const wasDeleted = Boolean(oldData?.deleted_at)
    if (nowDeleted && !wasDeleted) return 'delete'
    if (!nowDeleted && wasDeleted) return 'restore'
    return 'update'
}

function hasVisibleChange(oldData: Data | null, newData: Data | null): boolean {
    if (!oldData || !newData) return true
    return VISIBLE_FIELDS.some(
        (f) => JSON.stringify(oldData[f]) !== JSON.stringify(newData[f])
    )
}

/**
 * GET /api/home/activity — the home page's "Latest" deck: expenses that other
 * people added, edited or deleted on your trips in the last week, newest
 * first, one card per person per expense. Your own changes are left out (you
 * already know about them). Empty array = the deck hides.
 */
export async function GET() {
    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { rows } = await pool.query(
            `SELECT al.id, al.record_id, al.action, al.old_data, al.new_data,
                    al.changed_by, al.changed_at,
                    COALESCE(NULLIF(split_part(u.name, ' ', 1), ''), u.name) AS actor_name,
                    u.initials AS actor_initials, u.icon_color AS actor_icon_color,
                    t.id AS trip_id, t.slug AS trip_slug, t.name AS trip_name
             FROM audit_log al
             JOIN expenses e ON e.id = al.record_id
             JOIN trips t ON t.id = e.trip_id AND t.deleted_at IS NULL
             JOIN trip_participants tp
               ON tp.trip_id = t.id AND tp.user_id = $1 AND tp.left_at IS NULL
             JOIN users u ON u.id = al.changed_by
             WHERE al.table_name = 'expenses'
               AND al.changed_by <> $1
               AND al.changed_at >= now() - make_interval(days => $2::int)
             ORDER BY al.changed_at DESC, al.id DESC
             LIMIT $3`,
            [authUser.userId, WINDOW_DAYS, SCAN_LIMIT]
        )

        const seen = new Set<string>()
        const entries: HomeActivityEntry[] = []
        for (const r of rows) {
            const oldData = r.old_data as Data | null
            const newData = r.new_data as Data | null
            const intent = intentOf(r.action, oldData, newData)
            if (intent === 'update' && !hasVisibleChange(oldData, newData)) continue
            // A burst of edits by one person to one expense is one card
            const key = `${r.record_id}:${r.changed_by}`
            if (seen.has(key)) continue
            seen.add(key)

            const data = newData ?? oldData ?? {}
            const cost = Number(data.cost_original)
            entries.push({
                id: String(r.id),
                tripId: String(r.trip_id),
                tripSlug: r.trip_slug,
                tripName: r.trip_name,
                expenseId: String(r.record_id),
                intent,
                expenseName: typeof data.name === 'string' && data.name ? data.name : 'an expense',
                costOriginal: data.cost_original == null || !Number.isFinite(cost) ? null : cost,
                currency: typeof data.currency === 'string' ? data.currency : 'USD',
                actor: {
                    name: r.actor_name,
                    initials: r.actor_initials,
                    iconColor: r.actor_icon_color,
                },
                changedAt: new Date(r.changed_at).toISOString(),
            })
            if (entries.length === MAX_ENTRIES) break
        }

        return NextResponse.json(entries)
    } catch (err) {
        console.error('Error loading home activity:', err)
        return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
    }
}
