'use client'

import { cardSx, colors, pressRowSx, pressShadowSx, toneColors } from '@/lib/colors'
import type { ActivityEntry } from '@/lib/types'
import { Box, ButtonBase, CircularProgress, Typography } from '@mui/material'
import { IconChevronRight, IconSettings } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { Fragment, memo, type ReactNode } from 'react'
import { PrefetchOnVisible } from 'components/prefetch-on-visible'
import { FormattedMoney, formatUsd } from 'utils/currency'
import { InitialsIcon } from 'utils/icons'

// Consecutive same-person / same-record edits within this window collapse into
// one row. Longer than an editing session, short enough that unrelated edits
// hours apart stay separate.
const MERGE_GAP_MS = 15 * 60 * 1000

/** Where the list renders: the trip's Activity page, or one expense's History. */
export type ActivityContext = 'trip' | 'expense'

// ── Helpers ──

export function formatTimestamp(iso: string): { date: string; time: string } {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
    const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    })
    return { date, time }
}

const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const firstName = (name: unknown) => String(name ?? '').split(' ')[0] || 'Someone'

/** Fields holding a person's (already resolved) name — shown by first name. */
const PERSON_FIELDS = new Set(['paid_by', 'reported_by', 'covered_by', 'from_user_id', 'to_user_id'])
const DATE_FIELDS = new Set(['date', 'start_date', 'end_date', 'settled_on'])
const LIST_FIELDS = new Set(['split', 'covered'])

const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : Number(v))

function formatFieldValue(field: string, value: unknown, data: Record<string, unknown> | null): string {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (field === 'cost_original' || field === 'local_currency_received') {
        const n = num(value)
        const currency = String(data?.currency ?? 'USD')
        return Number.isFinite(n) ? FormattedMoney(currency).format(n) : String(value)
    }
    if (field === 'amount_usd') return formatUsd(num(value), 2)
    if (PERSON_FIELDS.has(field)) return firstName(value)
    if (DATE_FIELDS.has(field) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return dayjs(value.slice(0, 10)).format('MMM D, YYYY')
    }
    if (field === 'role' && typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1)
    }
    if (field === 'visibility') {
        return value === 'all_users' ? 'Everyone' : 'Trip members'
    }
    if (Array.isArray(value)) return value.length ? value.map(firstName).join(', ') : '—'
    return String(value)
}

function computeChangedFields(
    oldData: Record<string, unknown> | null,
    newData: Record<string, unknown> | null,
    ignoredFields: Set<string>
): { field: string; from: unknown; to: unknown }[] {
    if (!oldData || !newData) return []
    const changes: { field: string; from: unknown; to: unknown }[] = []
    for (const key of Object.keys(newData)) {
        if (ignoredFields.has(key)) continue
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            changes.push({ field: key, from: oldData[key], to: newData[key] })
        }
    }
    return changes
}

// ── Card model ──

/** One field edit within a row's change box. */
type DiffRow = {
    field: string
    from: string
    to: string
    /** split/covered: who joined and who left */
    added: string[]
    removed: string[]
    time: string // only rendered on merged rows
    reverted: boolean
}

/** A rendered row — either one entry or a merged run of consecutive edits. */
export type ActivityCardModel = {
    key: string
    intent: ActivityEntry['intent']
    /** The newest entry of the run — subject, data, flags. */
    entry: ActivityEntry
    changedBy: ActivityEntry['changedBy']
    /** First entry's time (merged: "6:02 – 6:15 PM"). */
    timeLabel: string
    firstAt: string
    rows: DiffRow[]
    editCount: number
}

function changedById(entry: ActivityEntry): string | null {
    return entry.changedBy ? String(entry.changedBy.id) : null
}

/** True if two entries are the same kind of edit to the same thing by the same person. */
function sameEditTarget(a: ActivityEntry, b: ActivityEntry): boolean {
    return (
        a.intent === 'update' &&
        b.intent === 'update' &&
        a.tableName === b.tableName &&
        String(a.recordId) === String(b.recordId) &&
        changedById(a) === changedById(b)
    )
}

function toDiffRow(
    c: { field: string; from: unknown; to: unknown },
    ent: ActivityEntry,
    time: string,
    reverted: boolean
): DiffRow {
    const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])
    const before = list(c.from)
    const after = list(c.to)
    return {
        field: c.field,
        from: formatFieldValue(c.field, c.from, ent.oldData),
        to: formatFieldValue(c.field, c.to, ent.newData),
        added: after.filter((n) => !before.includes(n)).map(firstName),
        removed: before.filter((n) => !after.includes(n)).map(firstName),
        time,
        reverted,
    }
}

