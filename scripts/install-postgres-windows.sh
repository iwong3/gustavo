#!/bin/bash
# PostgreSQL Installation Script for Windows (using bash)
# Works with WSL, Git Bash, or MSYS2

echo "🐘 Installing PostgreSQL on Windows..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "📋 Detected WSL - Installing PostgreSQL for Linux..."
    
    # Update package list
    sudo apt update
    
    # Install PostgreSQL
    sudo apt install -y postgresql postgresql-contrib
    
    # Start PostgreSQL service
    sudo service postgresql start
    
    # Set password for postgres user
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
    
    echo "✅ PostgreSQL installed successfully in WSL!"
    echo "🔑 Default superuser: postgres"
    echo "🔑 Default password: postgres"
    echo ""
    echo "📝 Next steps:"
    echo "1. Run: psql -U postgres -h localhost"
    echo "2. Follow the database setup guide in scripts/setup-databases.md"
    
elif command_exists choco; then
    echo "📋 Detected Chocolatey - Installing PostgreSQL..."
    choco install postgresql --params '/Password:postgres' -y
    
    echo "✅ PostgreSQL installed successfully!"
    echo "🔑 Default superuser: postgres"
    echo "🔑 Default password: postgres"
    
elif command_exists winget; then
    echo "📋 Using winget to install PostgreSQL..."
    winget install PostgreSQL.PostgreSQL
    
    echo "✅ PostgreSQL installed successfully!"
    echo "⚠️  You may need to set the postgres user password manually"
    
else
    echo "❌ No package manager found!"
    echo "Please install one of the following:"
    echo "  • WSL: wsl --install"
    echo "  • Chocolatey: https://chocolatey.org/install"
    echo "  • Or download PostgreSQL manually: https://www.postgresql.org/download/windows/"
    exit 1
fi

echo ""
echo "🎯 Next steps:"
echo "1. Run: npm run db:setup-local"
echo "2. Run: npm run db:schema-local"
echo "3. Run: npm run env:create" 