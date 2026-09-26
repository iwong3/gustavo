-- Migration 00041: settlement_plan
-- Created: 2026-09-25
--
-- Which settle plan a payment was recorded under: 'fewest' (simplified —
-- may route money through a third person) or 'direct' (pay who you owe).
-- A trip never mixes plans: the first payment locks the trip to its plan
-- until every payment is undone (enforced in the settlements API).
-- TEXT validated in app code (lib/debt-proof.ts isSettlePlan). NULL = rows
-- recorded before plans existed, treated as 'fewest'.

ALTER TABLE settlements ADD COLUMN plan TEXT;
