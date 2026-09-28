'use client'

import { Box } from '@mui/material'

import type { ActivityEntry } from '@/lib/types'
import {
    ActivityList,
    buildActivityCards,
    type ActivityContext,
} from 'components/activity/activity-card'
import { useRestoreExpense } from 'components/activity/use-restore-expense'
import { RefreshProvider } from 'providers/refresh-provider'
import { GalleryPage, Specimen, SpecimenGroup } from '../gallery-ui'

// Mirrors the API's FIELD_LABELS / IGNORED_FIELDS (app/api/trips/[tripId]/activity/route.ts).
// Fixtures model the API *response*: person/category/location ids are already
// resolved to names, split/covered are the synthetic name lists, ids are strings.
const fieldLabels: Record<string, string> = {
    name: 'Name',
    start_date: 'Start date',
    end_date: 'End date',
    currency: 'Currency',
    cost_original: 'Cost',
    category_id: 'Category',
    location_id: 'Location',
    paid_by: 'Paid by',
    date: 'Date',
    notes: 'Notes',
    receipt_image_url: 'Receipt',
    role: 'Role',
    amount_usd: 'Amount',
    split: 'Split',
    covered: 'Covered',
}

const ignoredFields = new Set([
    'id', 'created_at', 'updated_at', 'trip_id', 'expense_id', 'user_id',
    'conversion_error', 'deleted_at', 'left_at', 'joined_at', 'created_by',
    'cost_converted_usd', 'exchange_rate', 'google_place_id', 'reported_at', 'plan',
])

const ivan = { id: '1' as unknown as number, name: 'Ivan Wong', initials: 'IW', iconColor: '#f7cd83' }
const jenny = { id: '2' as unknown as number, name: 'Jenny Lee', initials: 'JL', iconColor: '#f4c0d1' }
const priya = { id: '3' as unknown as number, name: 'Priya Patel', initials: 'PP', iconColor: '#b5d4f4' }
const marco = { id: '4' as unknown as number, name: 'Marco Rossi', initials: 'MR', iconColor: '#c0dd97' }

let seq = 1
function make(
    e: Omit<ActivityEntry, 'id' | 'recordId'> & { recordId?: number }
): ActivityEntry {
    const { recordId, ...rest } = e
    const id = seq++
    return { id, recordId: recordId ?? id, ...rest }
}

// ── Expenses ──

const ramen = {
    name: 'Ichiran Ramen', cost_original: 2980, currency: 'JPY', cost_converted_usd: 20.1,
    category_id: 'Food', paid_by: 'Jenny Lee',
}
const expenseAdd = make({
    tableName: 'expenses', action: 'INSERT', oldData: null,
    newData: { ...ramen, split: ['Ivan Wong', 'Jenny Lee', 'Marco Rossi', 'Priya Patel'], covered: [] },
    changedBy: jenny, changedAt: '2026-09-27T03:40:00Z', intent: 'create',
    subject: { kind: 'expense', name: 'Ichiran Ramen' },
})

// Merged run: cost + split, then payer changed and changed back (a revert)
const taxiId = 555
const taxi = {
    name: 'Taxi to Shinjuku', currency: 'JPY', cost_converted_usd: 32.4,
    category_id: 'Transport', paid_by: 'Ivan Wong',
}
const taxiSplit3 = ['Ivan Wong', 'Jenny Lee', 'Priya Patel']
const taxiSplit4 = [...taxiSplit3, 'Marco Rossi'].sort()
const taxiEdit1 = make({
    recordId: taxiId, tableName: 'expenses', action: 'UPDATE',
    oldData: { ...taxi, cost_original: 4200, split: taxiSplit3, covered: [] },
    newData: { ...taxi, cost_original: 4800, split: taxiSplit4, covered: [] },
    changedBy: ivan, changedAt: '2026-09-27T01:02:00Z', intent: 'update',
    subject: { kind: 'expense', name: 'Taxi to Shinjuku' },
})
const taxiEdit2 = make({
    recordId: taxiId, tableName: 'expenses', action: 'UPDATE',
    oldData: { ...taxi, cost_original: 4800 },
    newData: { ...taxi, cost_original: 4800, paid_by: 'Jenny Lee' },
    changedBy: ivan, changedAt: '2026-09-27T01:10:00Z', intent: 'update',
    subject: { kind: 'expense', name: 'Taxi to Shinjuku' },
})
const taxiEdit3 = make({
    recordId: taxiId, tableName: 'expenses', action: 'UPDATE',
    oldData: { ...taxi, cost_original: 4800, paid_by: 'Jenny Lee' },
    newData: { ...taxi, cost_original: 4800 },
    changedBy: ivan, changedAt: '2026-09-27T01:15:00Z', intent: 'update',
    subject: { kind: 'expense', name: 'Taxi to Shinjuku' },
})
// Feed order is newest-first; the builder sorts within the run.
const taxiRun = [taxiEdit3, taxiEdit2, taxiEdit1]

const coveredEdit = make({
    tableName: 'expenses', action: 'UPDATE',
    oldData: { name: 'Birthday cake', notes: '', split: ['Ivan Wong', 'Jenny Lee'], covered: [] },
    newData: { name: 'Birthday cake', notes: "Jenny's treat", split: ['Ivan Wong', 'Jenny Lee'], covered: ['Ivan Wong'] },
    changedBy: jenny, changedAt: '2026-09-26T22:00:00Z', intent: 'update',
    subject: { kind: 'expense', name: 'Birthday cake' },
})

