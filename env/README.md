# Environment Configuration

This directory contains environment-related configuration files and
documentation.

## Files

### `env.example`

Template file showing all required environment variables for local development
and production.

## Setup for Local Development

1. Copy `env.example` to `.env.local` in the project root:

    ```bash
    cp env/env.example .env.local
    ```

2. Update the values in `.env.local` according to your local setup

3. The `.env.local` file will be automatically loaded by Next.js during
   development

## Production Environment Variables

For production deployment (Vercel), set these environment variables in your
deployment platform:

-   `NODE_ENV=production`
-   `DATABASE_URL` (your production database connection string)
-   Any other production-specific variables listed in `env.example`

## Environment Variable Hierarchy

Next.js loads environment variables in the following order:

1. `.env.local` (always loaded, ignored by git)
2. `.env.development` (when NODE_ENV is development)
3. `.env.production` (when NODE_ENV is production)
4. `.env` (always loaded)

For more information, see
[Next.js Environment Variables documentation](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables).
