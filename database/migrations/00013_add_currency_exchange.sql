-- Migration 00013: add_currency_exchange
-- Created: 2026-03-07
-- Adds slug to expense_categories for system categories,
-- adds local_currency_received to expenses for currency exchange tracking.

-- 1. Add slug column to expense_categories (nullable, unique for system categories)
ALTER TABLE expense_categories
  ADD COLUMN slug TEXT UNIQUE;

-- 2. Insert system "Currency Exchange" category (no created_by = system-owned)
INSERT INTO expense_categories (name, slug)
VALUES ('Currency Exchange', 'currency_exchange');

-- 3. Add local_currency_received to expenses (only populated for currency exchange expenses)
ALTER TABLE expenses
  ADD COLUMN local_currency_received NUMERIC(12, 2);
