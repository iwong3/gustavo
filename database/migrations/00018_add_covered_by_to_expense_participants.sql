-- Add covered_by column to expense_participants
-- When set, the participant's share is absorbed by the covering user (no debt accrued).
-- Currently only the payer can cover, but the FK to users allows any user in the future.

ALTER TABLE expense_participants
    ADD COLUMN covered_by BIGINT REFERENCES users(id);
