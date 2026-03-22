-- Drop unused meal_label column from presets table.
-- Diet presets now use the preset name as the meal group label when applied.
ALTER TABLE presets DROP COLUMN IF EXISTS meal_label;
