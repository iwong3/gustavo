-- Add sort_order to presets table for user-defined ordering of routines

ALTER TABLE presets
    ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

-- Backfill existing presets: order alphabetically by name within each user+type
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, type ORDER BY name) - 1 AS rn
    FROM presets
    WHERE deleted_at IS NULL
)
UPDATE presets SET sort_order = ranked.rn
FROM ranked WHERE presets.id = ranked.id;
