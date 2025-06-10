# App Suite

A multi-feature application suite

## Features

### Gustavo - Spending Tracker (`/gustavo`)

Track spending and split costs

## Architecture

This app is designed as a multi-feature suite:

-   **Root (`/`)**: Landing page with feature selection
-   **Gustavo (`/gustavo`)**: Spending tracker feature
-   **Future features**: Will be added at their own paths (e.g., `/feature2`,
    `/feature3`)

## Troubleshooting

### WSL Issues on Windows

If you encounter errors like
`execvpe(/bin/bash) failed: No such file or directory` when running npm scripts:

#### Problem

Your WSL default distribution might be set to `docker-desktop` which doesn't
include bash, causing bash-based npm scripts to fail.

#### Solution

1. Check your current WSL distributions:

    ```bash
    wsl --list --verbose
    wsl --status
    ```

2. If the default distribution is `docker-desktop`, change it to Ubuntu:

    ```bash
    wsl --set-default Ubuntu
    ```

3. Verify bash is available:

    ```bash
    wsl bash --version
    ```

4. Confirm the change:
    ```bash
    wsl --status
    ```

#### Expected Output

After fixing, `wsl --status` should show:

```
Default Distribution: Ubuntu
Default Version: 2
```

This change persists after PC restarts and allows all bash-based npm scripts
(`db:reset`, `db:migrate`, `db:seed`, etc.) to work properly.

## Deployment

### Vercel (Current)

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect this as a React app
3. Deploy!

The app is configured to run from the root path and `vercel.json` handles
client-side routing.

### GitHub Pages (Legacy)

To re-enable GitHub Pages deployment, add this to `package.json`:

```json
"homepage": "https://iwong3.github.io/gustavo/"
```

Then run:

```bash
npm run deploy
```

## Gustavo Feature To-Do:

Graphs

-   Line graph by person
    -   Clicking shows each person's spend on date
    -   Click to see bar totals vs. person lines
    -   Filter which person's line to show
-   Fix filter brightness not working on ios

UX

-   Dark mode

To-Do

-   Separate Google Sheet for tracking To-Do items

### Done

Receipts

-   Search bar
-   Scroll to top

Totals

-   Total spent
-   Compare person / spend type to total spent
    -   Compare to absolute total? Or total of current filters?

Graphs

-   Horizontally scrollable

UX

-   Collapse all receipts
-   Reset debt calculator
-   Show active filters
-   Protect against $NaN values as Google Sheets currency conversion sometimes
    fails
-   Log errors and add view to see which rows were affected
-   Link to View Only Google Sheet
-   Clicking on trip name should bring user back to trip menu

# Gustavo - Spending Tracker

## 🚀 Quick Start

### Setup

1. Install dependencies: `yarn install`
2. Copy environment template: `cp config/env.example .env.local`
3. Start database: `yarn docker:db`
4. Start development: `yarn start`

Visit [http://localhost:3000](http://localhost:3000) to view the app.

## 📋 Available Scripts

-   `yarn start` - Start full development environment
-   `yarn react` - Start React development server only
-   `yarn backend` - Start Express backend only
-   `yarn build` - Build for production
-   `yarn test` - Run tests
-   `yarn deploy` - Deploy to Vercel

## 🛠️ Development Setup

See [infra/README-Docker.md](infra/README-Docker.md) for detailed setup
instructions.

## 📂 Project Structure

```
gustavo/
├── frontend/          # React application
├── backend/           # Express development server
├── api/              # Vercel serverless functions
├── database/         # PostgreSQL schemas
├── infra/           # Docker configuration
├── config/          # Environment configuration
└── scripts/         # Utility scripts
```

## 🔧 Database

Uses PostgreSQL with Docker for local development:

-   Local: `yarn docker:db` (port 5432)
-   Production: Configured via Vercel environment variables

### Database Operations

#### Resetting the Database

To completely reset your local database (removes all data and recreates from
schema):

```bash
# Stop the database containers
docker-compose -f infra/docker-compose.yml down

# Remove database volumes (this deletes all data!)
docker volume rm infra_postgres_data infra_pgadmin_data infra_pgadmin_config

# Start fresh database
yarn docker:db
```

**⚠️ Warning:** This will permanently delete all local database data!

#### pgAdmin4 Access

pgAdmin4 is included for database management and runs alongside PostgreSQL:

-   **URL**: [http://localhost:8080](http://localhost:8080)
-   **Email**: `admin@example.com`
-   **Password**: `admin123`

**Connecting to Database in pgAdmin:**

1. Open [http://localhost:8080](http://localhost:8080)
2. Login with the credentials above
3. Right-click "Servers" → "Create" → "Server"
4. **General Tab**: Name: `Gustavo Local`
5. **Connection Tab**:
    - Host: `postgres` (container name)
    - Port: `5432`
    - Database: `gustavo_dev`
    - Username: `gus`
    - Password: `yellow_shirt_dev`
6. Click "Save"

## 🚀 Deployment

Automatic deployment via Vercel when pushing to main branch.

Manual deployment: `yarn deploy`

## 📚 Documentation

-   [Docker Setup Guide](infra/README-Docker.md)
-   [Database Configuration](config/README.md)
-   [Project TODO](TODO.md)
