# Database Reset and Migration Script (PowerShell)
# This script will completely reset your local database and apply the schema

param(
    [switch]$Force,
    [switch]$Quiet
)

# Database configuration
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "gustavo_dev"
$DB_USER = "gustavo_user"
$DB_PASSWORD = "gustavo_dev_password"
$POSTGRES_USER = "postgres"
$POSTGRES_PASSWORD = "postgres"

Write-Host "🔄 Resetting local database..." -ForegroundColor Cyan

if (-not $Force -and -not $Quiet) {
    Write-Host "📋 Database Reset Plan:" -ForegroundColor Blue
    Write-Host "  1. Drop existing database and user"
    Write-Host "  2. Create database and user"
    Write-Host "  3. Set up permissions"
    Write-Host "  4. Apply schema"
    Write-Host "  5. Verify setup"
    Write-Host ""
    
    $confirmation = Read-Host "This will completely reset your local database. Continue? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "❌ Operation cancelled." -ForegroundColor Red
        exit 0
    }
}

# Function to run SQL file as postgres user
function Invoke-SqlAsPostgres {
    param([string]$SqlFile)
    
    Write-Host "📄 Running $SqlFile as postgres user..." -ForegroundColor Yellow
    $env:PGPASSWORD = $POSTGRES_PASSWORD
    $result = psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER -f $SqlFile 2>&1
    $env:PGPASSWORD = $null
    
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed: $result"
    }
    return $result
}

# Function to run SQL file as app user
function Invoke-SqlAsUser {
    param([string]$SqlFile)
    
    Write-Host "📄 Running $SqlFile as $DB_USER..." -ForegroundColor Yellow
    $env:PGPASSWORD = $DB_PASSWORD
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $SqlFile 2>&1
    $env:PGPASSWORD = $null
    
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed: $result"
    }
    return $result
}

try {
    # Step 1: Drop existing database and user
    Write-Host "🗑️  Dropping existing database and user..." -ForegroundColor Yellow
    if (Test-Path "database/drop-database.sql") {
        Invoke-SqlAsPostgres "database/drop-database.sql"
    } else {
        throw "❌ Error: database/drop-database.sql not found!"
    }

    # Step 2: Create database and user
    Write-Host "🏗️  Creating database and user..." -ForegroundColor Yellow
    if (Test-Path "database/create-database.sql") {
        Invoke-SqlAsPostgres "database/create-database.sql"
    } else {
        throw "❌ Error: database/create-database.sql not found!"
    }

    # Step 3: Set up permissions
    Write-Host "🔐 Setting up permissions..." -ForegroundColor Yellow
    if (Test-Path "database/setup-permissions.sql") {
        Invoke-SqlAsUser "database/setup-permissions.sql"
    } else {
        throw "❌ Error: database/setup-permissions.sql not found!"
    }

    # Step 4: Apply schema
    Write-Host "🏗️  Applying database schema..." -ForegroundColor Yellow
    if (Test-Path "database/schema.sql") {
        Invoke-SqlAsUser "database/schema.sql"
        Write-Host "✅ Schema applied successfully!" -ForegroundColor Green
    } else {
        throw "❌ Error: database/schema.sql not found!"
    }

    # Step 5: Verify setup
    Write-Host "🔍 Verifying database setup..." -ForegroundColor Yellow
    $env:PGPASSWORD = $DB_PASSWORD
    $tableCount = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null
    $tripCount = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM trips;" 2>$null
    $env:PGPASSWORD = $null

    if (-not $tripCount) { $tripCount = "0" }

    Write-Host ""
    Write-Host "✅ Database reset completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Database Summary:" -ForegroundColor Blue
    Write-Host "  • Database: $DB_NAME"
    Write-Host "  • User: $DB_USER"
    Write-Host "  • Tables created: $($tableCount.Trim())"
    Write-Host "  • Initial trips: $($tripCount.Trim())"
    Write-Host ""
    Write-Host "🎉 Ready for development!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Next steps:" -ForegroundColor Blue
    Write-Host "  • Run: npm start"
    Write-Host "  • Your app will connect to the fresh database"
    Write-Host "  • Add data through your app or run: npm run db:seed"

} catch {
    Write-Host ""
    Write-Host "❌ Error during database reset: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  • Make sure PostgreSQL is running"
    Write-Host "  • Check that psql is in your PATH"
    Write-Host "  • Verify postgres user password is 'postgres'"
    exit 1
} 