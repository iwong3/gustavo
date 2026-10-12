-- Migration 00046: supplement_sort_order
-- Created: 2026-10-11
--
-- User-defined order for the daily stack (drag to reorder on the Home card).
-- Nullable: NULL sorts after ordered rows, then by name — so existing stacks
-- stay alphabetical until first reordered, and a newly added supplement lands
-- at the bottom. Written only by PUT /api/health/supplements/reorder.

ALTER TABLE supplements ADD COLUMN IF NOT EXISTS sort_order INT;
