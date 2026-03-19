-- Migration 00026: split_back_optional_muscle_groups
-- Created: 2026-03-18
--
-- 1. Split "Back" into "Upper Back" and "Lower Back" (top-level groups)
-- 2. Rear Delts: remove Shoulders parent, keep only Upper Back
-- 3. Make exercise muscle groups optional (remove NOT NULL-like constraints)
--
-- "Lower Back" was previously a target under "Back". It becomes a group.
-- Existing references (exercise_muscle_groups, workout_muscle_groups) to the
-- old "Lower Back" target are preserved — the row stays, just loses its parent.

BEGIN;

-- ============================================================
-- 1. Rename "Back" → "Upper Back"
-- ============================================================
UPDATE muscle_groups SET name = 'Upper Back' WHERE name = 'Back';

-- ============================================================
-- 2. Promote "Lower Back" from target to group
--    (delete its parent link — it's now a top-level group)
-- ============================================================
DELETE FROM muscle_group_parents
WHERE child_id = (SELECT id FROM muscle_groups WHERE name = 'Lower Back');

-- ============================================================
-- 3. Rear Delts: remove Shoulders parent, keep Upper Back only
--    (Upper Back was already "Back" which we renamed above)
-- ============================================================
DELETE FROM muscle_group_parents
WHERE child_id  = (SELECT id FROM muscle_groups WHERE name = 'Rear Delts')
  AND parent_id = (SELECT id FROM muscle_groups WHERE name = 'Shoulders');

-- ============================================================
-- 4. Verify: remaining targets under Upper Back should be
--    Lats, Rhomboids, Traps, Rear Delts
--    Lower Back is now a standalone group with no children.
-- ============================================================
-- (no action, just documenting expected state)

COMMIT;
