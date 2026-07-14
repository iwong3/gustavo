# Activity feed

The per-trip audit timeline at `/gustavo/trips/[slug]/activity`. Turns raw
`audit_log` rows into readable, consolidated cards.

## Data source
Every mutating transaction wrapped in `withAuditUser` writes an `audit_log` row
(`table_name`, `record_id`, `action` INSERT/UPDATE/DELETE, `old_data`,
`new_data` JSONB snapshots, `changed_by`, `changed_at`). The feed reads these;
it never reads the live tables for content (only for id→name lookups).

## API — `app/api/trips/[tripId]/activity/route.ts`
Fetches the trip's audit rows (trips, expenses, locations, trip_participants,
expense_participants) and shapes each into an `ActivityEntry` (`lib/types.ts`):

- **id→name resolution** (`resolveIdFields`): user/category/location/expense ids
  inside `old_data`/`new_data` are replaced with names, so diffs and summaries
  read cleanly. BIGINT ids arrive as number *or* string from JSONB — use
  `toNumericKey` before map lookups.
- **`intent`** (`computeIntent`): `create` | `update` | `delete` | `restore`.
  Folds soft-delete (`deleted_at`) **and** participant removal (`left_at`) into
  one semantic field — INSERT→create, DELETE→delete, and UPDATE that sets/clears
  the lifecycle column → delete/restore. The client keys icon/color off this, so
  soft-delete logic lives in exactly one place.
- **`summary`** (`describeAction`): names the actor/entity, with participant- and
  split-specific phrasing ("Added Priya to the trip", "Changed Suming's role",
  "Removed Marco from split"). `getEntityName` reads the already-resolved
  `user_id`/`expense_id` name off the data.
- **`filterNoise`**: creating or editing an expense churns the whole split in one
  transaction (DELETE all `expense_participants` + re-INSERT). Those rows are
  folded into the parent expense row — matched by expense name + same-second — so
  an edit doesn't emit ~2N "Added/Removed X from split" rows.
- **`FIELD_LABELS` / `IGNORED_FIELDS`**: human labels for diff rows; ignored set
  hides internal/noisy columns. `deleted_at`/`left_at`/`joined_at` are ignored
  because their meaning is already carried by `intent` + summary.

## Client — `app/gustavo/trips/[slug]/activity/`
- `page.tsx`: fetch, user filter, sort toggle, collapse-by-date grouping.
- `activity-card.tsx`: presentational, and gallery-importable.
  - **`buildActivityCards(entries, ignoredFields)`**: folds a date group's
    entries (in display order) into card models. Consecutive `update` entries
    with the same person + same `table_name`+`record_id` merge into one card,
    while each **consecutive** gap is ≤ `MERGE_GAP_MS` (15 min, rolling — a
    continuous session can span longer than 15 min as long as no single pause
    exceeds it). Non-update entries and interruptions break the run.
  - Merged body shows **one row per field edit, in chronological order**, each
    with its own timestamp (per the "each edit, in order" choice, not net
    collapse). A field returning to its pre-run value is tagged `(reverted)`.
  - Layout: **header** (icon + summary + who/when) over a **full-width body**
    grid (`label | old → new | time`), so the diff reclaims the icon gutter.
    Single-entry cards omit the time column (redundant with the header).

## Gallery
`/dev/gallery/activity` renders `ActivityCard` via `buildActivityCards` with
fixtures covering every case (lifecycle, single/multi-field, merged run + revert,
System entries). Add specimens here when changing card rendering — the real page
is auth-gated, so this is the no-auth way to verify.
