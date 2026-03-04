#!/usr/bin/env bash
# Start all local development services:
#   - Docker (Postgres + Metabase)
#   - Next.js dev server
#
# Usage: pnpm start:local

set -e

echo "Starting Docker services..."
docker compose -f infra/docker-compose.yml up -d

echo "Docker services running:"
echo "  Postgres   → localhost:5432"
echo "  Metabase   → localhost:3001"
echo ""
echo "Starting Next.js..."
pnpm dev
