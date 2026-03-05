#!/bin/sh
# Script to create .env.local file for local development
# Run this after setting up your local PostgreSQL database

ENV_FILE=".env.local"

# Environment file content
ENV_CONTENT="# Local Development Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gustavo_dev
DB_USER=gus
DB_PASSWORD=yellow_shirt_dev
NODE_ENV=development"

# Check if .env.local already exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  Warning: .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Cancelled. Your existing .env.local was not modified."
        exit 0
    fi
fi

# Create the .env.local file
echo "$ENV_CONTENT" > "$ENV_FILE"

echo "✅ Created .env.local file successfully!"
echo ""
echo "📋 Contents:"
while IFS= read -r line; do
    echo "  $line"
done < "$ENV_FILE"
echo ""
echo "⚠️  Note: Make sure your local PostgreSQL database is set up with these credentials."
echo "🔧 Run: npm run db:setup-local" 