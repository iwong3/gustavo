-- Migration 00047: expense_participant_covers
-- Created: 2026-10-19
--
-- Shared treats: a treated participant's share (covered_by IS NOT NULL) can be
-- split among several people, not just the payer. `covers = true` marks a
-- participant who chips in for the treated shares; those shares split evenly
-- across every covers row of the expense.
--
-- No covers rows ⇒ the payer absorbs the treated shares — exactly how every
-- existing expense already computes, so there is no backfill. covered_by stays
-- the "treated" marker (it holds the payer's id, as before).

ALTER TABLE expense_participants
    ADD COLUMN IF NOT EXISTS covers BOOLEAN NOT NULL DEFAULT false;
