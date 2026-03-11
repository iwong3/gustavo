-- Create place_details table and normalize Google Place data out of expenses.
--
-- Before: expenses had 5 google_place_* columns (id, name, address, lat, lng).
-- After:  expenses has only google_place_id FK → place_details table,
--         which stores all place metadata (including new fields for the drawer redesign).

-- 1. Create the place_details table
CREATE TABLE place_details (
    google_place_id    TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    address            TEXT,
    lat                DOUBLE PRECISION,
    lng                DOUBLE PRECISION,
    price_level        INTEGER,              -- 0-4 from Google Places API
    rating             NUMERIC(2,1),         -- e.g. 4.2
    primary_type       TEXT,                 -- e.g. 'japanese_restaurant'
    types              JSONB,                -- full types array from Google
    website            TEXT,
    hours_json         JSONB,                -- regularOpeningHours structure
    photo_refs         JSONB,                -- array of photo resource names
    fetched_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Migrate existing place data from expenses into place_details.
--    Uses DISTINCT ON to deduplicate (same place_id used by multiple expenses).
INSERT INTO place_details (google_place_id, name, address, lat, lng)
SELECT DISTINCT ON (e.google_place_id)
    e.google_place_id,
    e.google_place_name,
    e.google_place_address,
    e.google_place_lat,
    e.google_place_lng
FROM expenses e
WHERE e.google_place_id IS NOT NULL
  AND e.deleted_at IS NULL
ORDER BY e.google_place_id, e.created_at DESC;

-- 3. Drop the redundant columns from expenses (keep google_place_id).
ALTER TABLE expenses
    DROP COLUMN google_place_name,
    DROP COLUMN google_place_address,
    DROP COLUMN google_place_lat,
    DROP COLUMN google_place_lng;

-- 4. Add FK constraint from expenses.google_place_id → place_details.
ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_place_details
    FOREIGN KEY (google_place_id) REFERENCES place_details(google_place_id);

-- 5. Apply updated_at trigger to place_details (reuses existing trigger function).
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON place_details
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
