# Plan: Audit Log, CRUD, and Enum Removal

## Overview

Remove hardcoded enums (Trip, Person, Location, SpendType), replace with DB-driven
data, add full CRUD for trips/expenses/categories/locations, and implement an audit log.

This plan is ordered to minimize churn — each phase builds on the previous one.

---

## Phase 1: Audit Log

**Goal:** Single `audit_log` table with Postgres triggers on all tables.
Application user attribution via `SET LOCAL audit.changed_by`.

### 1.1 Migration: Create audit_log table + trigger function

```sql
CREATE TABLE audit_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name  TEXT NOT NULL,
    record_id   BIGINT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    changed_by  BIGINT REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log (changed_at);
```

- Generic trigger function using `to_jsonb(OLD)` / `to_jsonb(NEW)`
- Skip no-op updates (`IF OLD = NEW THEN RETURN NEW`)
- Read `current_setting('audit.changed_by', true)` for user attribution
- Attach trigger to: users, trips, trip_participants, locations, expenses, expense_participants

### 1.2 DB helper: `withAuditUser()`

Create `lib/db-audit.ts` — a wrapper that:
1. Gets a client from the pool
2. Runs `BEGIN`
3. Runs `SET LOCAL audit.changed_by = $userId`
4. Executes the callback
5. Runs `COMMIT` (or `ROLLBACK` on error)
6. Releases the client

### 1.3 Retrofit existing expense POST

Update `/api/trips/[tripId]/expenses` POST to use `withAuditUser()` instead of
its current manual `BEGIN`/`COMMIT` pattern.

### 1.4 Run migration locally + on Neon

---

## Phase 2: Expense Categories Table + API

**Goal:** Replace `SpendType` enum with a DB-backed `expense_categories` table.
Named `expense_categories` (not `categories`) to leave room for future apps
(e.g., `exercise_categories`).

### 2.1 Migration: Create expense_categories table

```sql
CREATE TABLE expense_categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Seed with existing values
INSERT INTO expense_categories (name) VALUES
    ('Attraction'), ('Food'), ('Lodging'), ('Shopping'), ('Transit'), ('Other');
```

- Global (not per-trip), matching current behavior
- `expenses.category_id` FK to `expense_categories.id` — source of truth
- Soft deletes
- Audit trigger attached

### 2.2 Migrate expenses.category from TEXT to FK

```sql
-- Add FK column
ALTER TABLE expenses ADD COLUMN category_id BIGINT REFERENCES expense_categories(id);

-- Backfill from text
UPDATE expenses SET category_id = c.id
FROM expense_categories c WHERE expenses.category = c.name;

-- Drop old text column
ALTER TABLE expenses DROP COLUMN category;
```

### 2.3 API routes: `/api/expense-categories`

- `GET /api/expense-categories` — list all active categories
- `POST /api/expense-categories` — create new (used by inline "Add" in expense form)
- `PUT /api/expense-categories/[id]` — rename (management screen)
- `DELETE /api/expense-categories/[id]` — soft delete (management screen, with usage count warning)

### 2.4 Update expense GET/POST to use category_id

- GET joins expense_categories table, returns `category_name`
- POST accepts `category_id` (or `category_name` for inline create)

### 2.5 Delete `SpendType` enum from code

- Remove `utils/spend.ts` `SpendType` enum and `getSpendTypeLabel()`
- Update all consumers (~8 files) to use string category names from DB

---

## Phase 3: Locations — Dynamic from DB

**Goal:** Remove `Location` enum and `LocationByTrip` map. Locations already exist
in DB, just need CRUD API and UI wiring.

### 3.1 API routes: `/api/trips/[tripId]/locations`

Extend existing GET route, add:
- `POST /api/trips/[tripId]/locations` — create (inline from expense form)
- `PUT /api/trips/[tripId]/locations/[id]` — rename (management screen)
- `DELETE /api/trips/[tripId]/locations/[id]` — soft delete

### 3.2 Delete Location enum + LocationByTrip from code

- Remove `utils/location.ts` enum, `LocationByTrip`, `getLocationAbbr()`
- Location abbreviations: generate from name (first 2 chars uppercase), or add
  `abbreviation` column to locations table if custom abbreviations are important
- Update all consumers (~6 files)

### 3.3 Update expense form

- Replace static location dropdown with DB-fetched combobox (Autocomplete)
- Allow inline "Add [typed value]" for new locations

---

## Phase 4: Data Layer Refactor — Remove Trip + Person Enums

**Goal:** Trips and people come entirely from DB. Remove all hardcoded enums,
ID maps, and per-trip constants.

This is the biggest phase. It touches ~25 files but is mostly mechanical replacement.

### 4.1 New DB-shaped types

Create `lib/types.ts` with DB-driven interfaces (replaces enum-based types):

