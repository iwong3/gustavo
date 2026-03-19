# Plan: Muscle Group Refinements + Exercise Improvements

## Overview

Three changes to the health app based on real usage pain points:

1. **Split "Back" into "Upper Back" and "Lower Back"** — Deadlifts were resetting the Back counter even though they're leg day
2. **Make exercise muscle groups optional** — Farmer's Carry hits too many groups to tag meaningfully; untagged exercises simply don't auto-populate workout muscle groups
3. **Fix bodyweight + weight display** — Weighted pull-ups show "BW" and hide the actual weight; should show "BW + 25 lbs"

---

## Phase 1: Split Back → Upper Back + Lower Back (migration 00026)

### DB Changes

Migration that:
1. Rename the "Back" muscle group to "Upper Back" (`UPDATE muscle_groups SET name = 'Upper Back' WHERE name = 'Back'`)
2. Insert a new "Lower Back" group (`INSERT INTO muscle_groups (name)`)
3. Remove the old "Lower Back" target's parent link (`DELETE FROM muscle_group_parents WHERE child_id = <old Lower Back target>`)
4. Delete the old "Lower Back" target row (it's now redundant — "Lower Back" is a group)
   - First, migrate any references: `exercise_muscle_groups`, `workout_muscle_groups` rows pointing to the old "Lower Back" target → point to the new "Lower Back" group
5. Move "Rear Delts" parent from old Back/Shoulders dual-parent to Upper Back only:
   - `DELETE FROM muscle_group_parents WHERE child_id = <Rear Delts> AND parent_id = <Shoulders>`
   - `UPDATE muscle_group_parents SET parent_id = <Upper Back> WHERE child_id = <Rear Delts> AND parent_id = <old Back>`
   (The rename in step 1 already changed "Back" to "Upper Back", so the parent_id FK is correct)
6. Remaining targets (Lats, Rhomboids, Traps) — their parent is already "Back" which was renamed to "Upper Back". No changes needed.

### Code Changes

**`lib/health/muscle-groups.ts`:**
- `MUSCLE_GROUPS`: replace `'Back'` with `'Upper Back'`, add `'Lower Back'`
- `TARGET_PARENTS`: remove `'Lower Back'` entry (it's now a group), update `'Rear Delts'` to `['Upper Back']` only, update remaining Back targets to `['Upper Back']`
- `DISPLAY_ORDER`: replace `'Back'` with `'Upper Back'`, add `'Lower Back'` (probably after Upper Back in the Pull section)

**`app/api/health/workouts/days-since/route.ts`:** No changes needed — the query dynamically reads from `muscle_groups` and `muscle_group_parents`.

### Rollback

Reverse migration: rename "Upper Back" back to "Back", re-insert "Lower Back" as target, restore Rear Delts dual-parent.

---

## Phase 2: Make Exercise Muscle Groups Optional

### DB Changes

None — `exercise_muscle_groups` is a junction table, zero rows is already valid at the DB level.

### API Changes

**`app/api/health/exercises/route.ts` (POST):**
- Remove validation requiring `muscleGroupIds` to be a non-empty array
- Allow empty array (exercise with no muscle groups)

**`app/api/health/exercises/[id]/route.ts` (PUT):**
- Same: allow empty `muscleGroupIds` array

### UI Changes

**`app/gustavo/health/exercises/page.tsx` (Exercise library form):**
- Remove any client-side validation requiring at least one muscle group
- Maybe a subtle hint: "No muscle groups selected — this exercise won't auto-populate workout groups"

**`app/gustavo/health/exercise/page.tsx` (Workout form — exercise auto-populate):**
- The `addExercise` callback (line ~1101) already loops over `exercise.muscleGroups` — if empty, nothing gets added. No change needed.

---

## Phase 3: Fix Bodyweight + Weight Display

### Current Bug

In `workout-detail-drawer.tsx`:
- Line 348-352: `isBodyweight ? 'BW'` — always shows "BW", ignores `weightLbs`
- Line 340-343: `isBodyweight ? []` — skips weight history sparkline entirely
- Line 358-360: `!isBodyweight &&` — skips delta calculation

### Fix

**`app/components/health/workout-detail-drawer.tsx`:**

Weight display logic:
```typescript
const weightStr = we.exercise.isBodyweight
    ? we.weightLbs ? `BW + ${we.weightLbs} lbs` : 'BW'
    : we.weightLbs ? `${we.weightLbs} lbs` : null
```

History rows (line 372):
```typescript
const hWeight = we.exercise.isBodyweight
    ? h.weightLbs ? `BW + ${h.weightLbs} lbs` : 'BW'
    : h.weightLbs ? `${h.weightLbs} lbs` : null
```

Weight sparkline — enable when BW exercise has weight logged:
```typescript
const hasWeight = we.exercise.isBodyweight ? !!we.weightLbs : true
const weightPoints = useMemo(
    () => hasWeight ? getExerciseWeightHistory(...) : [],
    [...]
)
```

Delta calculation — enable for BW exercises with weight:
```typescript
const currentDelta = (we.weightLbs && history.length > 0 && history[0].weightLbs)
    ? we.weightLbs - history[0].weightLbs
    : null
```
(Simply remove the `!we.exercise.isBodyweight` guard — if there's weight data, show the delta regardless.)

Same for history row deltas (line 374).

---

## Migration Safety

- Phase 1 migration must handle existing data: any workout or exercise tagged with old "Lower Back" target gets remapped to the new "Lower Back" group
- The old "Lower Back" target ID and new "Lower Back" group ID are different rows — must update FKs before deleting the old row
- All three phases are independent and can be done in any order, but Phase 1 should go first since it's the most impactful

---

## What We're NOT Doing

- **Primary/secondary muscle group roles** — not needed now that exercise muscle groups are optional. If untagged exercises become a pain point later, revisit.
- **Exercise categories** (explosive, hypertrophy, stretches) — future feature, separate effort
- **Changes to days-since query** — it already reads from workout_muscle_groups, which is the right level
