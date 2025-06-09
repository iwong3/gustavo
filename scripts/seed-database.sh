#!/usr/bin/env bash
# Database Seed Script
# This script loads seed data into an existing database

set -e  # Exit on any error

echo "🌱 Loading seed data into database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration - Load from environment or use defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-gustavo_dev}"
DB_USER="${DB_USER:-gus}"
DB_PASSWORD="${DB_PASSWORD:-yellow_shirt_dev}"

# Check if .env.local exists and source it
if [ -f ".env.local" ]; then
    echo -e "${BLUE}📁 Loading environment from .env.local...${NC}"
    export $(grep -v '^#' .env.local | xargs)
fi

echo -e "${BLUE}📋 Seed Data Plan:${NC}"
echo "  1. Clear existing seed data (optional)"
echo "  2. Load all seed files sequentially"
echo "  3. Verify data loading"
echo ""

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

# Function to run SQL command as app user
run_sql_command_as_user() {
    local sql_command="$1"
    local description="$2"
    echo -e "${YELLOW}🔧 $description...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql_command"
}

# Check if database exists and is accessible
echo -e "${YELLOW}🔍 Verifying database connection...${NC}"
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database $DB_NAME!${NC}"
    echo -e "${YELLOW}💡 Make sure the database exists and run: npm run db:reset${NC}"
    exit 1
fi

# Ask if user wants to clear existing seed data
echo -e "${BLUE}🧹 Clear existing data?${NC}"
echo "This will remove all records from tables to avoid duplicates."
echo "It's safe and will preserve the table structure."
read -p "Clear existing seed data before loading new data? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Clearing existing seed data...${NC}"
    
    # Clear data in reverse dependency order to avoid foreign key issues
    run_sql_command_as_user "TRUNCATE TABLE records CASCADE;" "Clearing records"
    run_sql_command_as_user "TRUNCATE TABLE columns CASCADE;" "Clearing columns"
    run_sql_command_as_user "TRUNCATE TABLE tables CASCADE;" "Clearing tables"
    run_sql_command_as_user "TRUNCATE TABLE table_categories CASCADE;" "Clearing table categories"
    run_sql_command_as_user "TRUNCATE TABLE users CASCADE;" "Clearing users"
    
    echo -e "${GREEN}✅ Existing seed data cleared!${NC}"
    echo ""
fi

# Load seed data
echo -e "${YELLOW}🌱 Loading seed data...${NC}"

# Find all seed files and sort them
SEED_DIR="database/seeds"
if [ -d "$SEED_DIR" ]; then
    SEED_FILES=$(find "$SEED_DIR" -name "*.sql" | sort)
    
    if [ -z "$SEED_FILES" ]; then
        echo -e "${YELLOW}⚠️  No seed files found in $SEED_DIR${NC}"
        exit 1
    else
        echo -e "${BLUE}📋 Found seed files:${NC}"
        for seed in $SEED_FILES; do
            echo "  • $(basename "$seed")"
        done
        echo ""
        
        # Run each seed file
        for seed in $SEED_FILES; do
            seed_name=$(basename "$seed")
            run_sql_as_user "$seed" "Loading seed data: $seed_name"
        done
    fi
else
    echo -e "${RED}❌ Error: Seed directory $SEED_DIR not found!${NC}"
    exit 1
fi

# Verify seed data loading
echo -e "${YELLOW}🔍 Verifying seed data...${NC}"

# Count specific tables if they exist
USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
CATEGORY_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM table_categories;" 2>/dev/null || echo "0")
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM tables;" 2>/dev/null || echo "0")
COLUMN_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM columns;" 2>/dev/null || echo "0")
RECORD_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM records;" 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Seed data loaded successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Seed Data Summary:${NC}"
echo "  • Users: $(echo $USER_COUNT | tr -d ' ')"
echo "  • Categories: $(echo $CATEGORY_COUNT | tr -d ' ')"
echo "  • Dynamic tables: $(echo $TABLE_COUNT | tr -d ' ')"
echo "  • Columns: $(echo $COLUMN_COUNT | tr -d ' ')"
echo "  • Records: $(echo $RECORD_COUNT | tr -d ' ')"
echo ""
echo -e "${GREEN}🎉 Database seeded and ready!${NC}" 