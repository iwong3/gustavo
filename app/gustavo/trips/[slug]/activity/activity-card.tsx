'use client'

import { cardSx, colors } from '@/lib/colors'
import type { ActivityEntry } from '@/lib/types'
import { Box, Typography } from '@mui/material'
import {
    IconArrowBackUp,
    IconHistory,
    IconPencil,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react'
import { Fragment } from 'react'
import { InitialsIcon } from 'utils/icons'

// Consecutive same-person / same-record edits within this window collapse into
// one card. Longer than an editing session, short enough that unrelated edits
// hours apart stay separate.
const MERGE_GAP_MS = 15 * 60 * 1000

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

function getIntentIcon(intent: ActivityEntry['intent'], color: string) {
    switch (intent) {
        case 'create':
            return <IconPlus size={16} color={color} />
        case 'delete':
            return <IconTrash size={16} color={color} />
        case 'restore':
            return <IconArrowBackUp size={16} color={color} />
        case 'update':
            return <IconPencil size={16} color={color} />
        default:
            return <IconHistory size={16} color={colors.primaryBlack} />
    }
}

function getIntentColor(intent: ActivityEntry['intent']): string {
    switch (intent) {
        case 'create':
        case 'restore':
            return colors.primaryGreen
        case 'delete':
            return colors.primaryRed
        case 'update':
            return colors.primaryBlue
        default:
            return colors.primaryBlack
    }
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
        const oldVal = oldData[key]
        const newVal = newData[key]
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field: key, from: oldVal, to: newVal })
        }
    }
    return changes
}

function formatFieldValue(value: unknown, field?: string): string {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (field === 'role' && typeof value === 'string') {
        return value.charAt(0).toUpperCase() + value.slice(1)
    }
    return String(value)
}

// ── Card model ──

/** One field edit within a card's body. */
type DiffRow = {
    field: string
    from: unknown
    to: unknown
    time: string // only rendered on merged cards
    reverted: boolean
}

/** A rendered card — either one entry or a merged run of consecutive edits. */
export type ActivityCardModel = {
    key: string
    intent: ActivityEntry['intent']
    summary: string
    changedBy: ActivityEntry['changedBy']
    timeLabel: string
    rows: DiffRow[]
    isMerged: boolean
}

