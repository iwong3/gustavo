-- Set up schema permissions for gustavo_user
-- Run this as gustavo_user on gustavo_dev database

-- Grant all privileges on the public schema
GRANT ALL ON SCHEMA public TO gustavo_user;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gustavo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gustavo_user; 