const systemEdit = make({
    tableName: 'expenses', action: 'UPDATE',
    oldData: { name: 'Strawberry Daifuku', currency: 'USD' },
    newData: { name: 'Strawberry Daifuku', currency: 'JPY' },
    changedBy: null, changedAt: '2026-09-26T16:41:00Z', intent: 'update',
    subject: { kind: 'expense', name: 'Strawberry Daifuku' },
})

const snacks = {
    name: 'Konbini snacks', cost_original: 860, currency: 'JPY', cost_converted_usd: 5.8,
    category_id: 'Food', paid_by: 'Priya Patel', split: ['Marco Rossi', 'Priya Patel'], covered: [],
}
const expenseDelete = make({
    tableName: 'expenses', action: 'UPDATE',
    oldData: { ...snacks, deleted_at: null },
    newData: { ...snacks, deleted_at: '2026-09-26T18:30:00Z' },
    changedBy: priya, changedAt: '2026-09-26T18:30:00Z', intent: 'delete',
    subject: { kind: 'expense', name: 'Konbini snacks' },
    recordDeleted: true, canRestore: true,
})

// ── Payments ──

const payment = make({
    tableName: 'settlements', action: 'INSERT', oldData: null,
    newData: { from_user_id: 'Marco Rossi', to_user_id: 'Ivan Wong', amount_usd: 120, settled_on: '2026-09-26' },
    changedBy: marco, changedAt: '2026-09-26T21:02:00Z', intent: 'create',
    subject: { kind: 'payment', name: 'Marco Rossi', toName: 'Ivan Wong' },
})
const paymentByOther = make({
    tableName: 'settlements', action: 'INSERT', oldData: null,
    newData: { from_user_id: 'Priya Patel', to_user_id: 'Jenny Lee', amount_usd: 64.5, settled_on: '2026-09-26' },
    changedBy: jenny, changedAt: '2026-09-26T20:00:00Z', intent: 'create',
    subject: { kind: 'payment', name: 'Priya Patel', toName: 'Jenny Lee' },
})

// ── People / trip ──

const addParticipant = make({
    tableName: 'trip_participants', action: 'INSERT', oldData: null,
    newData: { user_id: 'Marco Rossi', role: 'viewer' },
    changedBy: ivan, changedAt: '2026-09-25T16:02:00Z', intent: 'create',
    subject: { kind: 'participant', name: 'Marco Rossi' },
})
const roleChange = make({
    tableName: 'trip_participants', action: 'UPDATE',
    oldData: { user_id: 'Priya Patel', role: 'viewer' },
    newData: { user_id: 'Priya Patel', role: 'editor' },
    changedBy: jenny, changedAt: '2026-09-25T15:55:00Z', intent: 'update',
    subject: { kind: 'participant', name: 'Priya Patel' },
})
const tripEdit = make({
    tableName: 'trips', action: 'UPDATE',
    oldData: { name: 'Japan', end_date: '2026-10-02' },
    newData: { name: 'Japan', end_date: '2026-10-04' },
    changedBy: ivan, changedAt: '2026-09-25T15:00:00Z', intent: 'update',
    subject: { kind: 'trip', name: 'Japan' },
})

const today = [expenseAdd, ...taxiRun]
const yesterday = [coveredEdit, payment, paymentByOther, expenseDelete, systemEdit]
const earlier = [addParticipant, roleChange, tripEdit]

// One expense's History (the expense page): newest first
const taxiCreate = make({
    recordId: taxiId, tableName: 'expenses', action: 'INSERT', oldData: null,
    newData: { ...taxi, cost_original: 4200, split: taxiSplit3, covered: [] },
    changedBy: ivan, changedAt: '2026-09-24T21:48:00Z', intent: 'create',
    subject: { kind: 'expense', name: 'Taxi to Shinjuku' },
})
const taxiCategory = make({
    recordId: taxiId, tableName: 'expenses', action: 'UPDATE',
    oldData: { ...taxi, category_id: 'Other' }, newData: { ...taxi },
    changedBy: jenny, changedAt: '2026-09-25T05:14:00Z', intent: 'update',
    subject: { kind: 'expense', name: 'Taxi to Shinjuku' },
})
const taxiHistory = [...taxiRun, taxiCategory, taxiCreate]

/** Renders entries the same way the real page does — through buildActivityCards.
 *  Restore opens the real confirm dialog (confirming hits a fake trip, so it
 *  shows the inline error). */
function List({ entries, context = 'trip' }: { entries: ActivityEntry[]; context?: ActivityContext }) {
    const { restore, restoringId, dialog } = useRestoreExpense(-1)
    return (
        <Box sx={{ maxWidth: 420 }}>
            <ActivityList
                models={buildActivityCards(entries, ignoredFields)}
                fieldLabels={fieldLabels}
                context={context}
                tripSlug={context === 'trip' ? 'japan' : undefined}
                onRestore={restore}
                restoringId={restoringId}
            />
            {dialog}
        </Box>
    )
}

export default function ActivityGallery() {
    return (
        <RefreshProvider onRefresh={() => {}}>
        <GalleryPage title="Activity">
            <SpecimenGroup title="Feed (one card per day)">
                <Specimen label="today: add + merged edit run">
                    <List entries={today} />
                </Specimen>
                <Specimen label="yesterday: covered, payments, delete + restore, System">
                    <List entries={yesterday} />
                </Specimen>
                <Specimen label="people + trip">
                    <List entries={earlier} />
                </Specimen>
            </SpecimenGroup>

            <SpecimenGroup title="Expense page History (context=expense)">
                <Specimen label="Taxi to Shinjuku">
                    <List entries={taxiHistory} context="expense" />
                </Specimen>
            </SpecimenGroup>
        </GalleryPage>
        </RefreshProvider>
    )
}
