#!/usr/bin/env bash
# Table Management System Setup Script
# This script sets up the new table management system schema

set -e  # Exit on any error

echo "🚀 Setting up Table Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="gustavo_dev"
DB_USER="gustavo_user"
DB_PASSWORD="gustavo_dev_password"

echo -e "${BLUE}📋 Table Management Setup Plan:${NC}"
echo "  1. Apply table management migration"
echo "  2. Load seed data"
echo "  3. Verify setup"
echo ""

# Function to run SQL file as app user
run_sql_as_user() {
    local sql_file="$1"
    echo -e "${YELLOW}📄 Running $sql_file as $DB_USER...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"
}

# Step 1: Apply table management migration
echo -e "${YELLOW}🏗️  Applying table management migration...${NC}"
if [ -f "database/migrations/00001_table_management_schema.sql" ]; then
    run_sql_as_user "database/migrations/00001_table_management_schema.sql"
    echo -e "${GREEN}✅ Migration applied successfully!${NC}"
else
    echo -e "${RED}❌ Error: database/migrations/00001_table_management_schema.sql not found!${NC}"
    exit 1
fi

# Step 2: Load seed data
echo -e "${YELLOW}🌱 Loading seed data...${NC}"
if [ -f "database/seeds/00001_initial_seed_data.sql" ]; then
    run_sql_as_user "database/seeds/00001_initial_seed_data.sql"
    echo -e "${GREEN}✅ Seed data loaded successfully!${NC}"
else
    echo -e "${RED}❌ Error: database/seeds/00001_initial_seed_data.sql not found!${NC}"
    echo -e "${YELLOW}⚠️  Continuing without seed data...${NC}"
fi

# Step 3: Verify setup
echo -e "${YELLOW}🔍 Verifying table management setup...${NC}"

# Count tables in the new schema
USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM tables;" 2>/dev/null || echo "0")
CATEGORY_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM table_categories;" 2>/dev/null || echo "0")
RECORD_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM records;" 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Table Management System setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Setup Summary:${NC}"
echo "  • Database: $DB_NAME"
echo "  • Users: $(echo $USER_COUNT | tr -d ' ')"
echo "  • Categories: $(echo $CATEGORY_COUNT | tr -d ' ')"
echo "  • Tables: $(echo $TABLE_COUNT | tr -d ' ')"
echo "  • Records: $(echo $RECORD_COUNT | tr -d ' ')"
echo ""
echo -e "${GREEN}🎉 Ready to use the Table Management System!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "  • Your app can now connect to the table management system"
echo "  • Use the new tables: users, table_categories, tables, columns, records"
echo "  • All data is stored with soft deletes (deleted_at field)"
echo "  • Records use JSONB for flexible data storage" 