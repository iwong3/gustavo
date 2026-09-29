-- Migration 00044: one_workout_per_day
-- Created: 2026-09-28
--
-- A day has at most one workout. Logging a routine (or saving the new-workout
-- form) on a day that already has one adds to it instead of creating a second
-- (lib/health/workout-day.ts). The Workouts page shows one row per day, and
-- "days since previous" badges count days, not sessions.
--
-- Merge: for each (user, date) with several live workouts, the earliest one
-- keeps the day. It takes the others' muscle groups and exercises (appended
-- after its own), their notes are joined in, and the others are soft-deleted
-- (restorable). Then a partial unique index makes the rule hold, so two quick
-- taps can't race a second workout into existence.

CREATE TEMP TABLE workout_merge AS
SELECT id, keep_id
FROM (
    SELECT id,
           first_value(id) OVER (PARTITION BY user_id, date ORDER BY created_at, id) AS keep_id
    FROM workouts
    WHERE deleted_at IS NULL
) ranked
WHERE id <> keep_id;

INSERT INTO workout_muscle_groups (workout_id, muscle_group_id)
SELECT m.keep_id, wmg.muscle_group_id
FROM workout_merge m
JOIN workout_muscle_groups wmg ON wmg.workout_id = m.id
ON CONFLICT (workout_id, muscle_group_id) DO NOTHING;

UPDATE workout_exercises we
SET workout_id = m.keep_id,
    sort_order = we.sort_order + 1000 * (1 + (SELECT count(*) FROM workout_merge m2
                                             WHERE m2.keep_id = m.keep_id AND m2.id < m.id))
FROM workout_merge m
WHERE we.workout_id = m.id;

UPDATE workouts k
SET notes = concat_ws(E'\n\n', NULLIF(k.notes, ''), agg.notes)
FROM (
    SELECT m.keep_id, string_agg(w.notes, E'\n\n' ORDER BY w.created_at) AS notes
    FROM workout_merge m
    JOIN workouts w ON w.id = m.id
    WHERE w.notes IS NOT NULL AND w.notes <> ''
    GROUP BY m.keep_id
) agg
WHERE k.id = agg.keep_id;

UPDATE workouts w
SET deleted_at = now()
FROM workout_merge m
WHERE w.id = m.id;

DROP TABLE workout_merge;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workouts_user_date
    ON workouts (user_id, date)
    WHERE deleted_at IS NULL;
