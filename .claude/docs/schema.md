# Database Schema

> Current through migration **00037**. When you add a migration, update this doc in the same change.

## ER Diagram

```
users
  id BIGINT PK
  email TEXT (unique, nullable)
  name TEXT
  first_name TEXT
  initials TEXT
  avatar_url TEXT
  venmo_url TEXT
  is_admin BOOLEAN (default false)
  default_trip_visibility TEXT (default 'participants')
  default_participant_role TEXT (default 'viewer')
  alphabet_index_side TEXT (default 'right')
  created_at, updated_at, deleted_at

trips
  id BIGINT PK
  name TEXT
  slug TEXT (unique)
  description TEXT
  start_date DATE
  end_date DATE
  visibility TEXT (default 'participants')
  currency TEXT (default 'USD') -- legacy; superseded by trip_currencies, kept until nothing reads it
  created_by BIGINT FK -> users
  created_at, updated_at, deleted_at

trip_participants
  id BIGINT PK
  trip_id BIGINT FK -> trips
  user_id BIGINT FK -> users
  role TEXT (default 'viewer') -- 'owner' | 'editor' | 'viewer'
  joined_at TIMESTAMPTZ
  left_at TIMESTAMPTZ
  UNIQUE(trip_id, user_id)

trip_countries -- countries selected for a trip (00035)
  trip_id BIGINT FK -> trips (CASCADE)
  country_code TEXT
  PK (trip_id, country_code)

trip_currencies -- currencies available on a trip; source of truth for expense form (00035)
  trip_id BIGINT FK -> trips (CASCADE)
  currency_code TEXT
  PK (trip_id, currency_code)

locations
  id BIGINT PK
  trip_id BIGINT FK -> trips
  name TEXT
  created_at, deleted_at
  UNIQUE(trip_id, name)

expense_categories
  id BIGINT PK
  name TEXT (unique)
  created_by BIGINT FK -> users
  slug TEXT (unique, nullable) -- system categories (e.g. 'currency_exchange'); NULL for user-created
  created_at, updated_at, deleted_at

expenses
  id BIGINT PK
  trip_id BIGINT FK -> trips
  name TEXT
  date DATE
  cost_original NUMERIC(12,2)
  currency TEXT
  cost_converted_usd NUMERIC(12,2)
  exchange_rate NUMERIC(16,8)
  conversion_error BOOLEAN
  category_id BIGINT FK -> expense_categories
  location_id BIGINT FK -> locations
  paid_by BIGINT FK -> users
  notes TEXT
  reported_by BIGINT FK -> users
  reported_at TIMESTAMPTZ
  google_place_id TEXT FK -> place_details (nullable)
  local_currency_received NUMERIC(12,2) -- only for currency exchange expenses
  created_at, updated_at, deleted_at

expense_participants
  id BIGINT PK
  expense_id BIGINT FK -> expenses (CASCADE)
  user_id BIGINT FK -> users
  covered_by BIGINT FK -> users (nullable) -- set = share absorbed by coverer, no debt accrued
  UNIQUE(expense_id, user_id)

place_details -- cached Google Places metadata (00020)
  google_place_id TEXT PK
  name TEXT
  address TEXT
  lat, lng DOUBLE PRECISION
  price_level INTEGER -- 0-4
  rating NUMERIC(2,1)
  primary_type TEXT
  types JSONB
  website TEXT
  hours_json JSONB
  photo_refs JSONB
  fetched_at, created_at, updated_at

audit_log
  id BIGINT PK
  table_name TEXT
  row_id BIGINT
  action TEXT ('INSERT' | 'UPDATE' | 'DELETE')
  old_data JSONB
  new_data JSONB
  changed_by BIGINT
  changed_at TIMESTAMPTZ

muscle_groups -- seed-only reference; after 00026: "Upper Back" + standalone "Lower Back" groups
  id BIGINT PK
  name TEXT (unique)
  created_at TIMESTAMPTZ

muscle_group_parents
  id BIGINT PK
  child_id BIGINT FK -> muscle_groups
  parent_id BIGINT FK -> muscle_groups
  UNIQUE(child_id, parent_id)

workouts
  id BIGINT PK
  user_id BIGINT FK -> users
  date DATE
  notes TEXT
  created_at, updated_at, deleted_at

workout_muscle_groups
  id BIGINT PK
  workout_id BIGINT FK -> workouts (CASCADE)
  muscle_group_id BIGINT FK -> muscle_groups
  UNIQUE(workout_id, muscle_group_id)

exercises
  id BIGINT PK
  user_id BIGINT FK -> users
  name TEXT
  is_bodyweight BOOLEAN (default false)
  created_at, updated_at, deleted_at
  UNIQUE(user_id, name) WHERE deleted_at IS NULL

exercise_muscle_groups
  id BIGINT PK
  exercise_id BIGINT FK -> exercises (CASCADE)
  muscle_group_id BIGINT FK -> muscle_groups
  UNIQUE(exercise_id, muscle_group_id)

workout_exercises
  id BIGINT PK
  workout_id BIGINT FK -> workouts (CASCADE)
  exercise_id BIGINT FK -> exercises
  sort_order INT (default 0)
  weight_lbs NUMERIC (nullable) -- weight lives here, not per-set (00024)
  created_at TIMESTAMPTZ

workout_exercise_sets -- sets only track reps; weight is on workout_exercises
  id BIGINT PK
  workout_exercise_id BIGINT FK -> workout_exercises (CASCADE)
  set_number INT
  reps INT
  UNIQUE(workout_exercise_id, set_number)

supplements
  id BIGINT PK
  user_id BIGINT FK -> users
  name TEXT
  dosage TEXT
  is_active BOOLEAN (default true)
  created_at, updated_at, deleted_at

supplement_logs
  id BIGINT PK
  user_id BIGINT FK -> users
  supplement_id BIGINT FK -> supplements
  date DATE
  quantity INT (default 1)
  created_at, updated_at
  UNIQUE(user_id, supplement_id, date)

presets -- unified presets across features
  id BIGINT PK
  user_id BIGINT FK -> users
  name TEXT
  type TEXT ('workout' | 'supplement' | 'diet')
  sort_order INT (default 0) -- user-defined ordering (00027)
  created_at, updated_at, deleted_at
  UNIQUE(user_id, name, type) WHERE deleted_at IS NULL
  -- meal_label was added in 00028 and dropped in 00031: diet presets use the
  -- preset name as the meal group label when applied

preset_muscle_groups
  id BIGINT PK
  preset_id BIGINT FK -> presets (CASCADE)
  muscle_group_id BIGINT FK -> muscle_groups
  UNIQUE(preset_id, muscle_group_id)

preset_exercises
  id BIGINT PK
  preset_id BIGINT FK -> presets (CASCADE)
  exercise_id BIGINT FK -> exercises
  sort_order INT (default 0)
  UNIQUE(preset_id, exercise_id)

preset_supplements
  id BIGINT PK
  preset_id BIGINT FK -> presets (CASCADE)
  supplement_id BIGINT FK -> supplements
  UNIQUE(preset_id, supplement_id)

preset_foods -- diet preset items (00028)
  id BIGINT PK
  preset_id BIGINT FK -> presets (CASCADE)
  food_id BIGINT FK -> foods
  quantity INT (default 1)
  UNIQUE(preset_id, food_id)

foods -- user-defined food library (00028)
  id BIGINT PK
  user_id BIGINT FK -> users
  name TEXT -- unique per user, case-insensitive, among non-deleted
  is_active BOOLEAN (default true)
  created_at, updated_at, deleted_at

meal_groups -- optional grouping of food logs within a day, e.g. "Chipotle" (00028)
  id BIGINT PK
  user_id BIGINT FK -> users
  date DATE
  label TEXT -- unique per user+date, case-insensitive
  quantity INT (default 1) -- how many times the meal was logged (00030)
  created_at, updated_at

food_logs (00028)
  id BIGINT PK
  user_id BIGINT FK -> users
  food_id BIGINT FK -> foods
  date DATE
  quantity INT (default 1)
  meal_group_id BIGINT FK -> meal_groups (nullable, ON DELETE SET NULL)
  created_at, updated_at
  -- unique per (user, food, date, meal_group) when grouped; per (user, food, date) when standalone

food_groups -- classification tags, e.g. High FODMAP, Probiotic (00033)
  id BIGINT PK
  user_id BIGINT FK -> users
  name TEXT -- unique per user, case-insensitive, among non-deleted
  color TEXT -- hex, e.g. '#e57373'
  is_active BOOLEAN (default true)
  created_at, updated_at, deleted_at

food_group_members (00033)
  food_group_id BIGINT FK -> food_groups
  food_id BIGINT FK -> foods
  PK (food_group_id, food_id)
  -- no audit trigger: composite PK is incompatible with audit_trigger_func (reads NEW.id)

symptoms -- user-defined symptom library (00029)
  id BIGINT PK
  user_id BIGINT FK -> users
  name TEXT -- unique per user, case-insensitive, among non-deleted
  is_active BOOLEAN (default true)
  created_at, updated_at, deleted_at

symptom_logs (00029)
  id BIGINT PK
  user_id BIGINT FK -> users
  symptom_id BIGINT FK -> symptoms
  date DATE
  notes TEXT
  created_at, updated_at
  UNIQUE(user_id, symptom_id, date)

weight_logs (00034)
  id BIGINT PK
  user_id BIGINT FK -> users
  date DATE -- no unique constraint; flexible logging
  weight_lbs NUMERIC(5,1)
  created_at, updated_at, deleted_at
```

