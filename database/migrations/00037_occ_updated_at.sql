-- Migration 00037: optimistic_concurrency_updated_at
-- Created: 2026-04-26
-- Adds updated_at to expense_categories and a trigger that bumps
-- expenses.updated_at when expense_participants change. This makes
-- expenses + their participants behave as one aggregate for OCC purposes.

-- 1. Add updated_at to expense_categories + trigger
ALTER TABLE expense_categories
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER trg_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Trigger function: bump parent expenses.updated_at when participants change
CREATE OR REPLACE FUNCTION bump_expense_updated_at()
RETURNS TRIGGER AS $$
DECLARE
    target_expense_id BIGINT;
BEGIN
    target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);
    UPDATE expenses SET updated_at = NOW() WHERE id = target_expense_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_participants_bump_parent
    AFTER INSERT OR UPDATE OR DELETE ON expense_participants
    FOR EACH ROW EXECUTE FUNCTION bump_expense_updated_at();
