-- Migration 00008: add_trip_slugs
-- Add URL-friendly slug column to trips table for route-based navigation.

ALTER TABLE trips ADD COLUMN slug TEXT;

-- Backfill existing trips
UPDATE trips SET slug = LOWER(REPLACE(name, ' ', '-'));

-- Now enforce NOT NULL
ALTER TABLE trips ALTER COLUMN slug SET NOT NULL;

-- Partial unique index: only active (non-deleted) trips must have unique slugs
CREATE UNIQUE INDEX idx_trips_slug ON trips(slug) WHERE deleted_at IS NULL;
