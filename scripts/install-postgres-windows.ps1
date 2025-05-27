# PostgreSQL Installation Script for Windows
# This script will install PostgreSQL using Chocolatey

Write-Host "Installing PostgreSQL on Windows..." -ForegroundColor Green

# Check if Chocolatey is installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Chocolatey not found. Installing Chocolatey first..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Install PostgreSQL
Write-Host "Installing PostgreSQL..." -ForegroundColor Green
choco install postgresql --params '/Password:postgres' -y

# Add PostgreSQL to PATH if not already there
$pgPath = "C:\Program Files\PostgreSQL\16\bin"
if ($env:Path -notlike "*$pgPath*") {
    Write-Host "Adding PostgreSQL to PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$pgPath", [EnvironmentVariableTarget]::User)
    $env:Path += ";$pgPath"
}

Write-Host "PostgreSQL installation completed!" -ForegroundColor Green
Write-Host "Default superuser: postgres" -ForegroundColor Cyan
Write-Host "Default password: postgres" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open a new PowerShell window (to refresh PATH)" -ForegroundColor White
Write-Host "2. Run: psql -U postgres" -ForegroundColor White
Write-Host "3. Follow the database setup guide in scripts/setup-databases.md" -ForegroundColor White 