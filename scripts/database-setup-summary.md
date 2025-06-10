# Quick Database Setup Summary

## 🚀 Quick Start (Step by Step)

### 1. Install PostgreSQL locally

```bash
npm run db:install
```

_This will install PostgreSQL using Chocolatey and set the default password to
'postgres'_

### 2. Create local development database

```bash
npm run db:setup-local
```

_This creates the `gustavo_dev` database and `gustavo_user` with password
`gustavo_dev_password`_

### 3. Set up database schema locally

```bash
npm run db:schema-local
```

_This creates all the tables, enums, and initial data in your local database_

### 4. Create environment file

```bash
npm run env:create
```

_This creates `.env.local` with the correct local database configuration_

### 5. Test local connection

```bash
npm run db:test-local
```

_This verifies your local database is working correctly_

### 6. Set up Neon (Production) Database

1. **Get your Neon credentials:**

    - Go to https://console.neon.tech/
    - Select your project
    - Copy the connection details from "Connection Details"

2. **Set up Neon schema:**

    ```bash
    # Replace with your actual Neon credentials
    psql "postgresql://username:password@host/database?sslmode=require" -f database/schema.sql
    ```

3. **Configure Vercel environment variables:**
    - Go to your Vercel dashboard
    - Project Settings > Environment Variables
    - Add these variables:
        ```
        DB_HOST=your-neon-host.neon.tech
        DB_PORT=5432
        DB_NAME=your-neon-database-name
        DB_USER=your-neon-username
        DB_PASSWORD=your-neon-password
        NODE_ENV=production
        ```

## ✅ Verification

### Local Development:

-   Run `npm start` - should connect to local PostgreSQL
-   Check that your app can read/write to the local database

### Production:

-   Deploy to Vercel - should connect to Neon automatically
-   Test your production API endpoints

## 🔧 Troubleshooting

**PostgreSQL won't start?**

```bash
# Check if service is running
Get-Service postgresql*
# Start if needed
Start-Service postgresql-x64-16
```

**Connection refused?**

-   Make sure PostgreSQL service is running
-   Check if port 5432 is available
-   Verify credentials in `.env.local`

**Neon connection issues?**

-   Double-check credentials from Neon dashboard
-   Ensure you're using `sslmode=require`
-   Check Vercel environment variables

## 📁 Files Created

-   `scripts/setup-databases.md` - Detailed setup guide
-   `scripts/install-postgres-windows.ps1` - PostgreSQL installer
-   `scripts/setup-local-db.sql` - Local database setup
-   `scripts/create-env-local.ps1` - Environment file creator
-   `.env.local` - Local environment variables (created by script)

## 🎯 Next Steps

1. Start developing locally with `npm start`
2. Your app will use local PostgreSQL for development
3. When you deploy to Vercel, it will automatically use Neon
4. Both databases have the same schema and will work identically
