-- Migration 00021: create_exercise_tables
-- Created: 2026-03-14
-- Creates muscle_groups (seed-only reference table), muscle_group_parents
-- (child→parent hierarchy), workouts, and workout_muscle_groups.
-- Part of the Health App feature (exercise tracking).

-- 1. Muscle groups (flat reference table, seed-only, no CRUD UI)
-- Group vs target is implicit: groups have no rows as child in muscle_group_parents.
CREATE TABLE muscle_groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Parent mappings (target → group, many-to-many)
-- A target can belong to multiple groups (e.g. Rear Delts → Shoulders + Back).
CREATE TABLE muscle_group_parents (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    child_id    BIGINT NOT NULL REFERENCES muscle_groups(id),
    parent_id   BIGINT NOT NULL REFERENCES muscle_groups(id),
    UNIQUE(child_id, parent_id)
);

CREATE INDEX idx_muscle_group_parents_child ON muscle_group_parents (child_id);
CREATE INDEX idx_muscle_group_parents_parent ON muscle_group_parents (parent_id);

-- 3. Workouts (one row per session, multiple sessions per day supported)
CREATE TABLE workouts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    date        DATE NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_workouts_user_id ON workouts (user_id);
CREATE INDEX idx_workouts_user_date ON workouts (user_id, date);
CREATE INDEX idx_workouts_deleted_at ON workouts (deleted_at) WHERE deleted_at IS NULL;

-- 4. Workout ↔ muscle group junction
CREATE TABLE workout_muscle_groups (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workout_id      BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    muscle_group_id BIGINT NOT NULL REFERENCES muscle_groups(id),
    UNIQUE(workout_id, muscle_group_id)
);

CREATE INDEX idx_workout_muscle_groups_workout ON workout_muscle_groups (workout_id);
CREATE INDEX idx_workout_muscle_groups_muscle ON workout_muscle_groups (muscle_group_id);

-- 5. Triggers

-- updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON muscle_groups FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON muscle_group_parents FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON workouts FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON workout_muscle_groups FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 6. Seed muscle groups

-- Groups (top-level)
INSERT INTO muscle_groups (name) VALUES
    ('Chest'),
    ('Back'),
    ('Shoulders'),
    ('Biceps'),
    ('Triceps'),
    ('Forearms'),
    ('Legs'),
    ('Core'),
    ('Cardio');

-- Targets (specific muscles)
INSERT INTO muscle_groups (name) VALUES
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

-- 7. Parent mappings (target → group)
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