function changedById(entry: ActivityEntry): number | null {
    return entry.changedBy?.id ?? null
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

function buildUpdateCard(
    run: ActivityEntry[],
    ignoredFields: Set<string>
): ActivityCardModel {
    const asc = [...run].sort(
        (a, b) =>
            new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
    )
    const isMerged = asc.length > 1

    // Each edit contributes its field changes as rows, in chronological order.
    // A field returning to the value it held before the run started is a revert.
    const originals = new Map<string, string>()
    const rows: DiffRow[] = []
    for (const ent of asc) {
        const time = formatTimestamp(ent.changedAt).time
        for (const c of computeChangedFields(
            ent.oldData,
            ent.newData,
            ignoredFields
        )) {
            let reverted = false
            if (!originals.has(c.field)) {
                originals.set(c.field, JSON.stringify(c.from))
            } else if (JSON.stringify(c.to) === originals.get(c.field)) {
                reverted = true
            }
            rows.push({ field: c.field, from: c.from, to: c.to, time, reverted })
        }
    }

    const first = asc[0]
    const last = asc[asc.length - 1]
    const timeLabel = isMerged
        ? `${formatTimestamp(first.changedAt).time} – ${formatTimestamp(last.changedAt).time}`
        : formatTimestamp(first.changedAt).time

    return {
        key: `${first.tableName}-${first.recordId}-${first.id}`,
        intent: 'update',
        summary: last.summary,
        changedBy: first.changedBy,
        timeLabel,
        rows,
        isMerged,
    }
}

function buildSimpleCard(entry: ActivityEntry): ActivityCardModel {
    return {
        key: `${entry.tableName}-${entry.recordId}-${entry.id}`,
        intent: entry.intent,
        summary: entry.summary,
        changedBy: entry.changedBy,
        timeLabel: formatTimestamp(entry.changedAt).time,
        rows: [],
        isMerged: false,
    }
}

/**
 * Fold a date-group's entries (in display order) into cards, merging runs of
 * consecutive same-person / same-record updates that fall within MERGE_GAP_MS.
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
                new Date(entries[j].changedAt).getTime() -
                    new Date(prev.changedAt).getTime()
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

// ── Activity Card ──

export function ActivityCard({
    model,
    fieldLabels,
}: {
    model: ActivityCardModel
    fieldLabels: Record<string, string>
}) {
    const actionColor = getIntentColor(model.intent)
    const showTime = model.isMerged

    return (
        <Box
            sx={{
                ...cardSx,
                padding: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: model.rows.length > 0 ? 0.75 : 0,
            }}>
            {/* Header — icon + summary + who/when */}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: `1.5px solid ${actionColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${actionColor}15`,
                        flexShrink: 0,
                        marginTop: 0.25,
                    }}>
                    {getIntentIcon(model.intent, actionColor)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: colors.primaryBlack,
                            lineHeight: 1.3,
                        }}>
                        {model.summary}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            marginTop: 0.25,
                        }}>
                        {model.changedBy && (
                            <InitialsIcon
                                name={model.changedBy.name}
                                initials={model.changedBy.initials}
                                iconColor={model.changedBy.iconColor}
                                sx={{
                                    width: 16,
                                    height: 16,
                                    fontSize: 7,
                                    border: `1px solid ${colors.primaryBlack}`,
                                    boxShadow: 'none',
                                }}
                            />
                        )}
                        <Typography
                            sx={{
                                fontSize: 11,
                                color: 'text.secondary',
                                lineHeight: '16px',
                            }}>
                            {model.changedBy?.name.split(' ')[0] ?? 'System'}
                            {' · '}
                            {model.timeLabel}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Body — full-width edit grid (reclaims the icon gutter) */}
            {model.rows.length > 0 && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: showTime
                            ? 'auto minmax(0, 1fr) auto'
                            : 'auto minmax(0, 1fr)',
                        columnGap: 1.5,
                        rowGap: 0.5,
                        paddingTop: 0.75,
                        borderTop: `1px solid ${colors.primaryBlack}1f`,
                    }}>
                    {model.rows.map((row, idx) => {
                        const from = formatFieldValue(row.from, row.field)
                        const to = formatFieldValue(row.to, row.field)
                        return (
                            <Fragment key={idx}>
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: 'text.secondary',
                                        lineHeight: 1.5,
                                        whiteSpace: 'nowrap',
                                    }}>
                                    {fieldLabels[row.field] ??
                                        row.field.replace(/_/g, ' ')}
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: 0.5,
                                        flexWrap: 'wrap',
                                        minWidth: 0,
                                        lineHeight: 1.5,
                                    }}>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: 11.5,
                                            color: colors.primaryRed,
                                            textDecoration:
                                                from === '—'
                                                    ? 'none'
                                                    : 'line-through',
                                            wordBreak: 'break-word',
                                        }}>
                                        {from}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: 11.5,
                                            color: 'text.secondary',
                                        }}>
                                        {'→'}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: 11.5,
                                            color: colors.primaryGreen,
                                            fontWeight: 600,
                                            wordBreak: 'break-word',
                                        }}>
                                        {to}
                                    </Typography>
                                    {row.reverted && (
                                        <Typography
                                            component="span"
                                            sx={{
                                                fontSize: 10,
                                                fontStyle: 'italic',
                                                color: 'text.secondary',
                                            }}>
                                            (reverted)
                                        </Typography>
                                    )}
                                </Box>
                                {showTime && (
                                    <Typography
                                        component="span"
                                        sx={{
                                            fontSize: 10.5,
                                            color: 'text.secondary',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'right',
                                            alignSelf: 'baseline',
                                        }}>
                                        {row.time}
                                    </Typography>
                                )}
                            </Fragment>
                        )
                    })}
                </Box>
            )}
        </Box>
    )
}