## Relationships

```
users 1──* trips (created_by)
users 1──* trip_participants
trips 1──* trip_participants
trips 1──* trip_countries / trip_currencies
trips 1──* locations
trips 1──* expenses
users 1──* expenses (paid_by, reported_by)
expense_categories 1──* expenses (category_id)
users 1──* expense_categories (created_by)
locations 1──* expenses
place_details 1──* expenses (google_place_id)
expenses 1──* expense_participants
users 1──* expense_participants (user_id, covered_by)
```

## Permissions Model

### Trip roles
- **owner** — exactly one per trip (the creator). Can edit trip, manage participants/roles, delete trip.
- **editor** — can add/edit/delete any expense, manage locations.
- **viewer** — can add expenses and edit/delete only their own (where `reported_by = current user`).

### Trip visibility
- **participants** (default) — only trip participants can see the trip.
- **all_users** — any authenticated user can see (but not edit) the trip.

### Admin flag
- `users.is_admin = true` bypasses ALL permission checks (short-circuit in every `can*` function).

### Permission functions (lib/permissions.ts, app/utils/permissions.ts)
| Function | Access granted to |
|----------|-------------------|
| `canEditTrip` | admin, owner, editor |
| `canDeleteTrip` | admin, owner |
| `canAddExpense` | owner, editor, viewer (any participant) |
| `canEditExpense` | admin, owner, editor, or reporter |
| `canDeleteExpense` | same as canEditExpense |
| `canManageRoles` | admin, owner |
| `canManageLocations` | admin, owner, editor |
| `canEditCategory` | admin, or category creator |
| `canDeleteCategory` | admin, or category creator |

