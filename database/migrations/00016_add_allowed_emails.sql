-- Migration 00016: add_allowed_emails
-- Created: 2026-03-09
-- Moves the hardcoded ALLOWED_EMAILS list to the DB.
-- Admins can add/remove entries via the settings UI.
-- Auth.js signIn callback queries this table instead of a static array.

CREATE TABLE allowed_emails (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    added_by    BIGINT REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with the currently hardcoded allowlist
INSERT INTO allowed_emails (email) VALUES
    ('ivanwong15@gmail.com'),
    ('jennyjiayimei@gmail.com'),
    ('joannamei11@gmail.com'),
    ('aibek.asm@gmail.com'),
    ('angela.moy48@gmail.com'),
    ('dennismoy18@gmail.com'),
    ('michellec0897@gmail.com');

-- Add audit trigger (matches pattern from 00009)
CREATE TRIGGER audit_allowed_emails
    AFTER INSERT OR UPDATE OR DELETE ON allowed_emails
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
