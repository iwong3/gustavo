-- Migration 00034: Weight logging
-- Created: 2026-04-09
--
-- Tables: weight_logs

CREATE TABLE weight_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    date        DATE NOT NULL,
    weight_lbs  NUMERIC(5,1) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_weight_logs_user_date ON weight_logs (user_id, date DESC);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER set_weight_logs_updated_at
    BEFORE UPDATE ON weight_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_weight_logs
    AFTER INSERT OR UPDATE OR DELETE ON weight_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
