-- Migration 00033: Food groups (classification tags for foods)
-- Created: 2026-04-02
--
-- Tables: food_groups, food_group_members
-- Purpose: Classify foods into user-defined groups (e.g. High FODMAP, Probiotic)
--          with colors for visual identification on diet cards.

-- ── Food groups ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS food_groups (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    color       TEXT NOT NULL,            -- hex color e.g. '#e57373'
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

-- Unique name per user (among non-deleted), case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_food_groups_user_name
    ON food_groups (user_id, lower(name)) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_food_groups_user
    ON food_groups (user_id) WHERE deleted_at IS NULL;

-- ── Food group members (many-to-many: foods ↔ food_groups) ──────────────────

CREATE TABLE IF NOT EXISTS food_group_members (
    food_group_id   BIGINT NOT NULL REFERENCES food_groups(id),
    food_id         BIGINT NOT NULL REFERENCES foods(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (food_group_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_food_group_members_food
    ON food_group_members (food_id);

-- ── Audit triggers ──────────────────────────────────────────────────────────

-- Drop first in case partial run left it
DROP TRIGGER IF EXISTS trg_food_groups_audit ON food_groups;
CREATE TRIGGER trg_food_groups_audit
    AFTER INSERT OR UPDATE OR DELETE ON food_groups
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- No audit trigger on food_group_members — composite PK (no `id` column) is
-- incompatible with audit_trigger_func() which reads NEW.id.
