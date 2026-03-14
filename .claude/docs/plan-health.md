# Plan: Health App (Exercise + Supplements)

## Overview

Add a Health app to Gustavo for tracking exercise and supplement intake.
Primary goal: fast, low-friction daily logging with visibility into patterns.

Single-user (Ivan only). No permissions model needed — just auth check.
All health data filtered by `WHERE user_id = <authenticated user>`.

---

## Muscle Group Hierarchy

Groups (top-level, no parents) and targets (have parents) are both stored
in `muscle_groups`. The distinction is implicit: a muscle group with no rows
in `muscle_group_parents` as a child is a group; one with parent rows is a target.

A target can belong to multiple groups (e.g. Rear Delts → Shoulders + Back).

| Group | Targets |
|---|---|
| Chest | Upper Chest, Lower Chest |
| Back | Lats, Rhomboids, Lower Back, Traps |
| Shoulders | Front Delts, Side Delts, Rear Delts |
| Biceps | *(none)* |
| Triceps | *(none)* |
| Forearms | *(none)* |
| Legs | Quads, Hamstrings, Glutes, Calves, Adductors, Abductors, Hip Flexors |
| Core | Upper Abs, Lower Abs, Obliques |
| Cardio | Jogging |

This grouping reflects workout programming, not strict anatomy.
It can be restructured later via migration (e.g. splitting Legs into separate
Quads/Hamstrings groups) — just data changes, no schema changes needed.

### Parent auto-insert: NO

When logging a workout, only the user's explicit selections are inserted into
`workout_muscle_groups`. Parent groups are NOT auto-inserted. The "days since"
dashboard calculates parent rollups at read time via LEFT JOIN through
`muscle_group_parents`. This keeps a single source of truth and means
re-parenting a muscle group (via migration) automatically updates historical
rollups without touching workout data.

### Code constants

The same hierarchy is hardcoded in `lib/health/muscle-groups.ts` for instant
UI rendering (no loading state). This is a cache of the DB truth. Since muscle
groups are seed-only and change via migrations, the code constants and DB stay
in sync through the deploy process.

Display order in the UI is controlled by code (grouped by push/pull/legs),
not by a DB column.

---

## Phase 1: Schema + Migrations

### Migration 00021: Exercise tables

