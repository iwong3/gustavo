# Plan: Diet & Symptom Tracking

## Overview

Add diet and symptom tracking to the Health app. Two new pages following
existing patterns (supplements-style UI). The killer feature is the **symptom
forensic view** — tap a symptom day to see diet, supplements, and workouts for
the surrounding days, plus pattern detection across all occurrences of that
symptom.

Single-user (Ivan only). Same auth pattern as other health features.

---

## Design Decisions

### Diet

- **Food library**: flat list, name only (no categories, no macros/calories)
- **Logging unit**: a **day** (row in the log list = one day)
- **Within a day**: individual food items + optional **meal groups**
- **Meal group**: a set of foods with a label (e.g. "Chipotle"). Visual grouping
  only — standalone foods have no label.
- **Quantity**: integer per food item, defaults to 1, tap to adjust
- **Presets**: saved sets of foods with an optional meal label
    - With meal label (e.g. "Chipotle"): applies foods as a meal group
    - Without meal label (e.g. "Daily Basics"): applies foods as standalone
      items
    - Applying a preset with a meal label to a day that already has that label →
      merges (adds missing foods, bumps quantities on existing)
    - Applying a preset without a meal label → always adds foods as standalone
- **Day row display**:
  `Oatmeal · Bread · Greek Yogurt · Chipotle (Rice, Beans, Chicken)` —
  standalone items listed individually, meal groups show label + contents

### Symptoms

- **Symptom library**: user-managed CRUD, name only (no severity)
- **Logging**: pick a date, select symptoms, optional notes per log entry
- **Day row display**: similar to diet/supplements
- **Forensic view** (tap a symptom day):
    - Shows diet + supplements + workouts for that day and the prior 3 days
    - Shows other dates the same symptom was logged
    - For each past occurrence, shows the 3-day lookback data
    - **Common factors highlight**: foods that appear across multiple
      occurrences of the same symptom are surfaced (stretch goal for v1, but
      schema supports it)

---

## Phase 1: Schema + Migrations

### Migration 00028: Diet tables

