# Configuration

This directory contains configuration files for the Gustavo application.

## Files

### `env.example`

Template for environment variables. Copy this to `.env.local` in the project
root for local development.

```bash
# Copy to project root
cp config/env.example .env.local
```

## Environment Setup

### Local Development

1. Copy `env.example` to `.env.local` in project root
2. Modify database settings if needed
3. Start development with `npm run dev:start`

### Production (Vercel)

Set these environment variables in your Vercel dashboard:

-   `NODE_ENV=production`
-   `DB_HOST=your-production-host`
-   `DB_PORT=5432`
-   `DB_NAME=your-production-db`
-   `DB_USER=your-production-user`
-   `DB_PASSWORD=your-production-password`

## Database Configuration

The application uses PostgreSQL with the following default local settings:

-   Host: `localhost`
-   Port: `5432`
-   Database: `gustavo_dev`
-   User: `gustavo_user`
-   Password: `gustavo_dev_password`

These settings work with the Docker PostgreSQL container defined in
`infra/docker-compose.yml`.
