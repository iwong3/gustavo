# 📋 Gustavo App Setup To-Do List

## 🎯 **Goal 1: Local Development with Local Data**

### **Option A: With Docker (Preferred)**

-   [ ] **Fix Docker Desktop**

    -   [ ] Try restarting computer + run Docker as Admin
    -   [ ] If still broken: Uninstall → Restart → Reinstall Docker Desktop
    -   [ ] Alternative: Use Docker CLI only (skip Desktop UI)

-   [ ] **Set Up Local Environment**
    -   [ ] Copy environment: `cp config/env.example .env.local`
    -   [ ] Start PostgreSQL: `yarn docker:db`
    -   [ ] Verify database: `yarn docker:db-logs`

### **Option B: Without Docker (Fallback)**

-   [ ] **Use Your Local PostgreSQL 17.5**
    -   [ ] Create database: `gustavo_dev`
    -   [ ] Create user: `gustavo_user` with password `gustavo_dev_password`
    -   [ ] Update `.env.local` to point to local PostgreSQL
    -   [ ] Run schema: `yarn db:schema-local`

### **Start Development Servers**

-   [ ] **Install dependencies**: `yarn install`
-   [ ] **Start API server**: `yarn backend` (Terminal 1)
-   [ ] **Start React app**: `yarn start` (Terminal 2)
-   [ ] **Test everything**:
    -   [ ] React app: http://localhost:3000
    -   [ ] API health: http://localhost:3001/api/health
    -   [ ] Database connection works

---

## 🌐 **Goal 2: Deploy to Vercel**

### **Set Up Production Database**

-   [ ] **Choose cloud PostgreSQL provider**:
    -   [ ] AWS RDS PostgreSQL 17.5, OR
    -   [ ] Railway PostgreSQL 17.5, OR
    -   [ ] Supabase PostgreSQL 17.5
-   [ ] **Create production database**
-   [ ] **Run schema on production database**
-   [ ] **Note connection details** (host, port, database, user, password)

### **Configure Vercel**

-   [ ] **Create Vercel account** (if not done)
-   [ ] **Connect GitHub repo to Vercel**
-   [ ] **Set environment variables** in Vercel Dashboard:
    ```
    NODE_ENV=production
    DB_HOST=your-production-host
    DB_PORT=5432
    DB_NAME=your-production-db
    DB_USER=your-production-user
    DB_PASSWORD=your-production-password
    ```

### **Deploy**

-   [ ] **Test build locally**: `yarn build`
-   [ ] **Push to GitHub**: `git push origin main`
-   [ ] **Verify deployment** works on Vercel
-   [ ] **Test production APIs** work with production database

---

## 🚀 **Development Workflow (Once Set Up)**

### **Daily Development**

-   [ ] Start database: `yarn docker:db` (or use local PostgreSQL)
-   [ ] Start servers: `yarn start`
-   [ ] Code, test, commit
-   [ ] Deploy: `git push origin main` → Auto-deploys to Vercel

### **File Structure (Already Done! ✅)**

```
gustavo/
├── frontend/          # React app
├── api/              # Vercel functions
├── database/         # Schemas & migrations
├── infra/           # Docker configs
├── config/          # Environment files
└── [root files]     # package.json, etc.
```

---

## 🛠️ **If You Get Stuck**

### **Docker Issues**

-   Try Docker CLI without Desktop UI
-   Use local PostgreSQL as fallback
-   Docker isn't required for Vercel deployment

### **Database Issues**

-   Verify PostgreSQL 17.5 is running locally
-   Check connection settings in `.env.local`
-   Test with `yarn db:test-local`

### **Vercel Issues**

-   Check environment variables are set correctly
-   Verify build works locally first
-   Check Vercel logs: `npx vercel logs`

---

## 📚 **Resources You Have**

-   ✅ **README-Docker.md** - Complete setup guide
-   ✅ **config/README.md** - Environment configuration
-   ✅ **Updated package.json** - All scripts ready
-   ✅ **Organized folder structure** - Clean and scalable

**Priority: Fix Docker first, then everything else should flow smoothly!** 🎯

---

## 📝 **Notes**

-   Delete this TODO.md file once you've completed the setup
-   Your project structure is already organized and ready to go
-   All configuration files have been updated for the new folder structure
-   PostgreSQL is configured to use version 17.5 to match your local
    installation

## **Ivan's To-Dos**

-   Fix Docker
-   Download Postgres GUI
-   Consider adding a way to connect local app to prod DB
-   Clean up scripts
-   Get app running
-   Clean up migrations
-   Figure out schema (flexible for storing different data)
-   Explore prisma or other ORMs

## 🚀 **Quick Setup Checklist (New Developers)**

### **Database Setup**

-   [ ] Install PostgreSQL locally OR start Docker:
    -   [ ] Start PostgreSQL: `yarn docker:db`
    -   [ ] Verify database: `yarn docker:db-logs`
-   [ ] Create local database and schema:
    -   [ ] Create environment file: `cp config/env.example .env.local`
    -   [ ] Set up database: `yarn db:setup-local`
    -   [ ] Run schema: `yarn db:schema-local`

### **Development**

-   [ ] **Install dependencies**: `yarn install`
-   [ ] **Start API server**: `yarn backend` (Terminal 1)
-   [ ] **Start React app**: `yarn start` (Terminal 2)
-   [ ] **Visit**: http://localhost:3000

### **Production Database Setup (Neon)**

-   [ ] **Create Neon database** at https://console.neon.tech/
-   [ ] **Apply schema** to Neon database (copy/paste from
        `database/schema.sql`)
-   [ ] **Set environment variables** in Vercel Dashboard:
    ```
    NODE_ENV=production
    DB_HOST=your-production-host
    DB_PORT=5432
    DB_NAME=your-production-db
    DB_USER=your-production-user
    DB_PASSWORD=your-production-password
    ```

### **Deploy**

-   [ ] **Test build locally**: `yarn build`
-   [ ] **Push to GitHub**: `git push origin main`
-   [ ] **Verify deployment** works on Vercel
-   [ ] **Test production APIs** work with production database

---

## 🚀 **Development Workflow (Once Set Up)**

### **Daily Development**

-   [ ] Start database: `yarn docker:db` (or use local PostgreSQL)
-   [ ] Start servers: `yarn start`
-   [ ] Code, test, commit
-   [ ] Deploy: `git push origin main` → Auto-deploys to Vercel

## Ivan

-   [ ] Consider using Next.js instead of Express
-   [ ] Get Prisma installed