```sql
CREATE TABLE muscle_groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Child-parent relationships (child = target, parent = group)
-- A muscle group with no child rows is a "group" (top-level)
-- A muscle group with child rows is a "target" (specific)
-- Targets can have multiple parents (e.g. Rear Delts → Shoulders + Back)
CREATE TABLE muscle_group_parents (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    child_id    BIGINT NOT NULL REFERENCES muscle_groups(id),
    parent_id   BIGINT NOT NULL REFERENCES muscle_groups(id),
    UNIQUE(child_id, parent_id)
);

CREATE TABLE workouts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    date        DATE NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE workout_muscle_groups (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workout_id      BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    muscle_group_id BIGINT NOT NULL REFERENCES muscle_groups(id),
    UNIQUE(workout_id, muscle_group_id)
);

-- Indexes
CREATE INDEX idx_workouts_user_id ON workouts (user_id);
CREATE INDEX idx_workouts_user_date ON workouts (user_id, date);
CREATE INDEX idx_workouts_deleted_at ON workouts (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_workout_muscle_groups_workout ON workout_muscle_groups (workout_id);
CREATE INDEX idx_workout_muscle_groups_muscle ON workout_muscle_groups (muscle_group_id);
CREATE INDEX idx_muscle_group_parents_child ON muscle_group_parents (child_id);
CREATE INDEX idx_muscle_group_parents_parent ON muscle_group_parents (parent_id);

-- updated_at trigger
CREATE TRIGGER set_workouts_updated_at
    BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit triggers
CREATE TRIGGER audit_workouts
    AFTER INSERT OR UPDATE OR DELETE ON workouts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_workout_muscle_groups
    AFTER INSERT OR UPDATE OR DELETE ON workout_muscle_groups
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_muscle_group_parents
    AFTER INSERT OR UPDATE OR DELETE ON muscle_group_parents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Seed muscle groups (all in one flat table)
INSERT INTO muscle_groups (name) VALUES
    -- Groups (top-level)
    ('Chest'),
    ('Back'),
    ('Shoulders'),
    ('Biceps'),
    ('Triceps'),
    ('Forearms'),
    ('Legs'),
    ('Core'),
    ('Cardio'),
    -- Targets (specific muscles)
    ('Upper Chest'),
    ('Lower Chest'),
    ('Lats'),
    ('Rhomboids'),
    ('Lower Back'),
    ('Traps'),
    ('Front Delts'),
    ('Side Delts'),
    ('Rear Delts'),
    ('Quads'),
    ('Hamstrings'),
    ('Glutes'),
    ('Calves'),
    ('Adductors'),
    ('Abductors'),
    ('Hip Flexors'),
    ('Upper Abs'),
    ('Lower Abs'),
    ('Obliques'),
    ('Jogging');

-- Parent mappings (target → group)
INSERT INTO muscle_group_parents (child_id, parent_id) VALUES
    ((SELECT id FROM muscle_groups WHERE name = 'Upper Chest'),  (SELECT id FROM muscle_groups WHERE name = 'Chest')),
    ((SELECT id FROM muscle_groups WHERE name = 'Lower Chest'),  (SELECT id FROM muscle_groups WHERE name = 'Chest')),
    ((SELECT id FROM muscle_groups WHERE name = 'Lats'),         (SELECT id FROM muscle_groups WHERE name = 'Back')),
    ((SELECT id FROM muscle_groups WHERE name = 'Rhomboids'),    (SELECT id FROM muscle_groups WHERE name = 'Back')),
    ((SELECT id FROM muscle_groups WHERE name = 'Lower Back'),   (SELECT id FROM muscle_groups WHERE name = 'Back')),
    ((SELECT id FROM muscle_groups WHERE name = 'Traps'),        (SELECT id FROM muscle_groups WHERE name = 'Back')),
    ((SELECT id FROM muscle_groups WHERE name = 'Front Delts'),  (SELECT id FROM muscle_groups WHERE name = 'Shoulders')),
    ((SELECT id FROM muscle_groups WHERE name = 'Side Delts'),   (SELECT id FROM muscle_groups WHERE name = 'Shoulders')),
    ((SELECT id FROM muscle_groups WHERE name = 'Rear Delts'),   (SELECT id FROM muscle_groups WHERE name = 'Shoulders')),
    ((SELECT id FROM muscle_groups WHERE name = 'Rear Delts'),   (SELECT id FROM muscle_groups WHERE name = 'Back')),
    ((SELECT id FROM muscle_groups WHERE name = 'Quads'),        (SELECT id FROM muscle_groups WHERE name = 'Legs')),
    ((SELECT id FROM muscle_groups WHERE name = 'Hamstrings'),   (SELECT id FROM muscle_groups WHERE name = 'Legs')),
    ((SELECT id FROM muscle_groups WHERE name = 'Glutes'),       (SELECT id FROM muscle_groups WHERE name = 'Legs')),
    ((SELECT id FROM muscle_groups WHERE name = 'Calves'),       (SELECT id FROM muscle_groups WHERE name = 'Legs')),
    ((SELECT id FROM muscle_groups WHERE name = 'Adductors'),    (SELECT id FROM muscle_groups WHERE name = 'Legs')),
    ((SELECT id FROM muscle_groups WHERE name = 'Abductors'),    (SELECT id FROM muscle_groups WHERE name = 'Legs')),
    ((SELECT id FROM muscle_groups WHERE name = 'Hip Flexors'),  (SELECT id FROM muscle_groups WHERE name = 'Legs')),
    ((SELECT id FROM muscle_groups WHERE name = 'Upper Abs'),    (SELECT id FROM muscle_groups WHERE name = 'Core')),
    ((SELECT id FROM muscle_groups WHERE name = 'Lower Abs'),    (SELECT id FROM muscle_groups WHERE name = 'Core')),
    ((SELECT id FROM muscle_groups WHERE name = 'Obliques'),     (SELECT id FROM muscle_groups WHERE name = 'Core')),
    ((SELECT id FROM muscle_groups WHERE name = 'Jogging'),      (SELECT id FROM muscle_groups WHERE name = 'Cardio'));
```

### Migration 00022: Supplement tables

