-- Migration 00001: Table Management Schema
-- Implements the flexible table management system

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create gustavo schema for application tables
CREATE SCHEMA IF NOT EXISTS gustavo;

-- Set search path to use gustavo schema by default
SET search_path TO gustavo, public;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create table_categories table
CREATE TABLE IF NOT EXISTS table_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES table_categories(id) ON DELETE SET NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create columns table
CREATE TABLE IF NOT EXISTS columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id),
    name TEXT NOT NULL,
    data_type TEXT,
    validation_rules JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMPTZ NULL
);

-- Create records table
CREATE TABLE IF NOT EXISTS records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id),
    data JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMPTZ NULL
);

-- Create record_logs table
CREATE TABLE IF NOT EXISTS record_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES records(id),
    table_id UUID REFERENCES tables(id),
    previous_data JSONB,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_table_categories_created_by ON table_categories(created_by);
CREATE INDEX IF NOT EXISTS idx_table_categories_deleted_at ON table_categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tables_created_by ON tables(created_by);
CREATE INDEX IF NOT EXISTS idx_tables_category_id ON tables(category_id);
CREATE INDEX IF NOT EXISTS idx_tables_deleted_at ON tables(deleted_at);
CREATE INDEX IF NOT EXISTS idx_columns_table_id ON columns(table_id);
CREATE INDEX IF NOT EXISTS idx_columns_created_by ON columns(created_by);
CREATE INDEX IF NOT EXISTS idx_columns_deleted_at ON columns(deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_table_id ON records(table_id);
CREATE INDEX IF NOT EXISTS idx_records_created_by ON records(created_by);
CREATE INDEX IF NOT EXISTS idx_records_deleted_at ON records(deleted_at);
CREATE INDEX IF NOT EXISTS idx_records_data_gin ON records USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_record_logs_record_id ON record_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_record_logs_table_id ON record_logs(table_id);
CREATE INDEX IF NOT EXISTS idx_record_logs_changed_by ON record_logs(changed_by);

-- Add trigger function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_table_categories_updated_at BEFORE UPDATE ON table_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_records_updated_at BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

