# Script to create .env.local file for local development
# Run this after setting up your local PostgreSQL database

$envContent = @"
# Local Development Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gustavo_dev
DB_USER=gustavo_user
DB_PASSWORD=gustavo_dev_password
NODE_ENV=development
"@

$envFile = ".env.local"

if (Test-Path $envFile) {
    Write-Host "Warning: .env.local already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to overwrite it? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Cancelled. Your existing .env.local was not modified." -ForegroundColor Green
        exit
    }
}

$envContent | Out-File -FilePath $envFile -Encoding UTF8
Write-Host "Created .env.local file successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Contents:" -ForegroundColor Cyan
Get-Content $envFile | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
Write-Host ""
Write-Host "Note: Make sure your local PostgreSQL database is set up with these credentials." -ForegroundColor Yellow
Write-Host "Run: psql -U postgres -f scripts/setup-local-db.sql" -ForegroundColor White 