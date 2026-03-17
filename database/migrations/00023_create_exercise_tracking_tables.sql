-- Migration 00023: Exercise tracking tables
-- Adds exercises (user-defined exercise library), exercise-muscle group mappings,
-- workout-exercise associations, and per-set weight/reps tracking.

-- exercises: user-defined exercise library
CREATE TABLE exercises (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    name            TEXT NOT NULL,
    is_bodyweight   BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- Unique name per user (among non-deleted)
CREATE UNIQUE INDEX idx_exercises_user_name ON exercises (user_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_exercises_user ON exercises (user_id);

-- exercise → muscle group mapping
CREATE TABLE exercise_muscle_groups (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exercise_id     BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_group_id BIGINT NOT NULL REFERENCES muscle_groups(id),
    UNIQUE(exercise_id, muscle_group_id)
);
CREATE INDEX idx_exercise_muscle_groups_exercise ON exercise_muscle_groups (exercise_id);
CREATE INDEX idx_exercise_muscle_groups_muscle ON exercise_muscle_groups (muscle_group_id);

-- exercises performed in a workout
CREATE TABLE workout_exercises (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workout_id      BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id     BIGINT NOT NULL REFERENCES exercises(id),
    sort_order      INT NOT NULL DEFAULT 0,
    weight_lbs      NUMERIC,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id);
CREATE INDEX idx_workout_exercises_exercise ON workout_exercises (exercise_id);

-- individual sets within a workout exercise (reps only, weight lives on workout_exercises)
CREATE TABLE workout_exercise_sets (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workout_exercise_id BIGINT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number          INT NOT NULL,
    reps                INT,
    UNIQUE(workout_exercise_id, set_number)
);
CREATE INDEX idx_workout_exercise_sets_we ON workout_exercise_sets (workout_exercise_id);

-- updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- audit triggers
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON exercises FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON exercise_muscle_groups FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON workout_exercises FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON workout_exercise_sets FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
