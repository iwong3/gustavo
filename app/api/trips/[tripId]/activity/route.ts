import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { getUserTripRole } from '@/lib/permissions'

type RouteParams = { params: Promise<{ tripId: string }> }

// Human-readable labels for DB column names
const FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    slug: 'Slug',
    start_date: 'Start date',
    end_date: 'End date',
    description: 'Description',
    visibility: 'Visibility',
    currency: 'Currency',
    cost_original: 'Cost',
    cost_converted_usd: 'Cost (USD)',
    exchange_rate: 'Exchange rate',
    category_id: 'Category',
    location_id: 'Location',
    paid_by_user_id: 'Paid by',
    reported_by_user_id: 'Reported by',
    date: 'Date',
    notes: 'Notes',
    receipt_image_url: 'Receipt',
    role: 'Role',
    deleted_at: 'Status',
    local_currency_received: 'Local currency received',
}

// Fields to exclude from diffs (internal/noisy)
const IGNORED_FIELDS = new Set([
    'id', 'created_at', 'updated_at', 'trip_id', 'expense_id', 'user_id',
    'conversion_error',
])

function describeAction(tableName: string, action: string, newData: Record<string, unknown> | null, oldData: Record<string, unknown> | null): string {
    const entityName = getEntityName(tableName, newData || oldData)

    switch (action) {
        case 'INSERT':
            return `Added ${entityName}`
        case 'DELETE':
            return `Deleted ${entityName}`
        case 'UPDATE': {
            // Check for soft delete
            if (newData?.deleted_at && !oldData?.deleted_at) {
                return `Deleted ${entityName}`
            }
            // Check for restore (undo soft delete)
            if (!newData?.deleted_at && oldData?.deleted_at) {
                return `Restored ${entityName}`
            }
            return `Updated ${entityName}`
        }
        default:
            return `Changed ${entityName}`
    }
}

function getEntityName(tableName: string, data: Record<string, unknown> | null): string {
    switch (tableName) {
        case 'trips':
            return `trip "${data?.name || 'Unknown'}"`
        case 'expenses':
            return `expense "${data?.name || 'Unknown'}"`
        case 'locations':
            return `location "${data?.name || 'Unknown'}"`
        case 'trip_participants':
            return 'a participant'
        case 'expense_participants':
            return 'expense split'
        case 'expense_categories':
            return `category "${data?.name || 'Unknown'}"`
        default:
            return tableName.replace(/_/g, ' ')
    }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }

    const authUser = await requireAuthWithUserId()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, isAdmin } = authUser

    // Check user has access to this trip
    const { role } = await getUserTripRole(userId, id)
    if (!role && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        // Build lookup maps for readable diffs
        const [usersRes, categoriesRes, locationsRes] = await Promise.all([
            pool.query('SELECT id, name FROM users'),
            pool.query('SELECT id, name FROM expense_categories'),
            pool.query('SELECT id, name FROM locations WHERE trip_id = $1', [id]),
        ])

        const userMap = new Map<number, string>()
        for (const row of usersRes.rows) userMap.set(Number(row.id), row.name)

        const categoryMap = new Map<number, string>()
        for (const row of categoriesRes.rows) categoryMap.set(Number(row.id), row.name)

        const locationMap = new Map<number, string>()
        for (const row of locationsRes.rows) locationMap.set(Number(row.id), row.name)

        const result = await pool.query(
            `SELECT
                al.id,
                al.table_name,
                al.record_id,
                al.action,
                al.old_data,
                al.new_data,
                al.changed_by,
                al.changed_at,
                u.name AS changed_by_name,
                u.initials AS changed_by_initials,
                u.icon_color AS changed_by_icon_color
            FROM audit_log al
            LEFT JOIN users u ON u.id = al.changed_by
            WHERE (
                (al.table_name = 'trips' AND al.record_id = $1)
                OR (al.table_name = 'expenses' AND al.record_id IN (
                    SELECT id FROM expenses WHERE trip_id = $1
                ))
                OR (al.table_name = 'locations' AND al.record_id IN (
                    SELECT id FROM locations WHERE trip_id = $1
                ))
                OR (al.table_name = 'trip_participants' AND al.record_id IN (
                    SELECT id FROM trip_participants WHERE trip_id = $1
                ))
                OR (al.table_name = 'expense_participants' AND al.record_id IN (
                    SELECT ep.id FROM expense_participants ep
                    JOIN expenses e ON e.id = ep.expense_id
                    WHERE e.trip_id = $1
                ))
            )
            ORDER BY al.changed_at DESC
            LIMIT 200`,
            [id]
        )

        const entries = result.rows.map((row) => {
            const oldData = row.old_data as Record<string, unknown> | null
            const newData = row.new_data as Record<string, unknown> | null

            // Resolve IDs to names in the data for readable diffs
            const resolvedOld = oldData ? resolveIdFields(oldData, userMap, categoryMap, locationMap) : null
            const resolvedNew = newData ? resolveIdFields(newData, userMap, categoryMap, locationMap) : null

            return {
                id: row.id,
                tableName: row.table_name,
                recordId: row.record_id,
                action: row.action,
                oldData: resolvedOld,
                newData: resolvedNew,
                changedBy: row.changed_by ? {
                    id: row.changed_by,
                    name: row.changed_by_name,
                    initials: row.changed_by_initials,
                    iconColor: row.changed_by_icon_color,
                } : null,
                changedAt: row.changed_at,
                summary: describeAction(row.table_name, row.action, resolvedNew, resolvedOld),
            }
        })

        // Filter out noisy entries (expense_participants INSERTs that happen alongside expense creation)
        const filtered = filterNoise(entries)

        return NextResponse.json({
            entries: filtered,
            fieldLabels: FIELD_LABELS,
            ignoredFields: Array.from(IGNORED_FIELDS),
        })
    } catch (err) {
        console.error('Error fetching activity log:', err)
        return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 })
    }
}

