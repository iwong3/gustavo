-- Migration 00009: add_audit_log
-- Created: 2026-03-05
-- Single audit_log table with generic trigger function.
-- Captures INSERT/UPDATE/DELETE on all tables with full row snapshots.
-- Application user attribution via SET LOCAL audit.changed_by.

-- 1. Audit table
CREATE TABLE audit_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name  TEXT NOT NULL,
    record_id   BIGINT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data    JSONB,
    new_data    JSONB,
    changed_by  BIGINT REFERENCES users(id),
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log (changed_at);

-- 2. Generic trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    _changed_by BIGINT;
    _record_id  BIGINT;
    _old_data   JSONB;
    _new_data   JSONB;
BEGIN
    -- Get application user from session variable (NULL if not set, e.g. migrations)
    BEGIN
        _changed_by := current_setting('audit.changed_by', true)::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        _changed_by := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        _record_id := NEW.id;
        _new_data  := to_jsonb(NEW);
        _old_data  := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Skip no-op updates
        IF OLD = NEW THEN RETURN NEW; END IF;
        _record_id := NEW.id;
        _old_data  := to_jsonb(OLD);
        _new_data  := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        _record_id := OLD.id;
        _old_data  := to_jsonb(OLD);
        _new_data  := NULL;
    END IF;

    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, _record_id, TG_OP, _old_data, _new_data, _changed_by);

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to all existing tables
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON trips FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON trip_participants FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON locations FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON expenses FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON expense_participants FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
