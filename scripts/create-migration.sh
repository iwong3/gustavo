#!/usr/bin/env bash
# Migration Creation Helper
# Creates a new migration file with proper 5-digit naming

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if description is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <migration_description>${NC}"
    echo -e "${BLUE}Example: $0 add_user_preferences${NC}"
    exit 1
fi

DESCRIPTION=$1

# Find the next migration number
MIGRATIONS_DIR="database/migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${YELLOW}Creating migrations directory...${NC}"
    mkdir -p "$MIGRATIONS_DIR"
fi

# Get the highest existing migration number
HIGHEST_NUM=$(ls "$MIGRATIONS_DIR" 2>/dev/null | grep -E '^[0-9]{5}_' | sed 's/^0*//' | sed 's/_.*//' | sort -n | tail -1)

if [ -z "$HIGHEST_NUM" ]; then
    NEXT_NUM=1
else
    NEXT_NUM=$((HIGHEST_NUM + 1))
fi

# Format with leading zeros (5 digits)
FORMATTED_NUM=$(printf "%05d" $NEXT_NUM)

# Create filename
FILENAME="${FORMATTED_NUM}_${DESCRIPTION}.sql"
FILEPATH="$MIGRATIONS_DIR/$FILENAME"

# Create migration file template
cat > "$FILEPATH" << EOF
-- Migration $FORMATTED_NUM: $DESCRIPTION
-- Created: $(date '+%Y-%m-%d %H:%M:%S')

-- Set search path to use gustavo schema by default
SET search_path TO gustavo, public;

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name TEXT NOT NULL,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- CREATE INDEX idx_example_table_name ON example_table(name);

-- Remember to:
-- 1. Test your migration on a copy of production data
-- 2. Make the migration reversible when possible
-- 3. Keep migrations focused and atomic
-- 4. Update seed data if needed
-- 5. Tables will be created in 'gustavo' schema automatically
EOF

echo -e "${GREEN}✅ Migration created: $FILEPATH${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Edit the migration file with your SQL"
echo "  2. Test the migration: npm run db:migrate"
echo "  3. Update seed data if needed"
echo ""
echo -e "${YELLOW}Migration naming convention:${NC}"
echo "  • 5-digit sequential numbering (00001, 00002, etc.)"
echo "  • Descriptive names with underscores"
echo "  • Examples: add_user_roles, create_audit_table, modify_user_schema" 