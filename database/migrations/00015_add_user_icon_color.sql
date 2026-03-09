-- Add icon_color column to users table
-- Stores hex color for the user's initials icon (e.g. '#ffc857')

ALTER TABLE users ADD COLUMN icon_color TEXT;

-- Backfill existing users with their current hardcoded colors
UPDATE users SET icon_color = CASE split_part(name, ' ', 1)
    WHEN 'Aibek'    THEN '#c8553d'
    WHEN 'Angela'   THEN '#64b5f6'
    WHEN 'Dennis'   THEN '#fca311'
    WHEN 'Ivan'     THEN '#ffc857'
    WHEN 'Jenny'    THEN '#c8b6ff'
    WHEN 'Joanna'   THEN '#90a955'
    WHEN 'Lisa'     THEN '#e5989b'
    WHEN 'Michelle' THEN '#b8c0ff'
    WHEN 'Suming'   THEN '#ffc09f'
    ELSE '#FBBC04'
END
WHERE icon_color IS NULL;
