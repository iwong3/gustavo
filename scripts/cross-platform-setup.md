# Cross-Platform Database Setup

Choose your preferred method based on your environment:

## 🪟 Windows Users

### Option 1: PowerShell (Recommended for Windows)

```bash
# Install PostgreSQL
npm run db:install

# Create environment file
npm run env:create
```

### Option 2: Bash (WSL/Git Bash)

```bash
# Install PostgreSQL
npm run db:install-bash

# Create environment file
npm run env:create-bash
```

### Option 3: Manual Setup

If you prefer to install PostgreSQL manually:

1. Download from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Set postgres user password to 'postgres'
4. Run: `npm run env:create` or `npm run env:create-bash`

## 🐧 Linux Users

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set postgres password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Create environment file
npm run env:create-bash
```

## 🍎 macOS Users

```bash
# Install PostgreSQL using Homebrew
brew install postgresql
brew services start postgresql

# Set postgres password
psql -U postgres -c "ALTER USER postgres PASSWORD 'postgres';"

# Create environment file
npm run env:create-bash
```

## 🔧 Common Setup Steps (All Platforms)

After installing PostgreSQL:

```bash
# 1. Create local database and user
npm run db:setup-local

# 2. Set up database schema
npm run db:schema-local

# 3. Test connection
npm run db:test-local

# 4. Start development
npm start
```

## 🤔 Which Shell Should I Use?

### Use PowerShell if:

-   ✅ You're on Windows and comfortable with PowerShell
-   ✅ You want the "native" Windows experience
-   ✅ You don't have WSL or Git Bash installed

### Use Bash if:

-   ✅ You're familiar with Linux/Unix commands
-   ✅ You want cross-platform scripts
-   ✅ You're using WSL, Git Bash, or macOS/Linux
-   ✅ You prefer the more universal bash syntax

## 🛠️ Installing Bash on Windows

### WSL (Windows Subsystem for Linux) - Recommended

```powershell
# Install WSL
wsl --install

# After restart, you'll have a full Linux environment
```

### Git Bash - Simpler option

1. Install Git for Windows: https://git-scm.com/download/win
2. Git Bash is included automatically
3. Right-click in any folder → "Git Bash Here"

## 🚨 Troubleshooting

### "bash: command not found"

-   **Windows**: Install WSL or Git Bash
-   **macOS**: bash is pre-installed
-   **Linux**: bash is pre-installed

### "powershell: command not found"

-   **Windows**: PowerShell is pre-installed
-   **macOS/Linux**: Install PowerShell Core (optional)

### Scripts won't run

```bash
# Make bash scripts executable
chmod +x scripts/*.sh

# Run with explicit bash
bash scripts/install-postgres-windows.sh
```

## 📋 Summary

| Platform          | Recommended Method                        |
| ----------------- | ----------------------------------------- |
| **Windows**       | PowerShell scripts (`npm run db:install`) |
| **Windows + WSL** | Bash scripts (`npm run db:install-bash`)  |
| **macOS**         | Bash scripts (`npm run db:install-bash`)  |
| **Linux**         | Bash scripts (`npm run db:install-bash`)  |

Both methods achieve the same result - choose what you're comfortable with! 🎯
