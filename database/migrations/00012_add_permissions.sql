-- Migration 00012: add_permissions
-- Created: 2026-03-07
-- Adds trip participant roles, trip visibility, admin flag,
-- category ownership, and user default preferences.

-- 1. Add role to trip_participants (owner, editor, viewer)
ALTER TABLE trip_participants
  ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer';

-- Backfill: set existing participants created before roles to 'editor'
-- (preserves current behavior where everyone can edit)
UPDATE trip_participants SET role = 'editor';

-- Backfill: trip creators become owners
UPDATE trip_participants tp
SET role = 'owner'
FROM trips t
WHERE tp.trip_id = t.id AND tp.user_id = t.created_by;

CREATE INDEX idx_trip_participants_role ON trip_participants (trip_id, role);

-- 2. Add visibility to trips (participants, all_users)
ALTER TABLE trips
  ADD COLUMN visibility TEXT NOT NULL DEFAULT 'participants';

-- 3. Add is_admin flag to users
ALTER TABLE users
  ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Set initial admin
UPDATE users SET is_admin = true WHERE email = 'ivanwong15@gmail.com';

-- 4. Add created_by to expense_categories
ALTER TABLE expense_categories
  ADD COLUMN created_by BIGINT REFERENCES users(id);

-- Backfill existing categories to admin user
UPDATE expense_categories SET created_by = (
  SELECT id FROM users WHERE email = 'ivanwong15@gmail.com'
);

-- 5. Add user default preferences
ALTER TABLE users
  ADD COLUMN default_trip_visibility TEXT NOT NULL DEFAULT 'participants',
  ADD COLUMN default_participant_role TEXT NOT NULL DEFAULT 'viewer';