```typescript
// Replaces Trip enum
export type TripSummary = {
    id: number
    name: string
    slug: string
    startDate: string
    endDate: string
    description: string | null
    participants: UserSummary[]
}

// Replaces Person enum
export type UserSummary = {
    id: number
    name: string       // full name
    firstName: string  // derived from name
    email: string | null
    avatarUrl: string | null
}

// Replaces Spend interface
export type Expense = {
    id: number
    name: string
    date: string
    costOriginal: number
    currency: string
    costConvertedUsd: number
    exchangeRate: number | null
    conversionError: boolean
    category: string | null    // category name
    categoryId: number | null
    locationName: string | null
    locationId: number | null
    paidBy: UserSummary
    reportedBy: UserSummary | null
    reportedAt: string | null
    splitBetween: UserSummary[]
    isEveryone: boolean
    notes: string
    receiptImageUrl: string | null
}
```

### 4.2 Expand trips API to return full data

`GET /api/trips` — already returns participants as string[]. Expand to return
full UserSummary objects (id, name, email, avatarUrl).

`GET /api/trips/[tripId]` — new endpoint, returns single trip with participants
as UserSummary[]. Used by trip detail page.

### 4.3 Refactor `utils/api.ts` (fetchExpenses)

- Remove `TripToId` mapping — use trip.id directly
- Remove Person enum mapping — return UserSummary objects
- Remove `isoToAppDate()` — use ISO dates throughout, format in UI only
- Remove `Location`/`SpendType` casts

### 4.4 Refactor trip list page

`app/gustavo/expenses/trips/page.tsx`:
- Remove `ActiveTrips` / `PastTrips` imports
- Fetch trips from API, split into active/past by date comparison
- Each trip card links to `/gustavo/expenses/trips/[slug]`

### 4.5 Refactor trip detail page

`app/gustavo/expenses/trips/[slug]/page.tsx`:
- Fetch trip by slug (new API: `GET /api/trips?slug=xxx` or resolve in page)
- Pass `TripSummary` + `Expense[]` to providers instead of old types

### 4.6 Refactor TripDataProvider + SpendDataProvider

- `TripDataProvider`: provide `TripSummary` and `Expense[]` instead of `Trip` enum + `Spend[]`
- `SpendDataProvider`: filters/sorts work on `Expense` type
- All filter components read participants/locations/categories from trip context,
  not from hardcoded maps

### 4.7 Refactor data-processing.ts (debt calculator)

- `processSpendData()` takes `Expense[]` + `UserSummary[]` (participants)
- Replace `Person` enum keys in debt map with user IDs
- `getSplitCost()` uses participant count directly

### 4.8 Refactor icons.tsx

- `getLocationAbbr()` → derive from location name string
- `getPersonInitials()` → derive from user name string
- `getSpendTypeIcon()` → match on category name string

### 4.9 Refactor filter components

All filter components (`filter-paid-by.tsx`, `filter-location.tsx`,
`filter-spend-type.tsx`, `filter-split-between.tsx`):
- Read available options from trip context (DB data), not from enums/maps
- Filter on IDs or strings, not enum values

### 4.10 Delete old enum files

After all consumers are updated:
- Delete `utils/trips.ts` (Trip enum, ActiveTrips, PastTrips, slugToTrip, etc.)
- Delete `utils/person.ts` (Person enum, PeopleByTrip, getPersonFromFirstName, etc.)
- Delete `utils/location.ts` (Location enum, LocationByTrip, getLocationAbbr)
- Delete `utils/data-mapping.ts` (legacy Google Sheets fetcher, already unused?)
- Clean up `utils/spend.ts` — keep `Spend` interface temporarily or inline into lib/types.ts

### 4.11 Move person metadata to DB

Add columns to `users` table:
- `initials TEXT` — for icon display (AS, AM, DM, IW, etc.)
- `venmo_url TEXT` — for debt calculator links

Migration seeds these from existing hardcoded values. This replaces
`getPersonInitials()` and `getVenmoUrl()`.

---

## Phase 5: Expense Edit + Delete

**Goal:** Full CRUD for expenses (create already exists).

### 5.1 API: PUT + DELETE on `/api/trips/[tripId]/expenses/[expenseId]`

- `PUT` — update expense fields + expense_participants. Uses `withAuditUser()`.
  Accepts same shape as POST. Updates in a transaction.
- `DELETE` — soft delete (set deleted_at). Uses `withAuditUser()`.

### 5.2 Edit expense dialog

- Reuse/refactor `AddExpenseDialog` into a shared `ExpenseFormDialog`
- Pre-populate fields when editing
- Mode: "add" vs "edit" (controls title, submit button text, API call)
- On edit: PUT to API, refresh data

### 5.3 Delete expense

- Confirmation dialog ("Delete [expense name]?")
- DELETE to API, refresh data
- Show in UI: swipe-to-delete, or delete button in expense detail/edit dialog

### 5.4 Expense row actions

