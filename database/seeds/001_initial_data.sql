-- Seed: initial data
-- Seeds known users, trips, participants, and locations from the existing app data.
--
-- Run via: pnpm db:seed
-- This file is idempotent — safe to re-run on an empty database.

-- Users
-- ID order: Ivan(1), Jenny(2), Joanna(3), Aibek(4), Angela(5), Lisa(6), Dennis(7), Michelle(8), Suming(9)
-- Email is NULL for people without Google accounts (Lisa, Suming)
INSERT INTO users (id, email, name) OVERRIDING SYSTEM VALUE VALUES
    (1, 'ivanwong15@gmail.com', 'Ivan Wong'),
    (2, 'jennyjiayimei@gmail.com', 'Jenny Mei'),
    (3, 'joannamei11@gmail.com', 'Joanna Mei'),
    (4, 'aibek.asm@gmail.com', 'Aibek Sarbayev'),
    (5, 'angela.moy48@gmail.com', 'Angela Moy'),
    (6, NULL, 'Lisa Moy'),
    (7, 'dennismoy18@gmail.com', 'Dennis Moy'),
    (8, 'michellec0897@gmail.com', 'Michelle Chen'),
    (9, NULL, 'Suming')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT MAX(id) FROM users), 9));

-- Trips (created_by = Ivan for all existing trips)
INSERT INTO trips (id, name, start_date, end_date, created_by) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Japan 2024', '2024-11-22', '2024-12-06', 1),
    (2, 'Vancouver 2024', '2024-12-10', '2024-12-13', 1),
    (3, 'South Korea 2025', '2025-03-28', '2025-04-05', 1),
    (4, 'Japan 2025', '2025-11-28', '2025-12-12', 1)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('trips', 'id'), GREATEST((SELECT MAX(id) FROM trips), 4));

-- Trip participants
-- Japan 2024: Ivan, Jenny, Joanna, Aibek, Angela, Lisa, Michelle, Suming
INSERT INTO trip_participants (trip_id, user_id) VALUES
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 8), (1, 9)
ON CONFLICT (trip_id, user_id) DO NOTHING;
-- Vancouver 2024: Ivan, Jenny, Angela, Lisa, Dennis
INSERT INTO trip_participants (trip_id, user_id) VALUES
    (2, 1), (2, 2), (2, 5), (2, 6), (2, 7)
ON CONFLICT (trip_id, user_id) DO NOTHING;
-- South Korea 2025: Ivan, Jenny, Angela
INSERT INTO trip_participants (trip_id, user_id) VALUES
    (3, 1), (3, 2), (3, 5)
ON CONFLICT (trip_id, user_id) DO NOTHING;
-- Japan 2025: Ivan, Jenny
INSERT INTO trip_participants (trip_id, user_id) VALUES
    (4, 1), (4, 2)
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Locations per trip
-- Japan 2024
INSERT INTO locations (trip_id, name) VALUES
    (1, 'Hakone'), (1, 'Kyoto'), (1, 'Osaka'), (1, 'Tokyo'), (1, 'Other')
ON CONFLICT (trip_id, name) DO NOTHING;
-- Vancouver 2024
INSERT INTO locations (trip_id, name) VALUES
    (2, 'Vancouver'), (2, 'Other')
ON CONFLICT (trip_id, name) DO NOTHING;
-- South Korea 2025
INSERT INTO locations (trip_id, name) VALUES
    (3, 'Seoul'), (3, 'Other')
ON CONFLICT (trip_id, name) DO NOTHING;
-- Japan 2025
INSERT INTO locations (trip_id, name) VALUES
    (4, 'Hiroshima'), (4, 'Kawaguchiko'), (4, 'Kyoto'), (4, 'Tokyo'), (4, 'Uji'), (4, 'Other')
ON CONFLICT (trip_id, name) DO NOTHING;