```sql
CREATE TABLE supplements (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    dosage      TEXT,                           -- '5g', '400mg', '2 capsules', free text
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

-- Unique name per user (among non-deleted)
CREATE UNIQUE INDEX idx_supplements_user_name
    ON supplements (user_id, name) WHERE deleted_at IS NULL;

CREATE TABLE supplement_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    supplement_id   BIGINT NOT NULL REFERENCES supplements(id),
    date            DATE NOT NULL,
    time_of_day     TEXT,                       -- 'morning' | 'afternoon' | 'night' (nullable)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

-- Prevent double-logging same supplement at same time on same day
-- Note: NULL time_of_day entries are not constrained by this index
-- (two NULLs are considered distinct in a unique index)
CREATE UNIQUE INDEX idx_supplement_logs_unique
    ON supplement_logs (user_id, supplement_id, date, time_of_day)
    WHERE time_of_day IS NOT NULL;

CREATE TABLE supplement_presets (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,                   -- 'Daily Vitamins', 'Post-Workout'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE supplement_preset_items (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    preset_id       BIGINT NOT NULL REFERENCES supplement_presets(id) ON DELETE CASCADE,
    supplement_id   BIGINT NOT NULL REFERENCES supplements(id),
    UNIQUE(preset_id, supplement_id)
);

-- Indexes
CREATE INDEX idx_supplements_user ON supplements (user_id);
CREATE INDEX idx_supplements_active
    ON supplements (user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_supplement_logs_user_date ON supplement_logs (user_id, date);
CREATE INDEX idx_supplement_logs_supplement ON supplement_logs (supplement_id);
CREATE INDEX idx_supplement_presets_user ON supplement_presets (user_id);

-- updated_at triggers
CREATE TRIGGER set_supplements_updated_at
    BEFORE UPDATE ON supplements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_supplement_logs_updated_at
    BEFORE UPDATE ON supplement_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_supplement_presets_updated_at
    BEFORE UPDATE ON supplement_presets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit triggers
CREATE TRIGGER audit_supplements
    AFTER INSERT OR UPDATE OR DELETE ON supplements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_supplement_logs
    AFTER INSERT OR UPDATE OR DELETE ON supplement_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_supplement_presets
    AFTER INSERT OR UPDATE OR DELETE ON supplement_presets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_supplement_preset_items
    AFTER INSERT OR UPDATE OR DELETE ON supplement_preset_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Phase 2: Muscle Group Constants (Code)

File: `lib/health/muscle-groups.ts`

Hardcoded mapping that mirrors the DB seed data for instant UI rendering.
This is a cache — the DB is the source of truth.

```typescript
export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Legs', 'Core', 'Cardio',
] as const;

// Target → parent group(s)
export const TARGET_PARENTS: Record<string, string[]> = {
  'Upper Chest':  ['Chest'],
  'Lower Chest':  ['Chest'],
  'Lats':         ['Back'],
  'Rhomboids':    ['Back'],
  'Lower Back':   ['Back'],
  'Traps':        ['Back'],
  'Front Delts':  ['Shoulders'],
  'Side Delts':   ['Shoulders'],
  'Rear Delts':   ['Shoulders', 'Back'],
  'Quads':        ['Legs'],
  'Hamstrings':   ['Legs'],
  'Glutes':       ['Legs'],
  'Calves':       ['Legs'],
  'Adductors':    ['Legs'],
  'Abductors':    ['Legs'],
  'Hip Flexors':  ['Legs'],
  'Upper Abs':    ['Core'],
  'Lower Abs':    ['Core'],
  'Obliques':     ['Core'],
  'Jogging':      ['Cardio'],
};

// Group → its targets (derived from TARGET_PARENTS)
export const GROUP_TARGETS: Record<string, string[]> = { /* computed */ };

// Display order (push / pull / legs grouping)
export const DISPLAY_ORDER = [
  // Push
  'Chest', 'Shoulders', 'Triceps',
  // Pull
  'Back', 'Biceps', 'Forearms',
  // Legs
  'Legs',
  // Other
  'Core', 'Cardio',
] as const;
```

UI behavior:
- Workout form shows groups as primary tappable chips (ordered by DISPLAY_ORDER)
- Tapping a group selects it; optionally reveals its targets beneath
- Selecting a target auto-selects its parent group(s)
- Deselecting all targets does NOT deselect the group
- Deselecting a group deselects all its targets

---

## Phase 3: TypeScript Types

Add to `lib/health-types.ts`:

```typescript
export type MuscleGroup = {
  id: number;
  name: string;
};

export type MuscleGroupWithParents = MuscleGroup & {
  parents: MuscleGroup[];     // empty = group-level, populated = target
};

export type Workout = {
  id: number;
  date: string;
  notes: string | null;
  muscleGroups: MuscleGroup[];
  createdAt: string;
};

export type DaysSince = {
  muscleGroup: string;         // any muscle group name (group or target)
  daysSince: number | null;    // null = never
  lastDate: string | null;
};

export type Supplement = {
  id: number;
  name: string;
  dosage: string | null;
  isActive: boolean;
};

export type SupplementLog = {
  id: number;
  supplementId: number;
  supplementName: string;
  date: string;
  timeOfDay: string | null;
  createdAt: string;
};

export type SupplementPreset = {
  id: number;
  name: string;
  supplements: Supplement[];
};
```

---

## Phase 4: API Routes

### Exercise

```
GET    /api/health/muscle-groups           — list all muscle groups with parent info
GET    /api/health/workouts                — list workouts (date range filter)
POST   /api/health/workouts                — log workout {date, muscleGroupIds[], notes?}
PUT    /api/health/workouts/[id]           — edit workout
DELETE /api/health/workouts/[id]           — soft delete
GET    /api/health/workouts/days-since     — days since last workout per muscle group
```

POST /api/health/workouts uses `withAuditUser()`. Inserts workout +
workout_muscle_groups in a single transaction. Only inserts the user's
explicit selections — no auto-inserting parent groups.

GET /api/health/workouts/days-since query: for each group-level muscle,
find the most recent workout containing that group OR any of its children
(via LEFT JOIN through muscle_group_parents). Can also return days-since
for specific targets if requested.

### Supplements

```
GET    /api/health/supplements             — list definitions (active/all)
POST   /api/health/supplements             — create supplement
PUT    /api/health/supplements/[id]        — edit (name, dosage, active)
DELETE /api/health/supplements/[id]        — soft delete

