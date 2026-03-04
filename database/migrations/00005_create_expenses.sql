-- Migration 00005: create_expenses
-- Created: 2026-03-04

CREATE TABLE expenses (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id             BIGINT NOT NULL REFERENCES trips(id),
    name                TEXT NOT NULL,
    date                DATE NOT NULL,
    cost_original       NUMERIC(12,2) NOT NULL,
    currency            TEXT NOT NULL,
    cost_converted_usd  NUMERIC(12,2),
    exchange_rate       NUMERIC(16,8),
    conversion_error    BOOLEAN NOT NULL DEFAULT FALSE,
    category            TEXT,
    location_id         BIGINT REFERENCES locations(id),
    paid_by             BIGINT NOT NULL REFERENCES users(id),
    notes               TEXT DEFAULT '',
    reported_by         BIGINT REFERENCES users(id),
    reported_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX idx_expenses_trip_date ON expenses(trip_id, date);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_expenses_deleted_at ON expenses(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_category ON expenses(category) WHERE category IS NOT NULL;
