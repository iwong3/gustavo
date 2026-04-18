-- Migration 00035: Multi-currency / multi-country trips
-- Created: 2026-04-17
--
-- Replaces the single trips.currency column with two join tables:
--   trip_countries  — countries selected when creating/editing a trip
--   trip_currencies — currencies available on that trip (derived from countries
--                     in app code, but persisted so the DB is the source of truth
--                     for the expense form)
--
-- The old trips.currency column stays in place for now; a follow-up migration
-- will drop it once nothing reads it. Existing trips are backfilled so they
-- behave identically (their old single currency becomes a one-row entry in
-- trip_currencies).

-- ── trip_countries ───────────────────────────────────────────────────────────

CREATE TABLE trip_countries (
    trip_id      BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, country_code)
);

CREATE INDEX idx_trip_countries_trip ON trip_countries (trip_id);

-- ── trip_currencies ──────────────────────────────────────────────────────────

CREATE TABLE trip_currencies (
    trip_id       BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    currency_code TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, currency_code)
);

CREATE INDEX idx_trip_currencies_trip ON trip_currencies (trip_id);

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- For each existing trip, insert its current currency into trip_currencies so
-- the expense form keeps showing the same options. USD trips get a USD row too;
-- it's harmless and keeps the "trip_currencies is the source of truth" rule
-- consistent (USD is otherwise implicit in the UI).

INSERT INTO trip_currencies (trip_id, currency_code)
SELECT id, currency FROM trips
WHERE deleted_at IS NULL;

-- No country backfill — we have no reliable mapping from currency to country
-- (USD is ambiguous, and old trips never recorded a country). Users can add
-- countries by editing the trip later.

-- ── Audit triggers ───────────────────────────────────────────────────────────

CREATE TRIGGER audit_trip_countries
    AFTER INSERT OR UPDATE OR DELETE ON trip_countries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_trip_currencies
    AFTER INSERT OR UPDATE OR DELETE ON trip_currencies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
