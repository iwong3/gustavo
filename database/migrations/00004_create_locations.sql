-- Migration 00004: create_locations
-- Created: 2026-03-04

CREATE TABLE locations (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id     BIGINT NOT NULL REFERENCES trips(id),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    UNIQUE(trip_id, name)
);

CREATE INDEX idx_locations_trip_id ON locations(trip_id);
