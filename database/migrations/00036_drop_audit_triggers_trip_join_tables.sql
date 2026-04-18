-- Migration 00036: drop audit triggers from trip_currencies / trip_countries
-- Created: 2026-04-18
--
-- The shared audit_trigger_func reads NEW.id, but these two join tables use
-- composite primary keys (no `id` column), so INSERT/UPDATE/DELETE blew up
-- with "record 'new' has no field 'id'". Audit-logging join-table changes
-- isn't valuable enough to justify reworking the trigger function — drop the
-- triggers instead. Trip-level edits will still be audited via the audit
-- trigger on `trips` itself.

DROP TRIGGER IF EXISTS audit_trip_countries ON trip_countries;
DROP TRIGGER IF EXISTS audit_trip_currencies ON trip_currencies;
