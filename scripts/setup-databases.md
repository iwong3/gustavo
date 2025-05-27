# Database Setup Guide

This guide will help you set up both your Neon database (production) and local
PostgreSQL (development).

## 1. Set up Local PostgreSQL for Development

### Install PostgreSQL locally

**Windows (using Chocolatey):**

```bash
choco install postgresql
```

**Windows (using installer):** Download from
https://www.postgresql.org/download/windows/

**macOS (using Homebrew):**

```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create local database

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database and user
CREATE DATABASE gustavo_dev;
CREATE USER gustavo_user WITH PASSWORD 'your_local_password';
GRANT ALL PRIVILEGES ON DATABASE gustavo_dev TO gustavo_user;
\q
```

### Set up local schema

```bash
# Run the schema on your local database
psql -U gustavo_user -d gustavo_dev -f database/schema.sql
```

## 2. Configure Environment Variables

### Create `.env.local` file (for development)

Create a `.env.local` file in your project root:

```env
# Local Development Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gustavo_dev
DB_USER=gustavo_user
DB_PASSWORD=your_local_password
NODE_ENV=development
```

### Configure Vercel Environment Variables (for production)

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add the following variables:

```env
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_NAME=your-neon-database-name
DB_USER=your-neon-username
DB_PASSWORD=your-neon-password
NODE_ENV=production
```

## 3. Get Your Neon Database Credentials

1. Go to your Neon dashboard: https://console.neon.tech/
2. Select your project
3. Go to the "Connection Details" section
4. Copy the connection details:
    - **Host**: Something like `ep-xxx-xxx.us-east-1.aws.neon.tech`
    - **Database**: Usually your project name
    - **Username**: Usually your project name with a suffix
    - **Password**: The password you set when creating the database

## 4. Set up Neon Database Schema

You have two options:

### Option A: Using psql (recommended)

```bash
# Connect to your Neon database
psql "postgresql://username:password@host/database?sslmode=require"

# Run the schema
\i database/schema.sql
\q
```

### Option B: Using Neon Console

1. Go to your Neon dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Execute the script

## 5. Test Your Connections

### Test local connection:

```bash
# Test local database connection
psql -U gustavo_user -d gustavo_dev -c "SELECT version();"
```

### Test Neon connection:

```bash
# Test Neon database connection
psql "postgresql://username:password@host/database?sslmode=require" -c "SELECT version();"
```

## 6. Update Your Database Configuration (Optional Enhancement)

Your current `api/database.ts` is already set up correctly! It will:

-   Use local PostgreSQL when `NODE_ENV=development`
-   Use Neon when `NODE_ENV=production`
-   Handle SSL connections automatically

## 7. Development Workflow

-   **Local development**: Use `npm start` - connects to local PostgreSQL
-   **Production deployment**: Deploy to Vercel - connects to Neon automatically

## Troubleshooting

### Local PostgreSQL Issues:

-   **Connection refused**: Make sure PostgreSQL service is running
-   **Authentication failed**: Check username/password in `.env.local`
-   **Database doesn't exist**: Make sure you created the `gustavo_dev` database

### Neon Issues:

-   **SSL errors**: Make sure you're using `sslmode=require` in connection
    string
-   **Connection timeout**: Check if your IP is allowed (Neon usually allows all
    IPs by default)
-   **Authentication failed**: Double-check credentials from Neon dashboard

### Environment Variables:

-   **Variables not loading**: Make sure `.env.local` is in your project root
-   **Production variables**: Make sure they're set in Vercel dashboard, not in
    code

## Security Notes

-   ✅ `.env.local` is in `.gitignore` - your local credentials won't be
    committed
-   ✅ Production credentials are in Vercel environment variables - secure
-   ✅ SSL is enabled for production connections
-   ✅ Local development uses separate database from production
