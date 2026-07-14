-- Migration 00038: create_settlements
-- Created: 2026-07-14
--
-- Settlements: recorded debt payments between trip participants ("mark as
-- paid" on the debts page). A settlement from_user → to_user of amount_usd
-- means the payer handed that money over outside the app (Venmo, cash), so
-- the debt calculation offsets it against what from_user owes to_user.
-- Always USD — debts are computed in USD (home currency).

CREATE TABLE settlements (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trip_id       BIGINT NOT NULL REFERENCES trips(id),
    from_user_id  BIGINT NOT NULL REFERENCES users(id),
    to_user_id    BIGINT NOT NULL REFERENCES users(id),
    amount_usd    NUMERIC(12,2) NOT NULL CHECK (amount_usd > 0),
    note          TEXT,
    settled_on    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by    BIGINT NOT NULL REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    CHECK (from_user_id <> to_user_id)
);

CREATE INDEX idx_settlements_trip ON settlements (trip_id) WHERE deleted_at IS NULL;

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER set_settlements_updated_at
    BEFORE UPDATE ON settlements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER audit_settlements
    AFTER INSERT OR UPDATE OR DELETE ON settlements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
