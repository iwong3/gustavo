-- Presets / routines for workouts and supplements

-- ── Preset definitions ──────────────────────────────────────────────────────

CREATE TABLE presets (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,                     -- 'workout' | 'supplement'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

-- Unique name per user per type (among non-deleted)
CREATE UNIQUE INDEX idx_presets_user_name_type
    ON presets (user_id, name, type) WHERE deleted_at IS NULL;

CREATE INDEX idx_presets_user_type
    ON presets (user_id, type) WHERE deleted_at IS NULL;

-- ── Workout preset: muscle groups ───────────────────────────────────────────

CREATE TABLE preset_muscle_groups (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    preset_id       BIGINT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    muscle_group_id BIGINT NOT NULL REFERENCES muscle_groups(id),
    UNIQUE(preset_id, muscle_group_id)
);

CREATE INDEX idx_preset_muscle_groups_preset ON preset_muscle_groups (preset_id);

-- ── Workout preset: exercises ───────────────────────────────────────────────

CREATE TABLE preset_exercises (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    preset_id   BIGINT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    exercise_id BIGINT NOT NULL REFERENCES exercises(id),
    sort_order  INT NOT NULL DEFAULT 0,
    UNIQUE(preset_id, exercise_id)
);

CREATE INDEX idx_preset_exercises_preset ON preset_exercises (preset_id);

-- ── Supplement preset: supplements ──────────────────────────────────────────

CREATE TABLE preset_supplements (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    preset_id       BIGINT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    supplement_id   BIGINT NOT NULL REFERENCES supplements(id),
    UNIQUE(preset_id, supplement_id)
);

CREATE INDEX idx_preset_supplements_preset ON preset_supplements (preset_id);

-- ── Add quantity to supplement_logs ─────────────────────────────────────────

ALTER TABLE supplement_logs
    ADD COLUMN quantity INT NOT NULL DEFAULT 1;

-- ── Triggers ────────────────────────────────────────────────────────────────

CREATE TRIGGER set_presets_updated_at
    BEFORE UPDATE ON presets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_presets
    AFTER INSERT OR UPDATE OR DELETE ON presets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_preset_muscle_groups
    AFTER INSERT OR UPDATE OR DELETE ON preset_muscle_groups
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_preset_exercises
    AFTER INSERT OR UPDATE OR DELETE ON preset_exercises
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_preset_supplements
    AFTER INSERT OR UPDATE OR DELETE ON preset_supplements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
