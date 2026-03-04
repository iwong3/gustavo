-- Migration 00002: create_trips
-- Created: 2026-03-04

CREATE TABLE trips (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    start_date  DATE,
    end_date    DATE,
    created_by  BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_trips_created_by ON trips(created_by);
CREATE INDEX idx_trips_deleted_at ON trips(deleted_at) WHERE deleted_at IS NULL;
