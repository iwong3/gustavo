#!/usr/bin/env bash
# Generate Complete Schema from Migrations
# This script runs all migrations on a temporary database and generates a complete schema

set -e  # Exit on any error

echo "🔄 Generating complete schema from migrations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="gustavo_schema_temp"
DB_USER="gustavo_user"
DB_PASSWORD="gustavo_dev_password"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"

# Output file
OUTPUT_FILE="database/schema.sql/complete_schema.sql"

echo -e "${BLUE}📋 Schema Generation Plan:${NC}"
echo "  1. Create temporary database"
echo "  2. Apply all migrations in order"
echo "  3. Extract schema using pg_dump"
echo "  4. Clean up and format the output"
echo "  5. Replace existing complete_schema.sql"
echo ""

# Function to run SQL as postgres user
run_sql_as_postgres() {
    local sql_command="$1"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -c "$sql_command"
}

# Function to run SQL file as app user
run_sql_as_user() {
    local sql_file="$1"
    local description="$2"
    echo -e "${YELLOW}📄 $description...${NC}"
    if [ -f "$sql_file" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"
        echo -e "${GREEN}✅ $description completed!${NC}"
    else
        echo -e "${RED}❌ Error: $sql_file not found!${NC}"
        exit 1
    fi
}

# Step 1: Create temporary database
echo -e "${YELLOW}🏗️  Creating temporary database...${NC}"
run_sql_as_postgres "DROP DATABASE IF EXISTS $DB_NAME;"
run_sql_as_postgres "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
run_sql_as_postgres "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Step 2: Set up permissions in temp database
echo -e "${YELLOW}🔐 Setting up permissions...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

# Step 3: Apply all migrations in order
echo -e "${YELLOW}🏗️  Applying all migrations...${NC}"

# Find all migration files and sort them
MIGRATION_FILES=$(find database/migrations -name "*.sql" | sort)

if [ -z "$MIGRATION_FILES" ]; then
    echo -e "${RED}❌ No migration files found in database/migrations/!${NC}"
    exit 1
fi

for migration_file in $MIGRATION_FILES; do
    migration_name=$(basename "$migration_file")
    run_sql_as_user "$migration_file" "Applying migration: $migration_name"
done

# Step 4: Extract schema using pg_dump
echo -e "${YELLOW}📤 Extracting schema structure...${NC}"

# Create the output directory if it doesn't exist
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Generate schema with pg_dump
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --clean \
    --if-exists \
    > "$OUTPUT_FILE.tmp"

# Step 5: Clean up and format the output
echo -e "${YELLOW}🎨 Formatting schema file...${NC}"

# Create formatted schema file
cat > "$OUTPUT_FILE" << 'EOF'
-- Complete Database Schema
-- This file contains the complete schema for the table management system
-- Generated automatically from migrations

-- ================================================
-- Extensions and Types
-- ================================================

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- Table Management System
-- ================================================

EOF

# Extract and clean up the schema content
# Remove the DROP commands and extension creation (we handle those above)
grep -v "^DROP " "$OUTPUT_FILE.tmp" | \
grep -v "^CREATE EXTENSION" | \
grep -v "^--" | \
grep -v "^$" | \
sed 's/^//' >> "$OUTPUT_FILE"

# Add section headers for better organization
cat >> "$OUTPUT_FILE" << 'EOF'

-- ================================================
-- Indexes for Performance
-- ================================================

EOF

# Extract CREATE INDEX statements
grep "^CREATE INDEX" "$OUTPUT_FILE.tmp" | \
sed 's/^/-- /' | \
sed 's/-- CREATE INDEX/CREATE INDEX/' >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'

-- ================================================
-- Triggers and Functions
-- ================================================

EOF

# Extract functions and triggers
grep -A 20 "CREATE.*FUNCTION\|CREATE TRIGGER" "$OUTPUT_FILE.tmp" | \
sed 's/^//' >> "$OUTPUT_FILE"

# Clean up temporary files
rm -f "$OUTPUT_FILE.tmp"

# Step 6: Clean up temporary database
echo -e "${YELLOW}🧹 Cleaning up temporary database...${NC}"
run_sql_as_postgres "DROP DATABASE IF EXISTS $DB_NAME;"

# Step 7: Verify the generated schema
echo -e "${YELLOW}🔍 Verifying generated schema...${NC}"

# Count lines and check for essential elements
TOTAL_LINES=$(wc -l < "$OUTPUT_FILE")
TABLE_COUNT=$(grep -c "CREATE TABLE" "$OUTPUT_FILE" || echo "0")
INDEX_COUNT=$(grep -c "CREATE INDEX" "$OUTPUT_FILE" || echo "0")
FUNCTION_COUNT=$(grep -c "CREATE.*FUNCTION" "$OUTPUT_FILE" || echo "0")

echo -e "${GREEN}✅ Complete schema generated successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Schema Summary:${NC}"
echo "  • File: $OUTPUT_FILE"
echo "  • Total lines: $TOTAL_LINES"
echo "  • Tables: $TABLE_COUNT"
echo "  • Indexes: $INDEX_COUNT"
echo "  • Functions: $FUNCTION_COUNT"
echo ""
echo -e "${GREEN}🎉 Schema generation completed!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "  • Review the generated schema in $OUTPUT_FILE"
echo "  • Test with a fresh database: npm run db:reset"
echo "  • Commit the updated complete schema to version control" 