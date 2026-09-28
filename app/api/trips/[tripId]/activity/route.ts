import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireAuthWithUserId } from '@/lib/api-helpers'
import { canDeleteExpense, getUserTripRole } from '@/lib/permissions'
import type { ActivityEntry, ActivitySubject } from '@/lib/types'

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
    category_id: 'Category',
    location_id: 'Location',
    paid_by: 'Paid by',
    reported_by: 'Reported by',
    date: 'Date',
    notes: 'Notes',
    note: 'Note',
    receipt_image_url: 'Receipt',
    role: 'Role',
    covered_by: 'Covered by',
    local_currency_received: 'Local currency received',
    from_user_id: 'Paid by',
    to_user_id: 'Paid to',
    amount_usd: 'Amount',
    settled_on: 'Settled on',
    // Synthetic — the split, rebuilt from expense_participants rows (see attachSplits)
    split: 'Split',
    covered: 'Covered',
}

// Fields to exclude from diffs (internal/noisy).
// deleted_at/left_at are folded into `intent` + the sentence, so their raw
// timestamps never surface as a diff row. cost_converted_usd/exchange_rate
// are derived from cost + currency (and churn on background re-conversion).
const IGNORED_FIELDS = new Set([
    'id', 'created_at', 'updated_at', 'trip_id', 'expense_id', 'user_id',
    'conversion_error', 'deleted_at', 'left_at', 'joined_at', 'created_by',
    'cost_converted_usd', 'exchange_rate', 'google_place_id', 'reported_at',
    'plan',
    // Locations: background geocoding, not a user edit
    'lat', 'lng', 'country_code', 'geocoded_at',
])

// Trip-wide feed cap (newest first). A single expense's history is uncapped.
const FEED_LIMIT = 300

type Intent = ActivityEntry['intent']
type Data = Record<string, unknown>

/** Was a timestamp column (deleted_at / left_at) just set? just cleared? */
function transition(field: string, newData: Data | null, oldData: Data | null): 'set' | 'cleared' | null {
    const nowSet = Boolean(newData?.[field])
    const wasSet = Boolean(oldData?.[field])
    if (nowSet && !wasSet) return 'set'
    if (!nowSet && wasSet) return 'cleared'
    return null
}

/** Semantic action, folding soft-delete (deleted_at) and participant removal (left_at) into intent. */
function computeIntent(tableName: string, action: string, newData: Data | null, oldData: Data | null): Intent {
    if (action === 'INSERT') return 'create'
    if (action === 'DELETE') return 'delete'
    // UPDATE — check the lifecycle columns
    const lifecycleField = tableName === 'trip_participants' ? 'left_at' : 'deleted_at'
    const t = transition(lifecycleField, newData, oldData)
    if (t === 'set') return 'delete'
    if (t === 'cleared') return 'restore'
    return 'update'
}

/** What an audit row is about, for the client's sentence ("Jenny added <Ramen>").
 *  Person ids are already resolved to names upstream. */
function getSubject(tableName: string, data: Data | null): ActivitySubject {
    const str = (v: unknown, fallback: string) => (v == null || v === '' ? fallback : String(v))
    switch (tableName) {
        case 'trips':
            return { kind: 'trip', name: str(data?.name, 'the trip') }
        case 'expenses':
            return { kind: 'expense', name: str(data?.name, 'an expense') }
        case 'locations':
            return { kind: 'location', name: str(data?.name, 'a location') }
        case 'trip_participants':
            return { kind: 'participant', name: str(data?.user_id, 'someone') }
        case 'settlements':
            return {
                kind: 'payment',
                name: str(data?.from_user_id, 'someone'),
                toName: str(data?.to_user_id, 'someone'),
            }
        default:
            return { kind: 'other', name: tableName.replace(/_/g, ' ') }
    }
}

