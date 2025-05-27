-- Migration 001: Initial Schema
-- Creates all tables, enums, and initial data

-- Create enums
CREATE TYPE currency AS ENUM ('CAD', 'USD', 'JPY');
CREATE TYPE spend_type AS ENUM ('food', 'transport', 'lodging', 'activity', 'shopping', 'other');
CREATE TYPE person_type AS ENUM ('ivan', 'guest');
CREATE TYPE trip_type AS ENUM ('trip', 'local');

-- Create tables
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    currency currency NOT NULL,
    trip_type trip_type NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spends (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES locations(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency currency NOT NULL,
    description TEXT,
    spend_type spend_type NOT NULL,
    spend_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spend_splits (
    id SERIAL PRIMARY KEY,
    spend_id INTEGER REFERENCES spends(id) ON DELETE CASCADE,
    person person_type NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial data
INSERT INTO trips (name, start_date, end_date, currency, trip_type) VALUES
('Japan2024', '2024-03-15', '2024-03-30', 'JPY', 'trip'),
('Vancouver2024', '2024-07-01', '2024-07-07', 'CAD', 'trip');

INSERT INTO locations (name) VALUES
('Tokyo'),
('Osaka'),
('Kyoto'),
('Vancouver'),
('Richmond'),
('Burnaby'); 