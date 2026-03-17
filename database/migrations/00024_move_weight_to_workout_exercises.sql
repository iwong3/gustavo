-- Migration 00024: Move weight_lbs from workout_exercise_sets to workout_exercises
-- Weight is a property of an exercise within a workout session, not per-set.
-- Sets only track reps.

-- Step 1: Add weight_lbs column to workout_exercises (if not already present)
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC;

-- Step 2: Migrate existing data — take the max weight from sets for each workout_exercise
-- (no-op if workout_exercise_sets.weight_lbs doesn't exist, i.e. prod where 00023 was already correct)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workout_exercise_sets' AND column_name = 'weight_lbs'
    ) THEN
        UPDATE workout_exercises we
        SET weight_lbs = sub.max_weight
        FROM (
            SELECT workout_exercise_id, MAX(weight_lbs) AS max_weight
            FROM workout_exercise_sets
            WHERE weight_lbs IS NOT NULL
            GROUP BY workout_exercise_id
        ) sub
        WHERE we.id = sub.workout_exercise_id;

        ALTER TABLE workout_exercise_sets DROP COLUMN weight_lbs;
    END IF;
END $$;
