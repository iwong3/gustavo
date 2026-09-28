-- Migration 00043: supplement_events
-- Created: 2026-09-28
--
-- Stack-change history for the Supplements redesign: when you started,
-- stopped, or changed the daily doses of a supplement. Powers the calendar's
-- +/−/± badges, each supplement's run history, and where "Day X" counts from.
--
-- Only explicit changes live here. Runs that end on their own (7+ days with
-- no dose) and restarts after such a break are derived from supplement_logs
-- in lib/health/supplement-runs.ts, not stored.
--
-- `date` is the device's log day (the client sends it; before 6am that's
-- still yesterday). `updated_at` doubles as the "trusted through" horizon for
-- a `started` event: gaps in the logs before it was recorded don't end the
-- run — you told us you were taking it (backdated starts, sparse old logs).
--
-- Seed: every existing supplement gets a `started` event at its first log
-- (else its creation date); inactive ones also get `stopped` at their last
-- log (else their last update). Guarded by NOT EXISTS so a re-run is a no-op.

CREATE TABLE IF NOT EXISTS supplement_events (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id),
    supplement_id  BIGINT NOT NULL REFERENCES supplements(id),
    date           DATE NOT NULL,
    kind           TEXT NOT NULL,   -- 'started' | 'stopped' | 'dose_changed' (validated in app code)
    daily_doses    INT,             -- new value for 'started' / 'dose_changed'; NULL = as needed
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_supplement_events_user_date
    ON supplement_events (user_id, date)
    WHERE deleted_at IS NULL;

-- ── Seed (before the audit trigger, so the backfill isn't attributed) ────────

INSERT INTO supplement_events (user_id, supplement_id, date, kind, daily_doses)
SELECT s.user_id, s.id,
       COALESCE((SELECT MIN(l.date) FROM supplement_logs l WHERE l.supplement_id = s.id),
                s.created_at::date),
       'started', s.daily_doses
FROM supplements s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM supplement_events e WHERE e.supplement_id = s.id);

INSERT INTO supplement_events (user_id, supplement_id, date, kind)
SELECT s.user_id, s.id,
       COALESCE((SELECT MAX(l.date) FROM supplement_logs l WHERE l.supplement_id = s.id),
                COALESCE(s.updated_at, s.created_at)::date),
       'stopped'
FROM supplements s
WHERE s.deleted_at IS NULL
  AND s.is_active = false
  AND NOT EXISTS (SELECT 1 FROM supplement_events e
                  WHERE e.supplement_id = s.id AND e.kind = 'stopped');

-- ── Triggers ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_supplement_events_updated_at ON supplement_events;
CREATE TRIGGER set_supplement_events_updated_at
    BEFORE UPDATE ON supplement_events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS audit_supplement_events ON supplement_events;
CREATE TRIGGER audit_supplement_events
    AFTER INSERT OR UPDATE OR DELETE ON supplement_events
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