function buildUpdateCard(run: ActivityEntry[], ignoredFields: Set<string>): ActivityCardModel {
    const asc = [...run].sort(
        (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
    )

    // Each edit contributes its field changes as rows, in chronological order.
    // A field returning to the value it held before the run started is a revert.
    const originals = new Map<string, string>()
    const rows: DiffRow[] = []
    for (const ent of asc) {
        const time = formatTimestamp(ent.changedAt).time
        for (const c of computeChangedFields(ent.oldData, ent.newData, ignoredFields)) {
            let reverted = false
            if (!originals.has(c.field)) {
                originals.set(c.field, JSON.stringify(c.from))
            } else if (JSON.stringify(c.to) === originals.get(c.field)) {
                reverted = true
            }
            rows.push(toDiffRow(c, ent, time, reverted))
        }
    }

    const first = asc[0]
    const last = asc[asc.length - 1]
    const timeLabel =
        asc.length > 1
            ? `${formatTimestamp(first.changedAt).time} – ${formatTimestamp(last.changedAt).time}`
            : formatTimestamp(first.changedAt).time

    return {
        key: `${first.tableName}-${first.recordId}-${first.id}`,
        intent: 'update',
        entry: last,
        changedBy: first.changedBy,
        timeLabel,
        firstAt: first.changedAt,
        rows,
        editCount: asc.length,
    }
}

function buildSimpleCard(entry: ActivityEntry): ActivityCardModel {
    return {
        key: `${entry.tableName}-${entry.recordId}-${entry.id}`,
        intent: entry.intent,
        entry,
        changedBy: entry.changedBy,
        timeLabel: formatTimestamp(entry.changedAt).time,
        firstAt: entry.changedAt,
        rows: [],
        editCount: 1,
    }
}

/**
 * Fold entries (in display order) into rows, merging runs of consecutive
 * same-person / same-record updates that fall within MERGE_GAP_MS.
 */
export function buildActivityCards(
    entries: ActivityEntry[],
    ignoredFields: Set<string>
): ActivityCardModel[] {
    const cards: ActivityCardModel[] = []
    let i = 0
    while (i < entries.length) {
        const entry = entries[i]
        if (entry.intent !== 'update') {
            cards.push(buildSimpleCard(entry))
            i += 1
            continue
        }
        // Extend the run while the next entry is the same edit target and its
        // timestamp is within the gap of the previously-added entry.
        const run = [entry]
        let j = i + 1
        while (j < entries.length && sameEditTarget(run[run.length - 1], entries[j])) {
            const prev = run[run.length - 1]
            const gap = Math.abs(
                new Date(entries[j].changedAt).getTime() - new Date(prev.changedAt).getTime()
            )
            if (gap > MERGE_GAP_MS) break
            run.push(entries[j])
            j += 1
        }
        cards.push(buildUpdateCard(run, ignoredFields))
        i = j
    }
    return cards
}

// ── Sentence ──

const VERBS: Record<ActivityEntry['intent'], string> = {
    create: 'added',
    update: 'edited',
    delete: 'deleted',
    restore: 'restored',
}

const B = ({ children }: { children: ReactNode }) => (
    <Box component="span" sx={{ fontWeight: 700 }}>
        {children}
    </Box>
)

/** "Jenny added Ichiran Ramen" — actor first, then what happened to what. */
function Sentence({ model, context }: { model: ActivityCardModel; context: ActivityContext }) {
    const { entry, intent } = model
    const s = entry.subject
    const actor = <B>{model.changedBy ? firstName(model.changedBy.name) : 'System'}</B>
    const verb = VERBS[intent]

    switch (s.kind) {
        case 'expense':
            if (context === 'expense') {
                return <>{actor} {verb}{intent === 'update' ? '' : ' it'}</>
            }
            return <>{actor} {verb} <B>{s.name}</B></>
        case 'location':
            return <>{actor} {verb} location <B>{s.name}</B></>
        case 'trip':
            if (intent === 'create') return <>{actor} created the trip</>
            if (intent === 'update') return <>{actor} edited the trip details</>
            return <>{actor} {verb} the trip</>
        case 'participant': {
            const who = <B>{firstName(s.name)}</B>
            if (intent === 'create') return <>{actor} added {who} to the trip</>
            if (intent === 'restore') return <>{actor} re-added {who} to the trip</>
            if (intent === 'delete') return <>{actor} removed {who} from the trip</>
            const roleChanged = entry.oldData?.role !== entry.newData?.role
            return roleChanged ? <>{actor} changed {who}&apos;s role</> : <>{actor} updated {who}</>
        }
        case 'payment': {
            const from = <B>{firstName(s.name)}</B>
            const to = <B>{firstName(s.toName)}</B>
            if (intent === 'create') return <>{from} paid {to}</>
            if (intent === 'delete') return <>{actor} removed the payment {from} → {to}</>
            return <>{actor} {verb} the payment {from} → {to}</>
        }
        default:
            return <>{actor} {verb} {s.name}</>
    }
}

// ── Pieces ──

/** The row's headline money: an expense's cost (USD + original) or a payment. */
function amountOf(entry: ActivityEntry): { usd: string; original: string | null } | null {
    const data = entry.newData ?? entry.oldData
    if (!data) return null
    if (entry.subject.kind === 'payment') {
        const n = num(data.amount_usd)
        return Number.isFinite(n) ? { usd: formatUsd(n, 2), original: null } : null
    }
    if (entry.subject.kind !== 'expense') return null
    const currency = String(data.currency ?? 'USD')
    const cost = num(data.cost_original)
    const usd = currency === 'USD' ? cost : num(data.cost_converted_usd)
    if (!Number.isFinite(cost) && !Number.isFinite(usd)) return null
    return {
        usd: Number.isFinite(usd) ? formatUsd(usd, 2) : FormattedMoney(currency).format(cost),
        original:
            currency !== 'USD' && Number.isFinite(cost) && Number.isFinite(usd)
                ? FormattedMoney(currency).format(cost)
                : null,
    }
}

/** A deleted (or, on an expense's History, created) expense: what it was. */
function snapshotRows(entry: ActivityEntry, context: ActivityContext) {
    const data = entry.intent === 'delete' ? entry.oldData : entry.newData
    if (!data) return []
    const rows: { label: string; value: string }[] = []
    if (context === 'expense') {
        rows.push({ label: 'Cost', value: formatFieldValue('cost_original', data.cost_original, data) })
    } else if (data.category_id) {
        rows.push({ label: 'Category', value: String(data.category_id) })
    }
    if (data.paid_by) rows.push({ label: 'Paid by', value: firstName(data.paid_by) })
    if (Array.isArray(data.split) && data.split.length) {
        rows.push({ label: 'Split', value: formatFieldValue('split', data.split, data) })
    }
    if (Array.isArray(data.covered) && data.covered.length) {
        rows.push({ label: 'Covered', value: formatFieldValue('covered', data.covered, data) })
    }
    return rows
}

/** The quiet line under the sentence: details and time. */
function subLine(model: ActivityCardModel, context: ActivityContext): string {
    const { entry, intent } = model
    const when =
        context === 'expense' ? `${shortDate(model.firstAt)} · ${model.timeLabel}` : model.timeLabel
    const parts: string[] = []
    if (model.editCount > 1) parts.push(`${model.editCount} edits`)
    const data = entry.newData
    if (
        context === 'trip' &&
        entry.subject.kind === 'expense' &&
        (intent === 'create' || intent === 'restore') &&
        data
    ) {
        if (data.category_id) parts.push(String(data.category_id))
        if (data.paid_by) parts.push(`${firstName(data.paid_by)} paid`)
        if (Array.isArray(data.split) && data.split.length) {
            parts.push(data.split.length === 1 ? 'not split' : `split ${data.split.length} ways`)
        }
    }
    if (
        entry.subject.kind === 'payment' &&
        intent === 'create' &&
        model.changedBy &&
        firstName(model.changedBy.name) !== firstName(entry.subject.name)
    ) {
        parts.push(`Recorded by ${firstName(model.changedBy.name)}`)
    }
    parts.push(when)
    return parts.join(' · ')
}

// Details hang off a thread line rather than sitting in a nested box:
// yellow for what changed, red for what a deleted expense was.
const threadSx = (color: string) =>
    ({
        display: 'grid',
        columnGap: 1,
        rowGap: 0.375,
        marginTop: 0.75,
        paddingLeft: 1,
        borderLeft: `2px solid ${color}`,
    }) as const

const labelSx = {
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
} as const

const valueSx = { fontSize: 11.5, lineHeight: 1.5, minWidth: 0, wordBreak: 'break-word' } as const

function DiffValue({ row }: { row: DiffRow }) {
    if (LIST_FIELDS.has(row.field)) {
        return (
            <Box component="span" sx={{ ...valueSx, display: 'flex', flexWrap: 'wrap', columnGap: 0.75 }}>
                {row.added.map((n) => (
                    <Box component="span" key={`+${n}`} sx={{ color: toneColors.positive, fontWeight: 600 }}>
                        + {n}
                    </Box>
                ))}
                {row.removed.map((n) => (
                    <Box component="span" key={`-${n}`} sx={{ color: toneColors.negative, fontWeight: 600 }}>
                        − {n}
                    </Box>
                ))}
                {row.reverted && <Reverted />}
            </Box>
        )
    }
    if (row.field === 'receipt_image_url') {
        const label = row.from === '—' ? 'Added' : row.to === '—' ? 'Removed' : 'Replaced'
        return <Box component="span" sx={valueSx}>{label}</Box>
    }
    // Filled in from empty: just the new value
    return (
        <Box component="span" sx={valueSx}>
            {row.from !== '—' && (
                <>
                    <Box component="span" sx={{ color: 'text.secondary', textDecoration: 'line-through' }}>
                        {row.from}
                    </Box>
                    <Box component="span" sx={{ color: 'text.secondary' }}>{' → '}</Box>
                </>
            )}
            <Box component="span" sx={{ fontWeight: 700 }}>{row.to}</Box>
            {row.reverted && <Reverted />}
        </Box>
    )
}

const Reverted = () => (
    <Box component="span" sx={{ fontSize: 10.5, fontStyle: 'italic', color: 'text.secondary', marginLeft: 0.5 }}>
        reverted
    </Box>
)

function ActorAvatar({ changedBy }: { changedBy: ActivityCardModel['changedBy'] }) {
    const sx = { width: 22, height: 22, fontSize: 9, flexShrink: 0, boxShadow: 'none' }
    if (!changedBy) {
        return (
            <Box
                sx={{
                    ...sx,
                    borderRadius: '50%',
                    border: `1px solid ${colors.primaryBlack}`,
                    backgroundColor: colors.secondaryYellow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <IconSettings size={12} color={colors.primaryBlack} />
            </Box>
        )
    }
    return (
        <InitialsIcon
            name={changedBy.name}
            initials={changedBy.initials}
            iconColor={changedBy.iconColor}
            sx={sx}
        />
    )
}

// ── Restore ──

/** A deleted expense's Restore — a small shadowed button, bottom right of
 *  the row, beside what the expense was. Asks first (useRestoreExpense). */
function RestoreButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
    return (
        <ButtonBase
            onClick={onClick}
            disabled={busy}
            sx={{
                ...cardSx,
                ...pressShadowSx,
                'boxShadow': `1.5px 1.5px 0px ${colors.primaryBlack}`,
                'flexShrink': 0,
                'height': 24,
                'paddingX': 0.875,
                'fontSize': 11.5,
                'fontWeight': 700,
                'color': colors.primaryBlack,
                // Small to look at, comfortable to hit
                'position': 'relative',
                '&::after': { content: '""', position: 'absolute', inset: -6 },
            }}>
            {busy ? <CircularProgress size={11} sx={{ color: colors.primaryBlack }} /> : 'Restore'}
        </ButtonBase>
    )
}

// ── Row ──

export function ActivityRow({
    model,
    fieldLabels,
    context,
    tripSlug,
    onRestore,
    restoring = false,
}: {
    model: ActivityCardModel
    fieldLabels: Record<string, string>
    context: ActivityContext
    /** Trip context: expense rows open the expense. */
    tripSlug?: string
    onRestore?: (entry: ActivityEntry) => void
    restoring?: boolean
}) {
    const router = useRouter()
    const { entry } = model
    const isDelete = model.intent === 'delete'
    const amount = context === 'trip' ? amountOf(entry) : null
    const snapshot =
        entry.subject.kind === 'expense' &&
        (isDelete || (context === 'expense' && model.intent === 'create'))
            ? snapshotRows(entry, context)
            : []
    const showTimes = model.editCount > 1
    const canRestore = isDelete && !!entry.canRestore && !!onRestore
    const href =
        context === 'trip' && tripSlug && entry.subject.kind === 'expense' && !entry.recordDeleted
            ? `/gustavo/trips/${tripSlug}/expenses/${entry.recordId}?from=activity`
            : null

    const body = (
        <Box
            onClick={href ? () => router.push(href) : undefined}
            sx={{
                paddingX: 1.5,
                paddingY: 1.25,
                cursor: href ? 'pointer' : 'default',
                ...(href ? pressRowSx : {}),
            }}>
            {/* Header — who did what, the money, and the way in */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <ActorAvatar changedBy={model.changedBy} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.35, color: colors.primaryBlack }}>
                        <Sentence model={model} context={context} />
                    </Typography>
                    <Typography sx={{ fontSize: 11, lineHeight: 1.4, color: 'text.secondary', marginTop: 0.25 }}>
                        {subLine(model, context)}
                    </Typography>
                </Box>
                {amount && (
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography
                            sx={{
                                fontSize: 12.5,
                                fontWeight: 700,
                                lineHeight: 1.35,
                                fontVariantNumeric: 'tabular-nums',
                                color: isDelete ? 'text.secondary' : colors.primaryBlack,
                                textDecoration: isDelete ? 'line-through' : 'none',
                            }}>
                            {amount.usd}
                        </Typography>
                        {amount.original && (
                            <Typography sx={{ fontSize: 11, lineHeight: 1.4, color: 'text.secondary', marginTop: 0.25 }}>
                                {amount.original}
                            </Typography>
                        )}
                    </Box>
                )}
                {href && (
                    <IconChevronRight
                        size={16}
                        color={colors.primaryBlack}
                        style={{ flexShrink: 0, alignSelf: 'center', opacity: 0.45, marginRight: -4 }}
                    />
                )}
            </Box>

            {/* Details — under the text, out to the row's edge */}
            <Box sx={{ marginLeft: '30px' }}>
                {/* What changed — each edit in order, with its time on merged rows */}
                {model.rows.length > 0 && (
                    <Box
                        sx={{
                            ...threadSx(colors.primaryYellow),
                            gridTemplateColumns: showTimes
                                ? 'auto minmax(0, 1fr) auto'
                                : 'auto minmax(0, 1fr)',
                        }}>
                        {model.rows.map((row, idx) => (
                            <Fragment key={idx}>
                                <Box component="span" sx={labelSx}>
                                    {fieldLabels[row.field] ?? row.field.replace(/_/g, ' ')}
                                </Box>
                                <DiffValue row={row} />
                                {showTimes && (
                                    <Box
                                        component="span"
                                        sx={{ ...labelSx, fontWeight: 400, textAlign: 'right' }}>
                                        {row.time}
                                    </Box>
                                )}
                            </Fragment>
                        ))}
                    </Box>
                )}

                {/* What a deleted expense was (and, on History, what it started as) */}
                {(snapshot.length > 0 || canRestore) && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                        {snapshot.length > 0 && (
                            <Box
                                sx={{
                                    ...threadSx(isDelete ? `${toneColors.negative}66` : colors.primaryYellow),
                                    gridTemplateColumns: 'auto minmax(0, 1fr)',
                                    flex: 1,
                                    minWidth: 0,
                                }}>
                                {snapshot.map((r) => (
                                    <Fragment key={r.label}>
                                        <Box component="span" sx={labelSx}>{r.label}</Box>
                                        <Box component="span" sx={valueSx}>{r.value}</Box>
                                    </Fragment>
                                ))}
                            </Box>
                        )}
                        {/* Restore — bottom right, beside what it was */}
                        {canRestore && (
                            <Box sx={{ marginLeft: 'auto' }}>
                                <RestoreButton onClick={() => onRestore(entry)} busy={restoring} />
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

        </Box>
    )

    return href ? <PrefetchOnVisible href={href}>{body}</PrefetchOnVisible> : body
}

// ── List (one card, rows divided) ──

// Memoized: toggling one day on the Activity page shouldn't re-render every
// other day's rows (keep its props stable).
export const ActivityList = memo(function ActivityList({
    models,
    fieldLabels,
    context,
    tripSlug,
    onRestore,
    restoringId,
    bare = false,
}: {
    models: ActivityCardModel[]
    fieldLabels: Record<string, string>
    context: ActivityContext
    tripSlug?: string
    onRestore?: (entry: ActivityEntry) => void
    /** Audit id of the entry whose restore is in flight. */
    restoringId?: number | null
    /** Rows only, for a parent that draws its own card. */
    bare?: boolean
}) {
    return (
        <Box sx={bare ? undefined : { ...cardSx, overflow: 'hidden' }}>
            {models.map((model, i) => (
                <Box
                    key={model.key}
                    sx={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.primaryBlack}1f` }}>
                    <ActivityRow
                        model={model}
                        fieldLabels={fieldLabels}
                        context={context}
                        tripSlug={tripSlug}
                        onRestore={onRestore}
                        restoring={restoringId === model.entry.id}
                    />
                </Box>
            ))}
        </Box>
    )
})
