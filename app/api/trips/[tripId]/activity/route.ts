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
    covered_by: 'Covered by',
    local_currency_received: 'Local currency received',
}

// Fields to exclude from diffs (internal/noisy).
// deleted_at/left_at are folded into `intent` + the summary, so their raw
// timestamps never surface as a diff row.
const IGNORED_FIELDS = new Set([
    'id', 'created_at', 'updated_at', 'trip_id', 'expense_id', 'user_id',
    'conversion_error', 'deleted_at', 'left_at', 'joined_at',
])

type Intent = 'create' | 'update' | 'delete' | 'restore'

/** Was a timestamp column (deleted_at / left_at) just set? just cleared? */
function transition(
    field: string,
    newData: Record<string, unknown> | null,
    oldData: Record<string, unknown> | null
): 'set' | 'cleared' | null {
    const nowSet = Boolean(newData?.[field])
    const wasSet = Boolean(oldData?.[field])
    if (nowSet && !wasSet) return 'set'
    if (!nowSet && wasSet) return 'cleared'
    return null
}

/** Semantic action, folding soft-delete (deleted_at) and participant removal (left_at) into intent. */
function computeIntent(
    tableName: string,
    action: string,
    newData: Record<string, unknown> | null,
    oldData: Record<string, unknown> | null
): Intent {
    if (action === 'INSERT') return 'create'
    if (action === 'DELETE') return 'delete'
    // UPDATE — check the lifecycle columns
    const lifecycleField = tableName === 'trip_participants' ? 'left_at' : 'deleted_at'
    const t = transition(lifecycleField, newData, oldData)
    if (t === 'set') return 'delete'
    if (t === 'cleared') return 'restore'
    return 'update'
}

/** Human-readable name of the thing an audit row is about (user_id already resolved to a name upstream). */
function getEntityName(tableName: string, data: Record<string, unknown> | null): string {
    switch (tableName) {
        case 'trips':
            return `trip "${data?.name || 'Unknown'}"`
        case 'expenses':
            return `expense "${data?.name || 'Unknown'}"`
        case 'locations':
            return `location "${data?.name || 'Unknown'}"`
        case 'trip_participants':
            return String(data?.user_id || 'a participant')
        case 'expense_participants': {
            const who = String(data?.user_id || 'someone')
            const expense = data?.expense_id ? ` in "${data.expense_id}"` : ''
            return `${who}${expense}`
        }
        case 'expense_categories':
            return `category "${data?.name || 'Unknown'}"`
        default:
            return tableName.replace(/_/g, ' ')
    }
}

function describeAction(
    tableName: string,
    intent: Intent,
    newData: Record<string, unknown> | null,
    oldData: Record<string, unknown> | null
): string {
    const data = newData || oldData
    const entityName = getEntityName(tableName, data)

    // ── Participant lifecycle: name the person and the action ──
    if (tableName === 'trip_participants') {
        switch (intent) {
            case 'create':
                return `Added ${entityName} to the trip`
            case 'restore':
                return `Re-added ${entityName} to the trip`
            case 'delete':
                return `Removed ${entityName} from the trip`
            case 'update':
                if (oldData?.role !== newData?.role) {
                    return `Changed ${entityName}'s role`
                }
                return `Updated ${entityName}`
        }
    }

    if (tableName === 'expense_participants') {
        switch (intent) {
            case 'create':
                return `Added ${entityName} to split`
            case 'restore':
            case 'update':
                return `Updated ${entityName}'s split`
            case 'delete':
                return `Removed ${entityName} from split`
        }
    }

    // ── Everything else ──
    switch (intent) {
        case 'create':
            return `Added ${entityName}`
        case 'delete':
            return `Deleted ${entityName}`
        case 'restore':
            return `Restored ${entityName}`
        case 'update':
            return `Updated ${entityName}`
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
        const [usersRes, categoriesRes, locationsRes, expensesRes] = await Promise.all([
            pool.query('SELECT id, name FROM users'),
            pool.query('SELECT id, name FROM expense_categories'),
            pool.query('SELECT id, name FROM locations WHERE trip_id = $1', [id]),
            pool.query('SELECT id, name FROM expenses WHERE trip_id = $1', [id]),
        ])

        const userMap = new Map<number, string>()
        for (const row of usersRes.rows) userMap.set(Number(row.id), row.name)

        const categoryMap = new Map<number, string>()
        for (const row of categoriesRes.rows) categoryMap.set(Number(row.id), row.name)

        const locationMap = new Map<number, string>()
        for (const row of locationsRes.rows) locationMap.set(Number(row.id), row.name)

        const expenseMap = new Map<number, string>()
        for (const row of expensesRes.rows) expenseMap.set(Number(row.id), row.name)

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
            const resolvedOld = oldData ? resolveIdFields(oldData, userMap, categoryMap, locationMap, expenseMap) : null
            const resolvedNew = newData ? resolveIdFields(newData, userMap, categoryMap, locationMap, expenseMap) : null

            const intent = computeIntent(row.table_name, row.action, resolvedNew, resolvedOld)

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
                intent,
                summary: describeAction(row.table_name, intent, resolvedNew, resolvedOld),
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
    expenseMap: Map<number, string>,
): Record<string, unknown> {
    const resolved = { ...data }

    // Resolve user IDs (BIGINT may arrive as number or string from JSONB)
    const userIdFields = ['paid_by_user_id', 'reported_by_user_id', 'user_id', 'covered_by', 'changed_by']
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

    // Resolve expense_id (used for expense_participants context, not shown as a diff row)
    const expKey = toNumericKey(resolved.expense_id)
    if (expKey !== null) {
        const name = expenseMap.get(expKey)
        if (name) resolved.expense_id = name
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
    intent: Intent
    summary: string
}

function filterNoise(entries: Entry[]): Entry[] {
    // Creating or editing an expense runs in one transaction that also churns the
    // whole split (DELETE every expense_participants row, then re-INSERT them).
    // Fold that churn into the parent expense row instead of emitting ~2N
    // "Added/Removed X from split" rows per edit. Key on expense name + second so
    // a genuinely standalone split change (different second) still surfaces.
    const expenseMutationKeys = new Set<string>()
    for (const e of entries) {
        if (e.tableName === 'expenses' && (e.action === 'INSERT' || e.action === 'UPDATE')) {
            const name = (e.newData?.name ?? e.oldData?.name) as string | undefined
            expenseMutationKeys.add(`${name ?? ''}@${new Date(e.changedAt).toISOString().slice(0, 19)}`)
        }
    }

    return entries.filter((e) => {
        if (
            e.tableName === 'expense_participants' &&
            (e.action === 'INSERT' || e.action === 'DELETE')
        ) {
            // expense_id was resolved to the expense name upstream
            const name = (e.newData?.expense_id ?? e.oldData?.expense_id) as string | undefined
            const key = `${name ?? ''}@${new Date(e.changedAt).toISOString().slice(0, 19)}`
            if (expenseMutationKeys.has(key)) return false
        }
        return true
    })
}