GET    /api/health/supplement-logs         — get logs (date range filter)
POST   /api/health/supplement-logs         — log taken {date, timeOfDay?, supplementIds[]}
PUT    /api/health/supplement-logs/[id]    — edit log (date, timeOfDay)
DELETE /api/health/supplement-logs/[id]    — hard delete

GET    /api/health/supplement-presets      — list presets with items
POST   /api/health/supplement-presets      — create preset
PUT    /api/health/supplement-presets/[id] — edit preset (name, items)
DELETE /api/health/supplement-presets/[id] — soft delete
```

POST /api/health/supplement-logs uses INSERT ... ON CONFLICT DO NOTHING
(idempotent — tapping twice is safe). Only applies when time_of_day is
non-null (the unique index excludes null time_of_day).

---

## Phase 5: Frontend — Navigation + Health Landing

### Navigation changes

**Home page** (`/gustavo/page.tsx`):
- Add "Health" app card alongside "Trips"

**Side drawer** (`app/components/nav-drawer.tsx`):
- Add "Health" section with sub-links: Exercise, Supplements

**Back button logic** (header):
- `/gustavo/health/exercise` → `/gustavo/health`
- `/gustavo/health/supplements` → `/gustavo/health`
- `/gustavo/health` → `/gustavo`

### Health landing page (`/gustavo/health/page.tsx`)

Two sections:

**"Days Since Last Workout"**
- List of group-level muscles, each showing "X days" or "Never"
- Color-coded: green (≤3 days), yellow (4-6 days), red (7+ days)
- Sorted by most days since (most neglected first)

**"Today's Supplements"**
- All active supplements as tappable chips/checkboxes
- Already-logged ones for today show as checked
- Tapping unchecked logs it; tapping checked removes the log
- Time of day selector (morning/afternoon/night) — optional
- Presets shown as quick-add buttons

---

## Phase 6: Frontend — Exercise

### Exercise page (`/gustavo/health/exercise/page.tsx`)

**Workout history list:**
- Most recent first
- Each row: date, muscle group chips, optional notes
- Row actions: edit, delete
- Date range filter (default: last 30 days)

**Add workout (FAB → dialog):**
- Date picker (defaults to today)
- Muscle group selector:
  - Groups shown as large tappable chips (ordered by push/pull/legs)
  - Tapping a group selects it; reveals targets beneath
  - Selecting a target auto-selects parent group(s)
- Optional notes text field
- "Duplicate Last" button — pre-fills from most recent workout

**Edit workout (same dialog, pre-filled)**

---

## Phase 7: Frontend — Supplements

### Supplement management (`/gustavo/health/supplements/page.tsx`)

**Active supplements list:**
- Each showing name, dosage
- Inline edit/delete (same pattern as settings/categories)
- Toggle active/inactive
- Add new supplement form

**Preset management:**
- List of presets, expandable to show supplements
- Add/edit/delete presets
- Assign supplements via multi-select

**Supplement log history:**
- List view showing what was taken each day
- Filterable by supplement, time of day, date range

---

## Future Phases (not in scope now)

- Workout templates (save/load muscle group presets)
- Exercise database (individual exercises with muscle group mappings)
- Sets/reps/weight tracking per exercise
- Exercise modality (hypertrophy, explosive, corrective, balance, metabolic)
- Apple Health integration (Shortcuts automation)
- General health journal (sleep, energy, weight, symptoms)
- Visualizations (muscle group heatmap, workout frequency calendar)
- PR tracking and celebration
- Quick-log API (Shortcuts / Stream Deck / NFC)
- Weekly digest
- Orphan workout warning (targets without corresponding group)
- Customizable bottom nav

---

## Implementation Order

1. Migration 00021 (exercise tables + muscle groups seed) — run locally + Neon
2. Migration 00022 (supplement tables) — run locally + Neon
3. Muscle group constants in code (`lib/health/muscle-groups.ts`)
4. TypeScript types (`lib/health-types.ts`)
5. Exercise API routes
6. Supplement API routes
7. Navigation changes (home card, side drawer, back button)
8. Health landing page (days since + today's supplements)
9. Exercise page (history + add/edit/duplicate)
10. Supplement management page (CRUD + presets + log history)
