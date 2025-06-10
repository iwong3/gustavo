# Database Setup and Management

This directory contains all database-related files for the Gustavo project,
focused on the flexible table management system.

## Overview

The database implements a **Table Management System** - A flexible schema for
dynamic data management that allows users to create custom tables, columns, and
records with full audit trails and soft deletes.

## Directory Structure

```
database/
├── migrations/           # Database migration files
├── seeds/               # Seed data files
├── setup/               # Database setup files (users, permissions)
├── schema.sql/          # Complete schema files
└── planning.md          # Schema planning and documentation
```

## Quick Start

### Option 1: Complete Fresh Setup

```bash
# Reset and set up everything from scratch
npm run db:reset
```

### Option 2: Run All Migrations

```bash
# Run all migrations in sequence (for existing database)
npm run db:migrate
```

### Option 3: Set Up Table Management Only

```bash
# Set up just the new table management system
npm run db:setup-tables
```

## Migration Files

### 00001_table_management_schema.sql

-   Creates the complete table management system from planning.md
-   Includes: users, table_categories, tables, columns, records, record_logs
-   Implements soft deletes and audit trails
-   Uses UUID primary keys and JSONB for flexible data storage
-   Includes proper indexes and trigger functions

### Creating New Migrations

```bash
# Create a new migration
npm run db:create-migration add_user_preferences

# This creates: database/migrations/00002_add_user_preferences.sql
```

## Table Management System

The new table management system provides:

### Core Tables

-   **users** - User accounts and authentication
-   **table_categories** - Organize tables into categories
-   **tables** - Dynamic table definitions
-   **columns** - Define structure of dynamic tables
-   **records** - Store actual data using JSONB
-   **record_logs** - Audit Trail for changes

### Key Features

-   **Soft Deletes** - All tables use `deleted_at` for safe deletion
-   **Flexible Data Storage** - Records use JSONB for any data structure
-   **Audit Trail** - Complete change tracking in record_logs
-   **Optimistic Locking** - Version fields prevent conflicts
-   **Auto Timestamps** - Automatic created_at/updated_at handling

### Sample Data Structure

```sql
-- Example: A "Projects" table with custom columns
INSERT INTO tables (name, description) VALUES ('Projects', 'Track all projects');

-- Define columns for the Projects table
INSERT INTO columns (table_id, name, data_type, validation_rules) VALUES
  (table_id, 'name', 'text', '{"required": true}'),
  (table_id, 'status', 'select', '{"options": ["planning", "active", "completed"]}');

-- Store actual project data
INSERT INTO records (table_id, data) VALUES
  (table_id, '{"column_id_1": "Website Redesign", "column_id_2": "active"}');
```

## Seed Data

### 00001_initial_seed_data.sql

Provides sample data for the table management system:

-   3 sample users (admin, user, manager)
-   4 categories (Project Management, Customer Relations, etc.)
-   5 sample tables with different structures
-   Sample records demonstrating the data storage pattern

## Database Configuration

Default connection settings (modify in scripts as needed):

-   **Host**: localhost
-   **Port**: 5432
-   **Database**: gustavo_dev
-   **User**: gus
-   **Password**: yellow_shirt_dev

## Environment Variables

Make sure to set up your `.env.local` file with:

```
DATABASE_URL=postgresql://gus:yellow_shirt_dev@localhost:5432/gustavo_dev
```

## Running Scripts

All scripts should be run from the project root directory:

```bash
# Make scripts executable (Linux/Mac)
chmod +x scripts/*.sh

# Run complete database reset
npm run db:reset

# Run all migrations
npm run db:migrate

# Set up table management system only
npm run db:setup-tables

# Create a new migration
npm run db:create-migration <description>
```

## Schema Evolution

When making schema changes:

1. Create a new migration: `npm run db:create-migration <description>`
2. Edit the generated migration file with your SQL
3. Test migrations on a fresh database: `npm run db:migrate`
4. **Auto-generate** the complete schema: `npm run db:generate-schema`
5. Update seed data if needed

### Auto-Generate Complete Schema

Instead of manually updating `complete_schema.sql`, you can now automatically
generate it:

```bash
# Generate complete schema from all migrations
npm run db:generate-schema
```

This script:

-   Creates a temporary database
-   Applies all migrations in order
-   Uses `pg_dump` to extract the complete schema
-   Formats and organizes the output
-   Replaces `database/schema.sql/complete_schema.sql`

### Migration Best Practices

-   **5-digit numbering**: 00001, 00002, etc. (supports up to 99,999 migrations)
-   **Never modify existing migrations** - always create new ones for changes
-   **Descriptive names**: `add_user_preferences`, `create_audit_table`
-   **Keep focused**: One logical change per migration
-   **Test thoroughly**: Run on copy of production data before deploying

## Best Practices

### Safe Operations

-   Always use soft deletes (`UPDATE table SET deleted_at = NOW()`)
-   Use transactions for multi-table operations
-   Validate JSONB data before insertion

### Performance

-   Use GIN indexes on JSONB columns for fast queries
-   Index foreign keys and commonly queried fields
-   Consider partitioning for large record tables

### Data Integrity

-   Use version fields for optimistic locking
-   Validate JSONB against column validation_rules
-   Log all data changes to record_logs

## Troubleshooting

### Common Issues

1. **Permission denied**: Check user permissions in setup files
2. **Connection refused**: Ensure PostgreSQL is running
3. **Schema conflicts**: Run a fresh db:reset

### Useful Queries

```sql
-- Check all tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- View dynamic table structure
SELECT t.name, c.name as column_name, c.data_type
FROM tables t
JOIN columns c ON t.id = c.table_id
WHERE t.name = 'Projects';

-- Query records with readable data
SELECT r.id, r.data, r.created_at
FROM records r
JOIN tables t ON r.table_id = t.id
WHERE t.name = 'Projects';
```

For more detailed information, see the individual script files and migration
comments.