Add edit/delete affordances to expense rows in the receipts list.
Options (decide during implementation):
- Tap row → open edit dialog
- Long press or swipe → show delete option
- Three-dot menu on each row

---

## Phase 6: Trip CRUD

**Goal:** Create, edit, soft-delete trips from the UI.

### 6.1 API: POST + PUT + DELETE on `/api/trips`

- `POST /api/trips` — create trip (name, start_date, end_date, description).
  Auto-adds creator as participant. Uses `withAuditUser()`.
- `PUT /api/trips/[tripId]` — update trip fields.
- `DELETE /api/trips/[tripId]` — soft delete.

### 6.2 API: Manage trip participants

- `POST /api/trips/[tripId]/participants` — add user to trip
- `DELETE /api/trips/[tripId]/participants/[userId]` — remove (set left_at)
- Participants dropdown populated from `GET /api/users` (all active users)

### 6.3 Trip form dialog

- Create/edit trip: name, start/end date, description, participants
- Participant picker: select from existing users
- Default: creator added as participant

### 6.4 Trip list page actions

- "New Trip" button on trip list page
- Edit/delete on each trip card (three-dot menu or similar)

---

## Phase 7: Category + Location Management Screen

**Goal:** Dedicated UI for renaming/deleting categories and locations.

### 7.1 Categories management

- Route: `/gustavo/expenses/settings/categories` (or similar)
- List all categories with usage count (number of expenses using each)
- Rename inline
- Delete with warning if in use ("12 expenses use this category. Reassign or remove?")

### 7.2 Locations management

- Per-trip: accessible from trip settings/detail
- Same UX as categories: list, rename, delete with usage warning

### 7.3 Navigation

- Add "Settings" or "Manage" link accessible from trip detail or main menu
- Keep it simple — this is a power-user feature, not primary navigation

---

## Execution Order Summary

| Phase | What | Depends on | Effort |
|-------|------|------------|--------|
| 1 | Audit log | Nothing | Small |
| 2 | Expense categories table + API | Phase 1 (audit triggers) | Small |
| 3 | Locations CRUD API | Phase 1 | Small |
| 4 | Enum removal + data layer refactor | Phases 2-3 | **Large** (~25 files) |
| 5 | Expense edit/delete | Phase 4 (new types) | Medium |
| 6 | Trip CRUD | Phase 4 (new types) | Medium |
| 7 | Category/location management screens | Phases 2-3 (APIs) | Small |

Phases 2+3 can run in parallel. Phase 7 can run anytime after 2+3.

---

## Design Principles

1. **DB is the source of truth** — no hardcoded lists of trips, people, locations, or categories
2. **IDs for relationships, strings for display** — store FKs, return names in API responses
3. **Audit everything** — triggers handle it automatically, `withAuditUser()` provides attribution
4. **Keep components dumb** — they receive data via props/context, don't import enum files
5. **ISO dates everywhere** — format only at the display layer
6. **Prepare for redesign** — components should be easy to reskin (data and presentation separated)

---

## Files Affected (Major)

### New files
- `database/migrations/00009_add_audit_log.sql`
- `database/migrations/00010_add_expense_categories_table.sql`
- `database/migrations/00011_migrate_expense_category_to_fk.sql`
- `database/migrations/00012_add_user_metadata.sql` (initials, venmo_url)
- `lib/db-audit.ts`
- `lib/types.ts`
- `app/api/expense-categories/route.ts`
- `app/api/expense-categories/[id]/route.ts`
- `app/api/trips/[tripId]/locations/[id]/route.ts`
- `app/api/trips/[tripId]/expenses/[expenseId]/route.ts`
- `app/api/trips/[tripId]/participants/route.ts`
- `app/api/users/route.ts`

### Heavily modified files (~25)
- `app/utils/api.ts` → rewrite (remove enum mappings)
- `app/utils/spend.ts` → remove SpendType, simplify or merge into lib/types.ts
- `app/utils/data-processing.ts` → refactor to use new types
- `app/utils/icons.tsx` → derive from strings instead of enums
- `app/components/add-expense-dialog.tsx` → refactor into ExpenseFormDialog
- `app/providers/trip-data-provider.tsx` → provide new types
- `app/providers/spend-data-provider.tsx` → filter/sort on new types
- `app/gustavo/expenses/trips/page.tsx` → fetch from API
- `app/gustavo/expenses/trips/[slug]/page.tsx` → use new types
- `app/components/debt/debt-calculator.tsx` → use UserSummary + IDs
- `app/components/menu/filter/*.tsx` → read options from context
- `app/components/summary/summary-items/*.tsx` → use strings
- `app/components/receipts/*.tsx` → use new Expense type

### Deleted files
- `app/utils/trips.ts`
- `app/utils/person.ts`
- `app/utils/location.ts`
- `app/utils/data-mapping.ts` (if not already dead code)
