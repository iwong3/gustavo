-- Complete Database Schema
-- This file contains the complete schema for the table management system

-- ================================================
-- Extensions and Types
-- ================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- Table Management System
-- ================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Table categories
CREATE TABLE table_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Tables (dynamic table definitions)
CREATE TABLE tables (
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

-- Columns (define structure of dynamic tables)
CREATE TABLE columns (
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

-- Records (store data for dynamic tables)
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id),
    data JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    deleted_at TIMESTAMPTZ NULL
);

-- Record logs (audit trail for record changes)
CREATE TABLE record_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES records(id),
    table_id UUID REFERENCES tables(id),
    previous_data JSONB,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Indexes for Performance
-- ================================================

-- Table management system indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_table_categories_created_by ON table_categories(created_by);
CREATE INDEX idx_table_categories_deleted_at ON table_categories(deleted_at);
CREATE INDEX idx_tables_created_by ON tables(created_by);
CREATE INDEX idx_tables_category_id ON tables(category_id);
CREATE INDEX idx_tables_deleted_at ON tables(deleted_at);
CREATE INDEX idx_columns_table_id ON columns(table_id);
CREATE INDEX idx_columns_created_by ON columns(created_by);
CREATE INDEX idx_columns_deleted_at ON columns(deleted_at);
CREATE INDEX idx_records_table_id ON records(table_id);
CREATE INDEX idx_records_created_by ON records(created_by);
CREATE INDEX idx_records_deleted_at ON records(deleted_at);
CREATE INDEX idx_records_data_gin ON records USING GIN (data);
CREATE INDEX idx_record_logs_record_id ON record_logs(record_id);
CREATE INDEX idx_record_logs_table_id ON record_logs(table_id);
CREATE INDEX idx_record_logs_changed_by ON record_logs(changed_by);

-- ================================================
-- Triggers and Functions
-- ================================================

-- Function to update updated_at timestamp
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