-- Migration 00028: Diet tracking tables
-- Created: 2026-03-21
--
-- Tables: foods, meal_groups, food_logs
-- Extends presets table with 'diet' type + meal_label column + preset_foods junction

-- ── Food library ──────────────────────────────────────────────────────────────

CREATE TABLE foods (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

-- Unique name per user (among non-deleted), case-insensitive
CREATE UNIQUE INDEX idx_foods_user_name
    ON foods (user_id, lower(name)) WHERE deleted_at IS NULL;

CREATE INDEX idx_foods_user ON foods (user_id);
CREATE INDEX idx_foods_active
    ON foods (user_id, is_active) WHERE deleted_at IS NULL;

-- ── Meal groups (optional day-level grouping) ─────────────────────────────────

CREATE TABLE meal_groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    date        DATE NOT NULL,
    label       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ
);

-- One label per user per day (case-insensitive)
CREATE UNIQUE INDEX idx_meal_groups_user_date_label
    ON meal_groups (user_id, date, lower(label));

CREATE INDEX idx_meal_groups_user_date ON meal_groups (user_id, date);

-- ── Food logs ─────────────────────────────────────────────────────────────────

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

-- Prevent duplicate food in same meal group on same day
CREATE UNIQUE INDEX idx_food_logs_grouped
    ON food_logs (user_id, food_id, date, meal_group_id)
    WHERE meal_group_id IS NOT NULL;

-- Prevent duplicate standalone food on same day
CREATE UNIQUE INDEX idx_food_logs_standalone
    ON food_logs (user_id, food_id, date)
    WHERE meal_group_id IS NULL;

CREATE INDEX idx_food_logs_user_date ON food_logs (user_id, date);
CREATE INDEX idx_food_logs_food ON food_logs (food_id);
CREATE INDEX idx_food_logs_meal_group ON food_logs (meal_group_id);

-- ── Extend presets for diet ───────────────────────────────────────────────────

-- Add meal_label column (only used by diet presets)
ALTER TABLE presets
    ADD COLUMN meal_label TEXT;

-- Diet preset items (food + quantity)
CREATE TABLE preset_foods (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    preset_id   BIGINT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    food_id     BIGINT NOT NULL REFERENCES foods(id),
    quantity    INTEGER NOT NULL DEFAULT 1,
    UNIQUE(preset_id, food_id)
);

CREATE INDEX idx_preset_foods_preset ON preset_foods (preset_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER set_foods_updated_at
    BEFORE UPDATE ON foods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_meal_groups_updated_at
    BEFORE UPDATE ON meal_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_food_logs_updated_at
    BEFORE UPDATE ON food_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit triggers
CREATE TRIGGER audit_foods
    AFTER INSERT OR UPDATE OR DELETE ON foods
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_meal_groups
    AFTER INSERT OR UPDATE OR DELETE ON meal_groups
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_food_logs
    AFTER INSERT OR UPDATE OR DELETE ON food_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_preset_foods
    AFTER INSERT OR UPDATE OR DELETE ON preset_foods
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
