-- Migration 00040: add_location_geo
-- Created: 2026-07-17 20:46:54

-- City-level coordinates for trip locations, so expenses that predate Google
-- place tagging can still appear on the trips world map as a city dot.
--
-- Filled by the one-off scripts/db/backfill-location-geo.js (Places Text
-- Search per DISTINCT city name, reviewed before writing) — the app itself
-- doesn't geocode locations at creation. Nullable on purpose: a location with
-- no coordinates simply doesn't get a dot, same as before.

ALTER TABLE locations
    ADD COLUMN lat          DOUBLE PRECISION,  -- city centroid from Google
    ADD COLUMN lng          DOUBLE PRECISION,
    ADD COLUMN country_code TEXT,              -- ISO 3166-1 alpha-2 ("JP")
    ADD COLUMN geocoded_at  TIMESTAMPTZ;       -- when the backfill resolved it

COMMENT ON COLUMN locations.lat IS 'City-level latitude from the geocoding backfill (scripts/db/backfill-location-geo.js). NULL = never geocoded.';
COMMENT ON COLUMN locations.country_code IS 'ISO 3166-1 alpha-2 country code from the geocoding backfill, e.g. JP.';