### User default preferences
- `default_trip_visibility` — applied when creating a new trip.
- `default_participant_role` — applied when adding participants to trips the user creates.

## Key Design Decisions

- **BIGINT PKs** — simpler and more efficient than UUID for a single-DB personal app
- **TEXT for role/visibility/currency** — no Postgres ENUMs (can't remove values). Validated in app code.
- **Soft deletes** — `deleted_at TIMESTAMPTZ` on long-lived entities (users, trips, locations, expenses, expense_categories, exercises, supplements, presets, foods, food_groups, symptoms, weight_logs, workouts). All queries filter `WHERE deleted_at IS NULL`.
- **Expense categories** — global (not trip-scoped), with `created_by` for ownership. System categories have a `slug` (e.g. `currency_exchange`) and `created_by = NULL`; they cannot be renamed or deleted. Soft-deleted categories still display on existing expenses and remain filterable.
- **"Everyone" split detection** — compare expense_participants count to trip_participants count for that trip. No separate flag column.
- **Covered participants** — `expense_participants.covered_by` set means that share is absorbed by the coverer (in practice the payer) and accrues no debt.
- **Users without email** — some participants don't have Google accounts. They have `email = NULL` and cannot log in, but can be referenced as payers/participants.
- **Trip ownership** — `trips.created_by` determines the owner. The owner is also recorded as a participant with `role = 'owner'`.
- **Multi-currency trips (00035)** — `trip_currencies` is the source of truth for the expense form's currency options; `trip_countries` records destinations. Legacy `trips.currency` is backfilled into `trip_currencies` and awaits a drop migration.
- **Google Places (00019–00020)** — expenses store only `google_place_id`; all place metadata is cached in `place_details` (PK = Google's place id, refreshable via `fetched_at`).
- **Optimistic concurrency (00037)** — `updated_at` is the OCC token. A trigger bumps the parent `expenses.updated_at` whenever its `expense_participants` change, so an expense + its participants behave as one aggregate.
- **Home currency** — always USD for debt calculation.
- **Audit log** — Postgres triggers write to `audit_log`; user attribution via `SET LOCAL audit.changed_by` in transactions (see `lib/db-audit.ts`). Join tables with composite PKs (trip_countries, trip_currencies, food_group_members) have NO audit triggers — `audit_trigger_func()` reads `NEW.id` and blows up without an `id` column (00036).
- **Workout weight (00024)** — `weight_lbs` lives on `workout_exercises` (one weight per exercise per session); sets track reps only.
- **Muscle groups (00026)** — "Back" split into "Upper Back" (targets: Lats, Rhomboids, Traps, Rear Delts) and standalone "Lower Back". Group vs. target is implicit via `muscle_group_parents`.

## Common Query Patterns

### Get all expenses for a trip (with related data)
```sql
SELECT
    e.id, e.name, e.date, e.cost_original, e.currency,
    e.cost_converted_usd, e.exchange_rate, e.conversion_error,
    ec.name AS category_name, e.notes, e.reported_at,
    l.name AS location_name,
    payer.name AS paid_by_name,
    reporter.name AS reported_by_name,
    ARRAY_AGG(DISTINCT participant.name ORDER BY participant.name) AS split_between
FROM expenses e
JOIN users payer ON e.paid_by = payer.id
LEFT JOIN users reporter ON e.reported_by = reporter.id
LEFT JOIN expense_categories ec ON e.category_id = ec.id
LEFT JOIN locations l ON e.location_id = l.id
LEFT JOIN expense_participants ep ON ep.expense_id = e.id
LEFT JOIN users participant ON ep.user_id = participant.id
WHERE e.trip_id = $1 AND e.deleted_at IS NULL
GROUP BY e.id, ec.name, l.name, payer.name, reporter.name
ORDER BY e.date, e.created_at;
```

### Get trip participants with roles
```sql
SELECT u.id, u.name, u.first_name, u.initials, u.email, u.avatar_url, tp.role
FROM trip_participants tp
JOIN users u ON tp.user_id = u.id
WHERE tp.trip_id = $1 AND tp.left_at IS NULL
ORDER BY u.name;
```

### Get trips visible to a user
```sql
SELECT t.* FROM trips t
LEFT JOIN trip_participants tp ON tp.trip_id = t.id AND tp.user_id = $1
WHERE t.deleted_at IS NULL
  AND (tp.user_id IS NOT NULL OR t.visibility = 'all_users')
ORDER BY t.start_date DESC;
```

### Look up user by email (Auth.js sign-in)
```sql
SELECT id, name, email, avatar_url, is_admin FROM users
WHERE email = $1 AND deleted_at IS NULL;
```

## Migration System

- Runner: `scripts/db/migrate.js`
- Files: `database/migrations/NNNNN_description.sql`
- Tracking: `schema_migrations` table (version + applied_at)
- Commands: `pnpm db:migrate` (local, .env.local), `pnpm db:migrate:prod` (Neon, .env.production.local)
- Create new: `pnpm db:create-migration <description>`
- Reset local: `pnpm db:reset`
- **Prod migrations are manual** — run `pnpm db:migrate:prod` around the deploy; nothing in Vercel runs them.

## Indexes (highlights)

Every FK used in list queries has an index; partial indexes on `deleted_at IS NULL` for active-row filters; unique partial indexes enforce per-user, case-insensitive name uniqueness on the library tables (exercises, foods, food_groups, symptoms). Notable ones:

| Index | Table | Purpose |
|-------|-------|---------|
| idx_expenses_trip_date | expenses | Expenses by trip + date |
| idx_expenses_google_place (partial) | expenses | Expenses by place |
| idx_food_logs_grouped / _standalone (unique, partial) | food_logs | Dedup grouped vs standalone logs |
| idx_symptom_logs_unique (unique) | symptom_logs | One log per symptom per day |
| idx_weight_logs_user_date | weight_logs | Weight history per user (date DESC) |
| idx_meal_groups_user_date_label (unique) | meal_groups | One label per user per day |
| idx_foods_user_name (unique, partial, lower()) | foods | Case-insensitive name per user |
