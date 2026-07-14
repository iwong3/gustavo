'use client'

import { Box } from '@mui/material'

import type { ActivityEntry } from '@/lib/types'
import {
    ActivityCard,
    buildActivityCards,
} from '../../../gustavo/trips/[slug]/activity/activity-card'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

// Mirrors the API's FIELD_LABELS / IGNORED_FIELDS (app/api/trips/[tripId]/activity/route.ts).
// Fixtures model the API *response*, so user/expense ids are already resolved to names.
const fieldLabels: Record<string, string> = {
    name: 'Name',
    start_date: 'Start date',
    end_date: 'End date',
    description: 'Description',
    currency: 'Currency',
    cost_original: 'Cost',
    cost_converted_usd: 'Cost (USD)',
    exchange_rate: 'Exchange rate',
    category_id: 'Category',
    location_id: 'Location',
    paid_by_user_id: 'Paid by',
    reported_by_user_id: 'Reported by',
    notes: 'Notes',
    role: 'Role',
    covered_by: 'Covered by',
    local_currency_received: 'Local currency received',
}

const ignoredFields = new Set([
    'id', 'created_at', 'updated_at', 'trip_id', 'expense_id', 'user_id',
    'conversion_error', 'deleted_at', 'left_at', 'joined_at',
])

const ivanBy = { id: 1, name: 'Ivan Wong', initials: 'IW', iconColor: '#4b6981' }
const jennyBy = { id: 2, name: 'Jenny Lee', initials: 'JL', iconColor: '#f7cd83' }

let seq = 1
function make(
    e: Omit<ActivityEntry, 'id' | 'recordId'> & { recordId?: number }
): ActivityEntry {
    const { recordId, ...rest } = e
    const id = seq++
    return { id, recordId: recordId ?? id, ...rest }
}

// ── Participant lifecycle ──

const addParticipant = make({
    tableName: 'trip_participants',
    action: 'INSERT',
    oldData: null,
    newData: { user_id: 'Priya Patel', role: 'viewer' },
    changedBy: ivanBy,
    changedAt: '2026-03-09T20:15:00Z',
    intent: 'create',
    summary: 'Added Priya Patel to the trip',
})

const roleChange = make({
    tableName: 'trip_participants',
    action: 'UPDATE',
    oldData: { user_id: 'Suming Chen', role: 'editor' },
    newData: { user_id: 'Suming Chen', role: 'viewer' },
    changedBy: ivanBy,
    changedAt: '2026-03-09T12:43:00Z',
    intent: 'update',
    summary: "Changed Suming Chen's role",
})

const removeParticipant = make({
    tableName: 'trip_participants',
    action: 'UPDATE',
    oldData: { user_id: 'Marco Rossi', role: 'editor', left_at: null },
    newData: { user_id: 'Marco Rossi', role: 'editor', left_at: '2026-03-08T18:00:00Z' },
    changedBy: ivanBy,
    changedAt: '2026-03-08T18:00:00Z',
    intent: 'delete',
    summary: 'Removed Marco Rossi from the trip',
})

const readdParticipant = make({
    tableName: 'trip_participants',
    action: 'UPDATE',
    oldData: { user_id: 'Marco Rossi', role: 'viewer', left_at: '2026-03-08T18:00:00Z' },
    newData: { user_id: 'Marco Rossi', role: 'viewer', left_at: null },
    changedBy: jennyBy,
    changedAt: '2026-03-08T19:30:00Z',
    intent: 'restore',
    summary: 'Re-added Marco Rossi to the trip',
})

// ── Expenses ──

const singleFieldUpdate = make({
    tableName: 'expenses',
    action: 'UPDATE',
    oldData: { currency: 'USD' },
    newData: { currency: 'JPY' },
    changedBy: null, // System
    changedAt: '2026-03-08T16:41:00Z',
    intent: 'update',
    summary: 'Updated expense "Strawberry Daifuku"',
})

