# Database Scripts Reference

This directory contains scripts for managing your local PostgreSQL database.

## 🚀 Quick Commands

### Reset Database (Complete Clean Slate)

```bash
# PowerShell
npm run db:reset

# Bash (Git Bash/WSL)
npm run db:reset-bash

# Force reset (no confirmation)
npm run db:reset-force
```

### Test Database Connection

```bash
npm run db:test-local
```

### Create Environment File

```bash
# PowerShell
npm run env:create

# Bash
npm run env:create-bash
```

## 📁 File Organization

### Scripts (`scripts/`)

-   **Shell/PowerShell scripts** for automation and setup
-   **Installation scripts** for PostgreSQL
-   **Environment setup** scripts

### Database (`database/`)

-   **All SQL files** for database operations
-   **Schema definitions** and migrations
-   **Setup and teardown** scripts

## 📄 SQL Files (in `database/`)

### Core Database Setup

-   **`drop-database.sql`** - Drops the database and user (run as postgres)
-   **`create-database.sql`** - Creates database and user (run as postgres)
-   **`setup-permissions.sql`** - Sets up schema permissions (run as
    gustavo_user)

### Schema

-   **`schema.sql`** - Your application schema (tables, enums, etc.)

## 🔧 Manual Database Operations

If you need to run SQL files manually:

```bash
# Drop database and user
psql -U postgres -f database/drop-database.sql

# Create database and user
psql -U postgres -f database/create-database.sql

# Set up permissions
psql -U gustavo_user -d gustavo_dev -f database/setup-permissions.sql

# Apply schema
psql -U gustavo_user -d gustavo_dev -f database/schema.sql
```

## 🎯 What Each Script Does

### `reset-database.sh` / `reset-database.ps1`

**Complete database reset and setup:**

1. Drops existing database and user
2. Creates fresh database and user
3. Sets up proper permissions
4. Applies your schema
5. Verifies everything works

**Use when:**

-   Starting fresh development
-   Schema changes require clean slate
-   Database is corrupted
-   Switching between branches with different schemas

### Individual SQL Files

**Modular approach for specific operations:**

-   Clean separation of concerns
-   Easy to understand and modify
-   Can be run individually if needed
-   Version control friendly

## 🔒 Database Configuration

**Local Development:**

-   Database: `gustavo_dev`
-   User: `gustavo_user`
-   Password: `gustavo_dev_password`
-   Host: `localhost`
-   Port: `5432`

**Production (Neon):**

-   Configured via Vercel environment variables
-   Automatically used when `NODE_ENV=production`

## 🚨 Troubleshooting

**"psql: command not found"**

-   Make sure PostgreSQL is installed
-   Add PostgreSQL to your PATH
-   Try: `npm run db:install` or `npm run db:install-bash`

**"password authentication failed"**

-   Check postgres user password is 'postgres'
-   Verify PostgreSQL service is running

**"database does not exist"**

-   Run the full reset: `npm run db:reset`

**Permission denied errors**

-   Make sure you're running as the correct user
-   Check the SQL file comments for which user to use