```sql
-- Food library (user-defined items)
CREATE TABLE foods (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

-- Unique name per user (among non-deleted)
CREATE UNIQUE INDEX idx_foods_user_name
    ON foods (user_id, lower(name)) WHERE deleted_at IS NULL;

-- Meal groups within a day (optional grouping)
CREATE TABLE meal_groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    date        DATE NOT NULL,
    label       TEXT NOT NULL,                  -- e.g. 'Chipotle'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);

-- One label per user per day
CREATE UNIQUE INDEX idx_meal_groups_user_date_label
    ON meal_groups (user_id, date, lower(label));

-- Food logs (what was eaten on a given day)
CREATE TABLE food_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    food_id         BIGINT NOT NULL REFERENCES foods(id),
    date            DATE NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1,
    meal_group_id   BIGINT REFERENCES meal_groups(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

-- Prevent duplicate food on same day in same meal group (or standalone)
-- Two separate indexes: one for grouped, one for standalone
CREATE UNIQUE INDEX idx_food_logs_grouped
    ON food_logs (user_id, food_id, date, meal_group_id)
    WHERE meal_group_id IS NOT NULL;
CREATE UNIQUE INDEX idx_food_logs_standalone
    ON food_logs (user_id, food_id, date)
    WHERE meal_group_id IS NULL;

-- Diet presets
CREATE TABLE diet_presets (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,                   -- display name in preset list
    meal_label  TEXT,                            -- NULL = standalone, non-NULL = creates meal group
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE diet_preset_items (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    preset_id   BIGINT NOT NULL REFERENCES diet_presets(id) ON DELETE CASCADE,
    food_id     BIGINT NOT NULL REFERENCES foods(id),
    quantity    INTEGER NOT NULL DEFAULT 1,
    UNIQUE(preset_id, food_id)
);

-- Indexes
CREATE INDEX idx_foods_user ON foods (user_id);
CREATE INDEX idx_foods_active ON foods (user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_meal_groups_user_date ON meal_groups (user_id, date);
CREATE INDEX idx_food_logs_user_date ON food_logs (user_id, date);
CREATE INDEX idx_food_logs_food ON food_logs (food_id);
CREATE INDEX idx_food_logs_meal_group ON food_logs (meal_group_id);
CREATE INDEX idx_diet_presets_user ON diet_presets (user_id);

-- updated_at triggers
CREATE TRIGGER set_foods_updated_at
    BEFORE UPDATE ON foods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_meal_groups_updated_at
    BEFORE UPDATE ON meal_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_food_logs_updated_at
    BEFORE UPDATE ON food_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_diet_presets_updated_at
    BEFORE UPDATE ON diet_presets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit triggers
CREATE TRIGGER audit_foods
    AFTER INSERT OR UPDATE OR DELETE ON foods
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_meal_groups
    AFTER INSERT OR UPDATE OR DELETE ON meal_groups
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_food_logs
    AFTER INSERT OR UPDATE OR DELETE ON food_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_diet_presets
    AFTER INSERT OR UPDATE OR DELETE ON diet_presets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_diet_preset_items
    AFTER INSERT OR UPDATE OR DELETE ON diet_preset_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### Migration 00029: Symptom tables

```sql
-- Symptom library (user-defined)
CREATE TABLE symptoms (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_symptoms_user_name
    ON symptoms (user_id, lower(name)) WHERE deleted_at IS NULL;

-- Symptom logs
CREATE TABLE symptom_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    symptom_id      BIGINT NOT NULL REFERENCES symptoms(id),
    date            DATE NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

-- One log per symptom per day
CREATE UNIQUE INDEX idx_symptom_logs_unique
    ON symptom_logs (user_id, symptom_id, date);

-- Indexes
CREATE INDEX idx_symptoms_user ON symptoms (user_id);
CREATE INDEX idx_symptoms_active ON symptoms (user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_symptom_logs_user_date ON symptom_logs (user_id, date);
CREATE INDEX idx_symptom_logs_symptom ON symptom_logs (symptom_id);

-- updated_at triggers
CREATE TRIGGER set_symptoms_updated_at
    BEFORE UPDATE ON symptoms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_symptom_logs_updated_at
    BEFORE UPDATE ON symptom_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit triggers
CREATE TRIGGER audit_symptoms
    AFTER INSERT OR UPDATE OR DELETE ON symptoms
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_symptom_logs
    AFTER INSERT OR UPDATE OR DELETE ON symptom_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Phase 2: TypeScript Types

Add to `lib/health-types.ts`:

```typescript
// --- Diet ---

export type Food = {
    id: number
    name: string
    isActive: boolean
}

export type MealGroup = {
    id: number
    label: string
    foods: FoodLogEntry[]
}

export type FoodLogEntry = {
    id: number // food_logs.id
    food: Food
    quantity: number
    mealGroupId: number | null
}

export type DietDay = {
    date: string
    standaloneFoods: FoodLogEntry[] // meal_group_id IS NULL
    mealGroups: MealGroup[] // grouped by meal_group
}

export type DietPreset = {
    id: number
    name: string
    mealLabel: string | null // NULL = standalone, non-NULL = creates meal group
    items: DietPresetItem[]
}

export type DietPresetItem = {
    foodId: number
    foodName: string
    quantity: number
}

// --- Symptoms ---

export type Symptom = {
    id: number
    name: string
    isActive: boolean
}

export type SymptomLog = {
    id: number
    symptomId: number
    symptomName: string
    date: string
    notes: string | null
    createdAt: string
}

// --- Forensic View ---

export type DaySnapshot = {
    date: string
    foods: FoodLogEntry[]
    mealGroups: MealGroup[]
    supplements: { name: string; quantity: number }[]
    workout: { muscleGroups: string[]; notes: string | null } | null
}

export type SymptomForensicView = {
    symptomName: string
    currentDate: string
    lookback: DaySnapshot[] // current day + 3 prior days
    pastOccurrences: {
        date: string
        notes: string | null
        lookback: DaySnapshot[] // that day + 3 prior days
    }[]
    commonFoods: {
        // foods appearing in 2+ occurrence windows
        foodName: string
        occurrenceCount: number // how many symptom windows included this food
        totalOccurrences: number // total symptom occurrences (denominator)
    }[]
}
```

---

## Phase 3: API Routes

### Diet

```
GET    /api/health/foods                    — list food library (active/all)
POST   /api/health/foods                    — create food {name}
PUT    /api/health/foods/[id]               — edit food (name, isActive)
DELETE /api/health/foods/[id]               — soft delete

GET    /api/health/food-logs                — get daily logs (date range filter)
POST   /api/health/food-logs                — log food {date, foodId, quantity?, mealLabel?}
PUT    /api/health/food-logs/[id]           — edit (quantity, meal group)
DELETE /api/health/food-logs/[id]           — hard delete

POST   /api/health/diet-presets/[id]/apply  — apply preset to date
GET    /api/health/diet-presets             — list presets with items
POST   /api/health/diet-presets             — create preset {name, mealLabel?, items[]}
PUT    /api/health/diet-presets/[id]        — edit preset
DELETE /api/health/diet-presets/[id]        — soft delete
PUT    /api/health/diet-presets/reorder     — reorder presets
```

**POST /api/health/food-logs** behavior:

- If `mealLabel` is provided, find or create a `meal_groups` row for (user,
  date, label), then insert food_log with that meal_group_id
- If no `mealLabel`, insert with `meal_group_id = NULL`

**POST /api/health/diet-presets/[id]/apply** behavior:

- If preset has `meal_label`: find or create meal_group for (user, date, label).
  For each preset item, UPSERT into food_logs — if food already exists in that
  meal group, update quantity; otherwise insert.
- If preset has no `meal_label`: insert each food as standalone. If food already
  logged standalone for that date, bump quantity.

### Symptoms

```
GET    /api/health/symptoms                 — list symptom library (active/all)
POST   /api/health/symptoms                 — create symptom {name}
PUT    /api/health/symptoms/[id]            — edit (name, isActive)
DELETE /api/health/symptoms/[id]            — soft delete

GET    /api/health/symptom-logs             — get logs (date range filter)
POST   /api/health/symptom-logs             — log symptom {date, symptomId, notes?}
PUT    /api/health/symptom-logs/[id]        — edit (notes)
DELETE /api/health/symptom-logs/[id]        — hard delete

GET    /api/health/symptom-logs/[id]/forensic — forensic view for a symptom log
```

**GET /api/health/symptom-logs/[id]/forensic** behavior:

1. Get the symptom log (date + symptom_id)
2. Fetch diet, supplements, workouts for `[date-3, date]`
3. Find all other logs of the same symptom_id
4. For each past occurrence, fetch the same 4-day window
5. Compute common foods across all occurrence windows
6. Return `SymptomForensicView`

---

## Phase 4: Frontend — Diet Page

### `/gustavo/health/diet/page.tsx`

Follows supplements page pattern (unified drawer, FAB, swipeable rows).

**Main view:**

- Day rows (most recent first), each showing food summary
- Standalone foods shown as `Food1 · Food2 · Food3`
- Meal groups shown as `Label (Food1, Food2)`
- Tap day row → expand or open detail view

**Day detail view:**

- Standalone foods listed individually (swipe to delete)
- Meal groups shown as bordered cards with label header
- Each food shows quantity (if > 1)
- Edit quantity inline, remove individual foods

**Log drawer (FAB → open):**

- Date picker (defaults to today)
- Food search/select from library (checklist with quantity +/- buttons)
- Optional meal label text field
- Preset quick-action buttons at top
- "Manage" mode toggle for food library CRUD

**Preset drawer:**

- List presets with drag-to-reorder
- Create/edit: name, optional meal label, multi-select foods with quantities
- Delete presets

### Navigation changes

- Health landing page: add "Diet" tool card
- Side drawer: add "Diet" sub-link under Health
- Back button: `/gustavo/health/diet` → `/gustavo/health`

---

## Phase 5: Frontend — Symptoms Page

### `/gustavo/health/symptoms/page.tsx`

**Main view:**

- Day rows showing logged symptoms
- Each row: date, symptom chips, notes preview (truncated)
- Tap day row → opens day detail

**Day detail view:**

- List of symptoms logged that day, each with notes
- Tap a symptom → opens **forensic view**

**Forensic view (drawer or full-screen):**

- Header: symptom name + date
- **Lookback section**: 4 cards (today + 3 prior days), each showing:
    - Diet (standalone foods + meal groups)
    - Supplements taken
    - Workout (muscle groups)
- **Past occurrences section**: list of other dates with this symptom
    - Each expandable to show its own 4-day lookback
- **Common factors** (if 2+ occurrences): highlighted banner showing foods that
  appeared in multiple symptom windows, sorted by frequency

**Log drawer (FAB → open):**

- Date picker (defaults to today)
- Symptom checklist from library
- Notes text field per symptom
- "Manage" mode toggle for symptom library CRUD

### Navigation changes

- Health landing page: add "Symptoms" tool card
- Side drawer: add "Symptoms" sub-link under Health
- Back button: `/gustavo/health/symptoms` → `/gustavo/health`

---

## Implementation Order

1. Migration 00028 (diet tables) — run locally + Neon
2. Migration 00029 (symptom tables) — run locally + Neon
3. TypeScript types in `lib/health-types.ts`
4. Diet API routes (foods CRUD, food-logs, diet-presets, apply)
5. Symptom API routes (symptoms CRUD, symptom-logs, forensic)
6. Diet page (food library, logging, day view, presets)
7. Symptoms page (symptom library, logging, day view)
8. Forensic view (lookback, past occurrences, common factors)
9. Navigation updates (landing page cards, side drawer, back buttons)

---

## Future Enhancements (not in v1)

- Food categories/tags for richer pattern detection
- Meal timing (breakfast/lunch/dinner/snack)
- Severity scale for symptoms
- Auto-suggest foods based on recent logs
- Symptom trend charts over time
- Correlation score (statistical significance of food → symptom link)
- Photo logging for meals
- Barcode/nutrition API integration
