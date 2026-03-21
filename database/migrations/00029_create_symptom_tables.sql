-- Migration 00029: Symptom tracking tables
-- Created: 2026-03-21
--
-- Tables: symptoms, symptom_logs

-- ── Symptom library ───────────────────────────────────────────────────────────

CREATE TABLE symptoms (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

-- Unique name per user (among non-deleted), case-insensitive
CREATE UNIQUE INDEX idx_symptoms_user_name
    ON symptoms (user_id, lower(name)) WHERE deleted_at IS NULL;

CREATE INDEX idx_symptoms_user ON symptoms (user_id);
CREATE INDEX idx_symptoms_active
    ON symptoms (user_id, is_active) WHERE deleted_at IS NULL;

-- ── Symptom logs ──────────────────────────────────────────────────────────────

CREATE TABLE symptom_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    symptom_id      BIGINT NOT NULL REFERENCES symptoms(id),
    date            DATE NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

-- One log per symptom per day per user
CREATE UNIQUE INDEX idx_symptom_logs_unique
    ON symptom_logs (user_id, symptom_id, date);

CREATE INDEX idx_symptom_logs_user_date ON symptom_logs (user_id, date);
CREATE INDEX idx_symptom_logs_symptom ON symptom_logs (symptom_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER set_symptoms_updated_at
    BEFORE UPDATE ON symptoms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_symptom_logs_updated_at
    BEFORE UPDATE ON symptom_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit triggers
CREATE TRIGGER audit_symptoms
    AFTER INSERT OR UPDATE OR DELETE ON symptoms
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_symptom_logs
    AFTER INSERT OR UPDATE OR DELETE ON symptom_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