/** Parse a value that may be a number or numeric string into a number for map lookup */
function toNumericKey(value: unknown): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10)
    return null
}

function resolveIdFields(
    data: Record<string, unknown>,
    userMap: Map<number, string>,
    categoryMap: Map<number, string>,
    locationMap: Map<number, string>,
): Record<string, unknown> {
    const resolved = { ...data }

    // Resolve user IDs (BIGINT may arrive as number or string from JSONB)
    const userIdFields = ['paid_by_user_id', 'reported_by_user_id', 'user_id', 'changed_by']
    for (const field of userIdFields) {
        const key = toNumericKey(resolved[field])
        if (key !== null) {
            const name = userMap.get(key)
            if (name) resolved[field] = name
        }
    }

    // Resolve category_id
    const catKey = toNumericKey(resolved.category_id)
    if (catKey !== null) {
        const name = categoryMap.get(catKey)
        if (name) resolved.category_id = name
    }

    // Resolve location_id
    const locKey = toNumericKey(resolved.location_id)
    if (locKey !== null) {
        const name = locationMap.get(locKey)
        if (name) resolved.location_id = name
    }

    return resolved
}

type Entry = {
    id: number
    tableName: string
    recordId: number
    action: string
    oldData: Record<string, unknown> | null
    newData: Record<string, unknown> | null
    changedBy: { id: number; name: string; initials: string | null; iconColor: string | null } | null
    changedAt: string
    summary: string
}

function filterNoise(entries: Entry[]): Entry[] {
    // Group expense_participants INSERTs that happen at the same second as an expense INSERT
    // These are part of expense creation and don't need separate entries
    const expenseInsertTimes = new Set<string>()
    for (const e of entries) {
        if (e.tableName === 'expenses' && e.action === 'INSERT') {
            // Round to second for matching
            expenseInsertTimes.add(new Date(e.changedAt).toISOString().slice(0, 19))
        }
    }

    return entries.filter((e) => {
        // Filter out expense_participants INSERTs that coincide with expense creation
        if (e.tableName === 'expense_participants' && e.action === 'INSERT') {
            const ts = new Date(e.changedAt).toISOString().slice(0, 19)
            if (expenseInsertTimes.has(ts)) return false
        }
        return true
    })
}
