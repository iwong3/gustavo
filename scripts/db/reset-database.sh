#!/usr/bin/env bash
# Windows-compatible Database Reset Script
# This script works with Docker Desktop on Windows

set -e  # Exit on any error

echo "🔄 Resetting local database (Windows Docker)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="${DB_NAME:-gustavo_dev}"
DB_USER="${DB_USER:-gus}"
DB_PASSWORD="${DB_PASSWORD:-yellow_shirt_dev}"

echo -e "${BLUE}📋 Database Reset Plan:${NC}"
echo "  1. Ensure containers are running"
echo "  2. Drop and recreate gustavo_dev database (metabase DB preserved)"
echo "  3. Run migrations"
echo "  4. Load seed data"
echo "  5. Verify setup"
echo ""

# Function to run SQL inside container
run_sql_in_container() {
    local sql_command="$1"
    local description="$2"
    echo -e "${YELLOW}📄 $description...${NC}"
    if docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "$sql_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $description completed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Error: $description failed!${NC}"
        return 1
    fi
}

# Function to run SQL file inside container
run_sql_file_in_container() {
    local sql_file="$1"
    local description="$2"
    echo -e "${YELLOW}📄 $description...${NC}"
    if [ -f "$sql_file" ]; then
        if docker exec -i -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$sql_file" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $description completed!${NC}"
            return 0
        else
            echo -e "${RED}❌ Error: $description failed!${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Error: $sql_file not found!${NC}"
        return 1
    fi
}

# Step 1: Ensure containers are running
echo -e "${YELLOW}🏗️  Ensuring containers are running...${NC}"
docker-compose -f infra/docker-compose.yml up -d

# Step 2: Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is ready!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ Error: Database failed to start after 60 seconds!${NC}"
    echo -e "${YELLOW}💡 Try running: docker logs gustavo-postgres${NC}"
    exit 1
fi

# Step 3: Drop and recreate gustavo_dev database only (preserves metabase database)
echo -e "${YELLOW}🗑️  Dropping and recreating ${DB_NAME}...${NC}"
docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" > /dev/null 2>&1
docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};" > /dev/null 2>&1
docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" > /dev/null 2>&1
echo -e "${GREEN}✅ Database recreated!${NC}"

# Step 5: Run migrations using docker exec
echo -e "${YELLOW}🏗️  Running migrations...${NC}"

# Find all migration files and sort them
MIGRATION_DIR="database/migrations"
if [ -d "$MIGRATION_DIR" ]; then
    MIGRATION_FILES=$(find "$MIGRATION_DIR" -name "*.sql" | sort)
    
    if [ -z "$MIGRATION_FILES" ]; then
        echo -e "${YELLOW}⚠️  No migration files found in $MIGRATION_DIR${NC}"
    else
        echo -e "${BLUE}📋 Found migrations:${NC}"
        for migration in $MIGRATION_FILES; do
            echo "  • $(basename "$migration")"
        done
        echo ""
        
        # Create migration tracking table
        run_sql_in_container "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW());" "Creating schema_migrations table"

        # Run each migration and track it
        for migration in $MIGRATION_FILES; do
            migration_name=$(basename "$migration")
            migration_version=$(basename "$migration" .sql)
            run_sql_file_in_container "$migration" "Running migration: $migration_name"
            run_sql_in_container "INSERT INTO schema_migrations (version) VALUES ('$migration_version') ON CONFLICT DO NOTHING;" "Tracking migration: $migration_version"
        done
    fi
else
    echo -e "${YELLOW}⚠️  Migration directory $MIGRATION_DIR not found, skipping migrations...${NC}"
fi

# Step 6: Load seed data using docker exec
echo -e "${YELLOW}🌱 Loading seed data...${NC}"

# Find all seed files and sort them
SEED_DIR="database/seeds"
if [ -d "$SEED_DIR" ]; then
    SEED_FILES=$(find "$SEED_DIR" -name "*.sql" | sort)
    
    if [ -z "$SEED_FILES" ]; then
        echo -e "${YELLOW}⚠️  No seed files found in $SEED_DIR${NC}"
    else
        echo -e "${BLUE}📋 Found seed files:${NC}"
        for seed in $SEED_FILES; do
            echo "  • $(basename "$seed")"
        done
        echo ""
        
        # Run each seed file
        for seed in $SEED_FILES; do
            seed_name=$(basename "$seed")
            run_sql_file_in_container "$seed" "Loading seed data: $seed_name"
        done
    fi
else
    echo -e "${YELLOW}⚠️  Seed directory $SEED_DIR not found, skipping seed data...${NC}"
fi

# Step 7: Verify setup
echo -e "${YELLOW}🔍 Verifying database setup...${NC}"

# Count all tables
ALL_TABLES=$(docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

# Count rows in key tables if they exist
USER_COUNT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
TRIP_COUNT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM trips;" 2>/dev/null | tr -d ' ' || echo "0")
LOCATION_COUNT=$(docker exec -e PGPASSWORD="$DB_PASSWORD" gustavo-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM locations;" 2>/dev/null | tr -d ' ' || echo "0")

echo -e "${GREEN}✅ Database reset completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Database Summary:${NC}"
echo "  • Database: $DB_NAME"
echo "  • User: $DB_USER"
echo "  • Total tables: $ALL_TABLES"
echo "  • Users: $USER_COUNT"
echo "  • Trips: $TRIP_COUNT"
echo "  • Locations: $LOCATION_COUNT"
echo ""
echo -e "${GREEN}🎉 Ready for development!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "  • Run: npm run dev"
echo "  • Your app will connect to the fresh database"
echo "  • Database is fully reset and ready to use" 