/** True if an update changed at least one field the feed shows. */
function hasVisibleChange(oldData: Data | null, newData: Data | null): boolean {
    if (!oldData || !newData) return true
    const keys = Object.keys(oldData).concat(Object.keys(newData))
    for (const key of keys) {
        if (IGNORED_FIELDS.has(key)) continue
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) return true
    }
    return false
}

/** Parse a value that may be a number or numeric string into a number for map lookup */
function toNumericKey(value: unknown): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10)
    return null
}

type Maps = {
    users: Map<number, string>
    categories: Map<number, string>
    locations: Map<number, string>
    expenses: Map<number, string>
}

function resolveIdFields(data: Data, maps: Maps): Data {
    const resolved = { ...data }

    // Resolve user IDs (BIGINT may arrive as number or string from JSONB)
    const userIdFields = ['paid_by', 'reported_by', 'user_id', 'covered_by', 'changed_by', 'from_user_id', 'to_user_id', 'created_by']
    for (const field of userIdFields) {
        const key = toNumericKey(resolved[field])
        if (key !== null) {
            const name = maps.users.get(key)
            if (name) resolved[field] = name
        }
    }

    const catKey = toNumericKey(resolved.category_id)
    if (catKey !== null) {
        const name = maps.categories.get(catKey)
        if (name) resolved.category_id = name
    }

    const locKey = toNumericKey(resolved.location_id)
    if (locKey !== null) {
        const name = maps.locations.get(locKey)
        if (name) resolved.location_id = name
    }

    return resolved
}

// ── Splits ──
//
// Saving an expense rewrites its whole split in the same transaction (DELETE
// every expense_participants row, then re-INSERT). The audit trigger stamps
// every row of a transaction with the same changed_at (now()), so grouping
// split rows by expense + changed_at recovers each save's before/after split:
// DELETEs are the old split, INSERTs the new one. It's then folded into the
// expense's own entry as synthetic `split` / `covered` fields, so the feed
// shows "Split: +Marco" rather than 2N "Added/Removed X from split" rows.

type SplitSide = Map<string, string | null> // participant name → covered-by name
type SplitGroup = {
    expenseId: number
    changedAt: string
    auditId: number
    changedBy: ActivityEntry['changedBy']
    before: SplitSide
    after: SplitSide
}

const splitKey = (expenseId: number, changedAt: string) =>
    `${expenseId}@${new Date(changedAt).getTime()}`

const names = (side: SplitSide) => Array.from(side.keys()).sort()
const coveredNames = (side: SplitSide) =>
    Array.from(side.entries()).filter(([, by]) => by !== null).map(([n]) => n).sort()

function splitFields(side: SplitSide): Data {
    return { split: names(side), covered: coveredNames(side) }
}

type AuditRow = {
    id: number
    table_name: string
    record_id: number | string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data: Data | null
    new_data: Data | null
    changed_by: number | string | null
    changed_at: string
    changed_by_name: string | null
    changed_by_initials: string | null
    changed_by_icon_color: string | null
}

function changedByOf(row: AuditRow): ActivityEntry['changedBy'] {
    return row.changed_by
        ? {
            id: Number(row.changed_by),
            name: row.changed_by_name ?? 'Someone',
            initials: row.changed_by_initials,
            iconColor: row.changed_by_icon_color,
        }
        : null
}

function groupSplitRows(rows: AuditRow[], users: Map<number, string>): Map<string, SplitGroup> {
    const groups = new Map<string, SplitGroup>()
    const person = (v: unknown) => {
        const key = toNumericKey(v)
        return key === null ? null : users.get(key) ?? 'Unknown'
    }
    for (const row of rows) {
        const data = row.new_data ?? row.old_data
        const expenseId = toNumericKey(data?.expense_id)
        if (expenseId === null) continue
        const key = splitKey(expenseId, row.changed_at)
        let g = groups.get(key)
        if (!g) {
            g = {
                expenseId,
                changedAt: row.changed_at,
                auditId: Number(row.id),
                changedBy: changedByOf(row),
                before: new Map(),
                after: new Map(),
            }
            groups.set(key, g)
        }
        const oldName = person(row.old_data?.user_id)
        const newName = person(row.new_data?.user_id)
        if (row.old_data && oldName) g.before.set(oldName, person(row.old_data.covered_by))
        if (row.new_data && newName) g.after.set(newName, person(row.new_data.covered_by))
    }
    return groups
}

