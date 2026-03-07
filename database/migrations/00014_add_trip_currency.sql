-- Migration 00014: add_trip_currency
-- Created: 2026-03-07
-- Adds local currency to trips (e.g., JPY for a Japan trip).

ALTER TABLE trips
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
