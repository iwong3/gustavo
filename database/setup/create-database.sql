-- Create database and user for development
-- Run this as postgres superuser

-- Create the user
CREATE USER gustavo_user WITH PASSWORD 'gustavo_dev_password';

-- Create the database
CREATE DATABASE gustavo_dev OWNER gustavo_user;

-- Grant privileges on the database
GRANT ALL PRIVILEGES ON DATABASE gustavo_dev TO gustavo_user; 