const multiFieldUpdate = make({
    tableName: 'expenses',
    action: 'UPDATE',
    oldData: {
        name: 'Dinner',
        cost_original: '40.00',
        currency: 'USD',
        paid_by_user_id: 'Ivan Wong',
    },
    newData: {
        name: 'Dinner at Nobu',
        cost_original: '52.00',
        currency: 'JPY',
        paid_by_user_id: 'Jenny Lee',
    },
    changedBy: jennyBy,
    changedAt: '2026-03-08T14:05:00Z',
    intent: 'update',
    summary: 'Updated expense "Dinner at Nobu"',
})

const expenseCreate = make({
    tableName: 'expenses',
    action: 'INSERT',
    oldData: null,
    newData: { name: 'Ramen dinner', cost_original: '42.50', currency: 'USD' },
    changedBy: ivanBy,
    changedAt: '2026-03-08T13:00:00Z',
    intent: 'create',
    summary: 'Added expense "Ramen dinner"',
})

const splitAdd = make({
    tableName: 'expense_participants',
    action: 'INSERT',
    oldData: null,
    newData: { user_id: 'Priya Patel', expense_id: 'Hotel Gracery' },
    changedBy: ivanBy,
    changedAt: '2026-03-08T12:10:00Z',
    intent: 'create',
    summary: 'Added Priya Patel to split',
})

// ── Merged run: same person edits the same expense several times in a row ──
// (recordId shared so buildActivityCards folds them into one card)

const mergeExpenseId = 555

const mergeEdit1 = make({
    recordId: mergeExpenseId,
    tableName: 'expenses',
    action: 'UPDATE',
    oldData: { cost_original: '40.00' },
    newData: { cost_original: '50.00' },
    changedBy: jennyBy,
    changedAt: '2026-03-08T12:40:00Z',
    intent: 'update',
    summary: 'Updated expense "Sushi Zanmai"',
})

const mergeEdit2 = make({
    recordId: mergeExpenseId,
    tableName: 'expenses',
    action: 'UPDATE',
    oldData: { currency: 'USD' },
    newData: { currency: 'JPY' },
    changedBy: jennyBy,
    changedAt: '2026-03-08T12:41:00Z',
    intent: 'update',
    summary: 'Updated expense "Sushi Zanmai"',
})

const mergeEdit3 = make({
    recordId: mergeExpenseId,
    tableName: 'expenses',
    action: 'UPDATE',
    oldData: { cost_original: '50.00' },
    newData: { cost_original: '40.00' },
    changedBy: jennyBy,
    changedAt: '2026-03-08T12:43:00Z',
    intent: 'update',
    summary: 'Updated expense "Sushi Zanmai"',
})

// Feed order is newest-first; the builder sorts within the run.
const mergedRun = [mergeEdit3, mergeEdit2, mergeEdit1]

const timeline = [
    roleChange,
    addParticipant,
    ...mergedRun,
    singleFieldUpdate,
    removeParticipant,
    readdParticipant,
    splitAdd,
    expenseCreate,
]

/** Renders entries the same way the real page does — through buildActivityCards. */
function Cards({ entries }: { entries: ActivityEntry[] }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {buildActivityCards(entries, ignoredFields).map((model) => (
                <ActivityCard
                    key={model.key}
                    model={model}
                    fieldLabels={fieldLabels}
                />
            ))}
        </Box>
    )
}

export default function ActivityGallery() {
    return (
        <GalleryPage title="Activity">
            <SpecimenGroup title="Timeline (stacked)">
                <Specimen label="feed">
                    <Cards entries={timeline} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Merged run (consecutive edits, same expense)">
                <Specimen label="3 edits + a revert">
                    <Cards entries={mergedRun} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Single-field edit">
                <Specimen label="role change">
                    <Cards entries={[roleChange]} />
                </Specimen>
                <Specimen label="currency (System)">
                    <Cards entries={[singleFieldUpdate]} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Multi-field edit">
                <Specimen label="expense: 4 fields">
                    <Cards entries={[multiFieldUpdate]} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Lifecycle (no diff, icon carries meaning)">
                <Specimen label="added">
                    <Cards entries={[addParticipant]} />
                </Specimen>
                <Specimen label="removed">
                    <Cards entries={[removeParticipant]} />
                </Specimen>
                <Specimen label="re-added (restore)">
                    <Cards entries={[readdParticipant]} />
                </Specimen>
                <Specimen label="created">
                    <Cards entries={[expenseCreate]} />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
    )
}
