-- Migration 00045: category_icon_color
-- Created: 2026-09-30
--
-- Each expense category stores its own icon + colour (Settings → Categories
-- → edit). Until now both were hard-coded by category NAME in
-- app/utils/icons.tsx, so renaming "Food" turned it grey with the fallback
-- icon, and every user-created category was grey.
--
-- icon: a Phosphor icon component name from the curated list in
--   lib/category-icons.ts (e.g. 'ForkKnife'); validated in the API, TEXT not
--   an enum. color: '#rrggbb'. Both nullable — NULL falls back to the
--   'Other' look (SquaresFour, light grey).
--
-- Backfill = today's name mapping, so nothing looks different after deploy.
-- Idempotent: only fills rows that are still NULL.

ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS color TEXT;

UPDATE expense_categories SET
    icon = CASE
        WHEN slug = 'currency_exchange' THEN 'ArrowsLeftRight'
        WHEN name = 'Food' THEN 'ForkKnife'
        WHEN name = 'Shopping' THEN 'Tote'
        WHEN name = 'Transit' THEN 'Train'
        WHEN name = 'Attraction' THEN 'MapPinArea'
        WHEN name = 'Lodging' THEN 'Bed'
        ELSE 'SquaresFour'
    END,
    color = CASE
        WHEN slug = 'currency_exchange' THEN '#b8d8ba'
        WHEN name = 'Food' THEN '#ffd97d'
        WHEN name = 'Shopping' THEN '#90be6d'
        WHEN name = 'Transit' THEN '#aed9e0'
        WHEN name = 'Attraction' THEN '#ff9b85'
        WHEN name = 'Lodging' THEN '#dac4f7'
        ELSE '#d3d3d3'
    END
WHERE icon IS NULL AND color IS NULL;
