-- Migration 00010: add_expense_categories
-- Created: 2026-03-05
-- Creates expense_categories table, migrates expenses.category TEXT → FK,
-- and attaches audit trigger.

-- 1. Create expense_categories table
CREATE TABLE expense_categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_expense_categories_deleted_at ON expense_categories (id)
    WHERE deleted_at IS NULL;

-- 2. Seed from existing expense category values
INSERT INTO expense_categories (name)
SELECT DISTINCT category FROM expenses
WHERE category IS NOT NULL AND deleted_at IS NULL
ORDER BY category;

-- 3. Add FK column to expenses
ALTER TABLE expenses ADD COLUMN category_id BIGINT REFERENCES expense_categories(id);

-- 4. Backfill from text
UPDATE expenses SET category_id = c.id
FROM expense_categories c WHERE expenses.category = c.name;

-- 5. Drop old text column
ALTER TABLE expenses DROP COLUMN category;

-- 6. Index for expense category lookups
CREATE INDEX idx_expenses_category_id ON expenses (category_id)
    WHERE category_id IS NOT NULL;

-- 7. Attach audit trigger
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
    ON expense_categories FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
