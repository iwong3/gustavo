-- Migration 00011: add_user_metadata
-- Created: 2026-03-05
-- Add initials and venmo_url to users table for display purposes.
-- Replaces hardcoded getPersonInitials() and getVenmoUrl() in person.ts.

ALTER TABLE users ADD COLUMN initials TEXT;
ALTER TABLE users ADD COLUMN venmo_url TEXT;

-- Backfill from existing hardcoded values
UPDATE users SET initials = 'AS', venmo_url = 'https://account.venmo.com/u/Aibek-Sarbayev' WHERE name = 'Aibek Sarbayev';
UPDATE users SET initials = 'AM', venmo_url = 'https://account.venmo.com/u/takoyuki' WHERE name = 'Angela Moy';
UPDATE users SET initials = 'DM' WHERE name = 'Dennis Moy';
UPDATE users SET initials = 'IW', venmo_url = 'https://account.venmo.com/u/iwong3' WHERE name = 'Ivan Wong';
UPDATE users SET initials = 'JY', venmo_url = 'https://account.venmo.com/u/Jenny-Mei-1' WHERE name = 'Jenny Mei';
UPDATE users SET initials = 'JO', venmo_url = 'https://account.venmo.com/u/Joanna-Mei' WHERE name = 'Joanna Mei';
UPDATE users SET initials = 'LM' WHERE name = 'Lisa Mei';
UPDATE users SET initials = 'MC', venmo_url = 'https://account.venmo.com/u/Michellec_8' WHERE name = 'Michelle Chen';
UPDATE users SET initials = 'SL' WHERE name = 'Suming Lin';
