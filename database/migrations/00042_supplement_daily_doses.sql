-- Migration 00042: supplement_daily_doses
-- Created: 2026-09-27
--
-- The daily supplement stack for the home page's check-off card: how many
-- doses of a supplement you take per day (fish oil 2×, electrolytes 3×).
-- NULL = not in the daily stack (it still exists for ad-hoc logging).
-- A day's progress is the existing supplement_logs.quantity (one row per
-- supplement per day), so no new table is needed.

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS daily_doses INT;

ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_daily_doses_positive;
ALTER TABLE supplements
    ADD CONSTRAINT supplements_daily_doses_positive CHECK (daily_doses IS NULL OR daily_doses > 0);