// ── GET ──

export async function GET(request: NextRequest, { params }: RouteParams) {
    const { tripId } = await params
    const id = parseInt(tripId, 10)
    if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid trip ID' }, { status: 400 })
    }
    // ?expenseId= → just that expense's history (the expense page's History section)
    const expenseParam = request.nextUrl.searchParams.get('expenseId')
    const expenseId = expenseParam === null ? null : parseInt(expenseParam, 10)
    if (expenseId !== null && isNaN(expenseId)) {
        return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 })
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
            pool.query('SELECT id, name, deleted_at FROM expenses WHERE trip_id = $1', [id]),
        ])

        const maps: Maps = {
            users: new Map(usersRes.rows.map((r) => [Number(r.id), r.name])),
            categories: new Map(categoriesRes.rows.map((r) => [Number(r.id), r.name])),
            locations: new Map(locationsRes.rows.map((r) => [Number(r.id), r.name])),
            expenses: new Map(expensesRes.rows.map((r) => [Number(r.id), r.name])),
        }
        const deletedExpenseIds = new Set<number>(
            expensesRes.rows.filter((r) => r.deleted_at).map((r) => Number(r.id))
        )

        const selectCols = `
            al.id, al.table_name, al.record_id, al.action, al.old_data, al.new_data,
            al.changed_by, al.changed_at,
            u.name AS changed_by_name,
            u.initials AS changed_by_initials,
            u.icon_color AS changed_by_icon_color`

        const mainRes = expenseId !== null
            ? await pool.query<AuditRow>(
                `SELECT ${selectCols}
                FROM audit_log al
                LEFT JOIN users u ON u.id = al.changed_by
                WHERE al.table_name = 'expenses' AND al.record_id = $2
                  AND al.record_id IN (SELECT id FROM expenses WHERE trip_id = $1)
                ORDER BY al.changed_at DESC, al.id DESC`,
                [id, expenseId]
            )
            : await pool.query<AuditRow>(
                `SELECT ${selectCols}
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
                    OR (al.table_name = 'settlements' AND al.record_id IN (
                        SELECT id FROM settlements WHERE trip_id = $1
                    ))
                )
                ORDER BY al.changed_at DESC, al.id DESC
                LIMIT ${FEED_LIMIT}`,
                [id]
            )

        // Split rows: matched on the expense_id inside the row, not on
        // record_id — a split row DELETEd by a later save no longer exists
        // in expense_participants, so a live-table subquery would miss it.
        // A capped feed only needs the ones inside its time window.
        const oldest = mainRes.rows.length >= FEED_LIMIT
            ? mainRes.rows[mainRes.rows.length - 1].changed_at
            : null
        const splitRes = await pool.query<AuditRow>(
            `SELECT ${selectCols}
            FROM audit_log al
            LEFT JOIN users u ON u.id = al.changed_by
            WHERE al.table_name = 'expense_participants'
              AND (COALESCE(al.new_data, al.old_data)->>'expense_id')::bigint IN (
                  SELECT id FROM expenses WHERE trip_id = $1
                  ${expenseId !== null ? 'AND id = $2' : ''}
              )
              ${oldest && expenseId === null ? 'AND al.changed_at >= $2' : ''}
            ORDER BY al.changed_at, al.id`,
            expenseId !== null ? [id, expenseId] : oldest ? [id, oldest] : [id]
        )
        const splitGroups = groupSplitRows(splitRes.rows, maps.users)

        // The current split of deleted expenses — a soft delete leaves the
        // participant rows as they were, so this is the split at delete time
        const liveSplits = new Map<number, SplitSide>()
        if (deletedExpenseIds.size > 0) {
            const liveRes = await pool.query(
                `SELECT expense_id, user_id, covered_by FROM expense_participants
                WHERE expense_id = ANY($1::bigint[])`,
                [Array.from(deletedExpenseIds)]
            )
            for (const r of liveRes.rows) {
                const eid = Number(r.expense_id)
                const side = liveSplits.get(eid) ?? new Map()
                const who = maps.users.get(Number(r.user_id)) ?? 'Unknown'
                side.set(who, r.covered_by ? maps.users.get(Number(r.covered_by)) ?? 'Unknown' : null)
                liveSplits.set(eid, side)
            }
        }

        const usedSplitKeys = new Set<string>()
        const restoreOffered = new Set<number>()
        const entries: ActivityEntry[] = []

        for (const row of mainRes.rows) {
            const oldData = row.old_data ? resolveIdFields(row.old_data, maps) : null
            const newData = row.new_data ? resolveIdFields(row.new_data, maps) : null
            const intent = computeIntent(row.table_name, row.action, newData, oldData)
            const recordId = Number(row.record_id)
            const entry: ActivityEntry = {
                id: Number(row.id),
                tableName: row.table_name,
                recordId,
                action: row.action,
                oldData,
                newData,
                changedBy: changedByOf(row),
                changedAt: row.changed_at,
                intent,
                subject: getSubject(row.table_name, newData ?? oldData),
            }

            if (row.table_name === 'expenses') {
                const isDeleted = deletedExpenseIds.has(recordId)
                entry.recordDeleted = isDeleted

                // Fold in the split saved in the same transaction
                const key = splitKey(recordId, row.changed_at)
                const group = splitGroups.get(key)
                if (group) {
                    usedSplitKeys.add(key)
                    if (intent === 'create' && newData) Object.assign(newData, splitFields(group.after))
                    if (intent === 'update' && oldData && newData) {
                        Object.assign(oldData, splitFields(group.before))
                        Object.assign(newData, splitFields(group.after))
                    }
                }
                // Deleted/restored: show what the expense was
                const live = liveSplits.get(recordId)
                if (live && (intent === 'delete' || intent === 'restore')) {
                    Object.assign(intent === 'delete' ? oldData ?? {} : newData ?? {}, splitFields(live))
                }
                // Restore is offered once, on the newest delete of a still-deleted expense
                if (intent === 'delete' && isDeleted && !restoreOffered.has(recordId)) {
                    restoreOffered.add(recordId)
                    const isReporter = String(row.old_data?.reported_by) === String(userId)
                    entry.canRestore = canDeleteExpense(role, isAdmin, isReporter)
                }
            }

            // Saves that changed nothing the feed shows (a no-op save, a
            // background currency re-conversion) aren't activity
            if (intent === 'update' && !hasVisibleChange(entry.oldData, entry.newData)) continue
            entries.push(entry)
        }

        // A split saved without touching the expense row gets its own entry
        for (const [key, g] of Array.from(splitGroups)) {
            if (usedSplitKeys.has(key)) continue
            const before = splitFields(g.before)
            const after = splitFields(g.after)
            if (!hasVisibleChange(before, after)) continue
            const name = maps.expenses.get(g.expenseId) ?? 'an expense'
            entries.push({
                id: g.auditId,
                tableName: 'expenses',
                recordId: g.expenseId,
                action: 'UPDATE',
                oldData: { name, ...before },
                newData: { name, ...after },
                changedBy: g.changedBy,
                changedAt: g.changedAt,
                intent: 'update',
                subject: { kind: 'expense', name },
                recordDeleted: deletedExpenseIds.has(g.expenseId),
            })
        }

        entries.sort(
            (a, b) =>
                new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime() ||
                b.id - a.id
        )

        return NextResponse.json({
            entries,
            fieldLabels: FIELD_LABELS,
            ignoredFields: Array.from(IGNORED_FIELDS),
        })
    } catch (err) {
        console.error('Error fetching activity log:', err)
        return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 })
    }
}
