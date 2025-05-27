# Database Setup Instructions

This guide will help you set up AWS RDS PostgreSQL and migrate your data from
Google Sheets.

## Step 1: Create AWS RDS PostgreSQL Instance

1. **Go to AWS RDS Console**

    - Navigate to https://console.aws.amazon.com/rds/
    - Click "Create database"

2. **Configure Database**

    - Engine: PostgreSQL
    - Version: PostgreSQL 15.x (latest)
    - Template: Free tier (for testing) or Production (for live)
    - DB instance identifier: `gustavo-db`
    - Master username: `gustavo_admin`
    - Master password: (choose a secure password)

3. **Instance Configuration**

    - DB instance class: `db.t3.micro` (free tier) or larger
    - Storage: 20 GB (minimum)
    - Enable storage autoscaling if desired

4. **Connectivity**

    - VPC: Default VPC
    - Public access: Yes (for initial setup)
    - VPC security group: Create new or use existing
    - Database port: 5432

5. **Additional Configuration**
    - Initial database name: `gustavo`
    - Enable automated backups
    - Monitoring: Enable if desired

## Step 2: Configure Security Group

1. **Edit Security Group**
    - Go to EC2 > Security Groups
    - Find the security group for your RDS instance
    - Add inbound rule:
        - Type: PostgreSQL
        - Port: 5432
        - Source: Your IP address (for testing) or 0.0.0.0/0 (less secure)

## Step 3: Set Up Database Schema

1. **Connect to your database** using a PostgreSQL client (pgAdmin, DBeaver, or
   psql)

    - Host: Your RDS endpoint (found in RDS console)
    - Port: 5432
    - Database: gustavo
    - Username: gustavo_admin
    - Password: (your chosen password)

2. **Run the schema script**
    ```sql
    -- Copy and paste the contents of database/schema.sql
    ```

## Step 4: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# Database Configuration
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=gustavo
DB_USER=gustavo_admin
DB_PASSWORD=your-password
NODE_ENV=development
```

## Step 5: Install Dependencies

```bash
npm install
```

This will install the new PostgreSQL dependencies (`pg` and `@types/pg`).

## Step 6: Migrate Data from Google Sheets

```bash
# Run the migration script
npx ts-node scripts/migrate-from-sheets.ts
```

This script will:

-   Fetch all data from your existing Google Sheets
-   Create location records as needed
-   Insert all spending records into PostgreSQL
-   Preserve all relationships and data integrity

## Step 7: Test the API

Once deployed to Vercel, your API endpoints will be available at:

-   `GET /api/spends?trip=Japan2024` - Get all spends for a trip
-   `POST /api/spends` - Create a new spend record

## Step 8: Update Vercel Environment Variables

In your Vercel dashboard:

1. Go to your project settings
2. Add the same environment variables from your `.env.local`
3. Redeploy your application

## Security Notes

-   **Production**: Restrict security group to only allow connections from
    Vercel IPs
-   **SSL**: Enable SSL connections in production
-   **Credentials**: Use AWS Secrets Manager for production credentials
-   **Backup**: Enable automated backups and point-in-time recovery

## Troubleshooting

-   **Connection timeout**: Check security group rules
-   **Authentication failed**: Verify username/password
-   **SSL errors**: Set `NODE_ENV=production` for SSL connections
-   **Migration errors**: Check the console output for specific error messages
