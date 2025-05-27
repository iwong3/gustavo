#!/bin/bash
# Database Reset and Migration Script
# This script will completely reset your local database and apply the schema

set -e  # Exit on any error

echo "🔄 Resetting local database..."

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
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"

echo -e "${BLUE}📋 Database Reset Plan:${NC}"
echo "  1. Drop existing database and user"
echo "  2. Create database and user"
echo "  3. Set up permissions"
echo "  4. Apply schema"
echo "  5. Verify setup"
echo ""

# Function to run SQL file as postgres user
run_sql_as_postgres() {
    local sql_file="$1"
    echo -e "${YELLOW}📄 Running $sql_file as postgres user...${NC}"
    PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" -f "$sql_file"
}

# Function to run SQL file as app user
run_sql_as_user() {
    local sql_file="$1"
    echo -e "${YELLOW}📄 Running $sql_file as $DB_USER...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"
}

# Step 1: Drop existing database and user
echo -e "${YELLOW}🗑️  Dropping existing database and user...${NC}"
if [ -f "database/drop-database.sql" ]; then
    run_sql_as_postgres "database/drop-database.sql"
else
    echo -e "${RED}❌ Error: database/drop-database.sql not found!${NC}"
    exit 1
fi

# Step 2: Create database and user
echo -e "${YELLOW}🏗️  Creating database and user...${NC}"
if [ -f "database/create-database.sql" ]; then
    run_sql_as_postgres "database/create-database.sql"
else
    echo -e "${RED}❌ Error: database/create-database.sql not found!${NC}"
    exit 1
fi

# Step 3: Set up permissions
echo -e "${YELLOW}🔐 Setting up permissions...${NC}"
if [ -f "database/setup-permissions.sql" ]; then
    run_sql_as_user "database/setup-permissions.sql"
else
    echo -e "${RED}❌ Error: database/setup-permissions.sql not found!${NC}"
    exit 1
fi

# Step 4: Apply schema
echo -e "${YELLOW}🏗️  Applying database schema...${NC}"
if [ -f "database/schema.sql" ]; then
    run_sql_as_user "database/schema.sql"
    echo -e "${GREEN}✅ Schema applied successfully!${NC}"
else
    echo -e "${RED}❌ Error: database/schema.sql not found!${NC}"
    exit 1
fi

# Step 5: Verify setup
echo -e "${YELLOW}🔍 Verifying database setup...${NC}"
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
TRIP_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM trips;" 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Database reset completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Database Summary:${NC}"
echo "  • Database: $DB_NAME"
echo "  • User: $DB_USER"
echo "  • Tables created: $(echo $TABLE_COUNT | tr -d ' ')"
echo "  • Initial trips: $(echo $TRIP_COUNT | tr -d ' ')"
echo ""
echo -e "${GREEN}🎉 Ready for development!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "  • Run: npm start"
echo "  • Your app will connect to the fresh database"
echo "  • Add data through your app or run: npm run db:seed" 