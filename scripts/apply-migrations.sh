#!/usr/bin/env bash
# Apply Database Migrations
# Intelligently applies only migrations that haven't been run yet

set -e

echo "🔄 Applying database migrations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="gustavo_dev"
DB_USER="gustavo_user"
DB_PASSWORD="gustavo_dev_password"

# Override for production
if [ "$NODE_ENV" = "production" ]; then
    DB_HOST="$PROD_DB_HOST"
    DB_NAME="$PROD_DB_NAME"
    DB_USER="$PROD_DB_USER"
    DB_PASSWORD="$PROD_DB_PASSWORD"
fi

MIGRATION_DIR="database/migrations"
DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo -e "${BLUE}📋 Migration Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST"
echo "  Migration Dir: $MIGRATION_DIR"
echo ""

# Ensure migration tracking table exists
echo -e "${YELLOW}🔧 Ensuring migration tracking table exists...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    description TEXT
);"

# Get list of applied migrations
echo -e "${YELLOW}🔍 Checking applied migrations...${NC}"
APPLIED_MIGRATIONS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM schema_migrations ORDER BY version;" 2>/dev/null | tr -d ' ' || echo "")

echo "Applied migrations: ${APPLIED_MIGRATIONS:-none}"
echo ""

# Find and run new migrations
MIGRATIONS_RUN=0
for migration_file in "$MIGRATION_DIR"/*.sql; do
    if [ ! -f "$migration_file" ]; then
        echo -e "${YELLOW}⚠️  No migration files found in $MIGRATION_DIR${NC}"
        break
    fi
    
    version=$(basename "$migration_file" .sql)
    
    # Check if this migration has been applied
    if echo "$APPLIED_MIGRATIONS" | grep -q "^$version$"; then
        echo -e "${BLUE}⏭️  Skipping $version (already applied)${NC}"
        continue
    fi
    
    echo -e "${YELLOW}🏗️  Applying migration: $version${NC}"
    
    # Run the migration
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        # Record successful migration
        DESCRIPTION="Applied via migration script"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            INSERT INTO schema_migrations (version, description) 
            VALUES ('$version', '$DESCRIPTION');"
        
        echo -e "${GREEN}✅ Migration $version applied successfully${NC}"
        MIGRATIONS_RUN=$((MIGRATIONS_RUN + 1))
    else
        echo -e "${RED}❌ Migration $version failed - stopping${NC}"
        exit 1
    fi
    
    echo ""
done

echo -e "${GREEN}🎉 Migration run complete!${NC}"
echo "  Migrations applied: $MIGRATIONS_RUN"

# Show current migration status
echo ""
echo -e "${BLUE}📊 Current Migration Status:${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT version, applied_at, description 
FROM schema_migrations 
ORDER BY version;" 