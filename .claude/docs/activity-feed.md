# Activity feed

The per-trip audit timeline at `/gustavo/trips/[slug]/activity`, plus each
expense's History section (expense page). Turns raw `audit_log` rows into
plain-sentence rows. Its job is **debugging** ("who changed this, and when?"),
so it favours complete before/after detail over brevity.

## Data source
Every mutating transaction wrapped in `withAuditUser` writes an `audit_log` row
(`table_name`, `record_id`, `action` INSERT/UPDATE/DELETE, `old_data`,
`new_data` JSONB snapshots, `changed_by`, `changed_at`). `changed_at` defaults
to `now()` — the **transaction** start — so every row of one save shares the
exact same timestamp. The feed reads these; live tables are only used for
id→name lookups, "is this expense deleted now", and a deleted expense's split.

## API — `app/api/trips/[tripId]/activity/route.ts`
`GET` returns the trip feed (newest first, capped at `FEED_LIMIT` = 300), or
with `?expenseId=` that one expense's full, uncapped history.

- **id→name resolution** (`resolveIdFields`): user/category/location ids inside
  `old_data`/`new_data` become names. BIGINT ids arrive as number *or* string
  from JSONB — `toNumericKey` before map lookups.
- **`intent`** (`computeIntent`): `create` | `update` | `delete` | `restore`.
  Folds soft-delete (`deleted_at`) and participant removal (`left_at`) into one
  field, so soft-delete logic lives in exactly one place.
- **`subject`** (`getSubject`): `{ kind, name, toName? }` — what the row is
  about (expense/location/trip name, the participant, a payment's payer →
  receiver). The client builds the sentence from it; there's no server string.
- **Splits** (`groupSplitRows`): saving an expense DELETEs its whole split and
  re-INSERTs it. Split rows are grouped by expense + exact `changed_at`
  (DELETEs = old split, INSERTs = new) and folded into the expense's own entry
  as synthetic **`split` / `covered`** name lists — the diff then shows
  "Split: + Marco". A split saved with no expense row gets a synthesized update
  entry. Split rows are matched on `expense_id` *inside the JSON*, not
  `record_id` (deleted split rows no longer exist in the live table).
  Created expenses get `newData.split`; deleted/restored ones get the live split
  (a soft delete leaves participant rows untouched).
- **Empty updates are dropped**: an update with no visible field change (no-op
  save, background currency re-conversion) isn't activity.
- **`recordDeleted` / `canRestore`**: expense entries flag whether the expense
  is deleted right now (no tap-through). The newest delete of a still-deleted
  expense carries `canRestore` when the viewer passes `canDeleteExpense`.
- **`FIELD_LABELS` / `IGNORED_FIELDS`**: labels for diff rows; the ignored set
  hides internal and derived columns (`cost_converted_usd`, `exchange_rate`,
  `google_place_id`, timestamps…).

Restore: `POST /api/trips/[tripId]/expenses/[expenseId]/restore` clears
`deleted_at` (audited → shows as "restored"), same permission as delete.

## Client — `app/components/activity/`
- `activity-card.tsx` (gallery-importable):
  - **`buildActivityCards(entries, ignoredFields)`**: folds entries (display
    order) into row models. Consecutive `update`s by the same person to the
    same record merge while each **consecutive** gap is ≤ `MERGE_GAP_MS`
    (15 min, rolling). The change box lists **each edit in order** with its
    own time; a field returning to its pre-run value is tagged *reverted*.
  - **`ActivityList`** — one card, rows divided (the page renders one per day;
    `bare` drops the card chrome for a parent that draws its own).
  - **`ActivityRow`** — header: actor avatar, sentence ("**Jenny** added
    **Ramen**"), detail line (category · payer · split N ways · time), amount
    (USD + original currency) and a chevron when it opens the expense
    (`?from=activity`, so back returns here). Below, full width: the change
    box, or for a deleted expense a "what it was" box + **Restore**.
  - `context: 'trip' | 'expense'` — History drops the expense name ("Ivan
    edited", "Ivan added it"), adds the date to the time, shows no amount or
    chevron, and gives the create row a Cost/Paid by/Split snapshot.
- `use-restore-expense.ts` — restore + toast + trip refresh.
- Page: `app/gustavo/trips/[slug]/activity/page.tsx` — person filter, sort
  toggle, collapsible date groups. No `PageInfo`: the rows explain themselves.
- History: `components/receipts/drawer/drawer-history.tsx` on the expense page —
  collapsed by default, fetches on first open (`queryKeys.trips.expenseHistory`,
  under the trip's detail key so refresh covers it).

## Gallery
`/dev/gallery/activity` renders the feed and the History context through
`buildActivityCards` with fixtures covering every case (add, merged run +
revert, split/covered, payments incl. recorded-by-someone-else, delete +
Restore, System, people/trip). The real page is auth-gated — verify here.
