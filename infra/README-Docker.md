# Local Development + Vercel Deployment Guide

This guide shows you how to run the Gustavo app locally with local data, and
deploy to Vercel for production.

## 🎯 **Architecture Overview**

### **Local Development** (Your Machine)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Express API   │    │   PostgreSQL    │
│   localhost:3000│◄──►│   localhost:3001│◄──►│   localhost:5432│
│   Hot Reload    │    │   Local APIs    │    │   Docker        │
│   Local Data    │    │   Local Data    │    │   Local Data    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Production** (Vercel)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   API Functions │    │   PostgreSQL    │
│   Vercel CDN    │◄──►│   Vercel Edge   │◄──►│   Production DB │
│   Static Build  │    │   Serverless    │    │   Cloud/RDS     │
│   Prod Data     │    │   Prod Data     │    │   Prod Data     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 **Quick Start**

### **1. Install Dependencies**

```bash
npm install
```

### **2. Set Up Local Environment**

```bash
# Copy environment template
cp config/env.example .env.local

# Start PostgreSQL in Docker
npm run dev:setup
```

### **3. Start Development**

```bash
# Option A: Start everything at once
npm run dev:start

# Option B: Start in separate terminals (recommended)
# Terminal 1: API Server
npm run start:server

# Terminal 2: React App
npm start
```

### **4. Access Your Local App**

-   **React App**: http://localhost:3000
-   **API**: http://localhost:3001/api
-   **Health Check**: http://localhost:3001/api/health

## 📋 **Development Commands**

```bash
# === SETUP ===
npm run dev:setup          # Start database + show next steps
cp config/env.example .env.local   # Create your environment file

# === DEVELOPMENT ===
npm run dev:start           # Start API + React together
npm run start:server        # Start API server only
npm start                   # Start React only
npm run dev:api-only        # Start database + API only

# === DATABASE ===
npm run docker:db           # Start PostgreSQL
npm run docker:db-down      # Stop PostgreSQL
npm run docker:db-logs      # View database logs

# === TESTING ===
npm run local:build-and-serve  # Test production build locally
npm test                    # Run React tests

# === DEPLOYMENT ===
npm run build              # Build for production
npm run vercel:deploy      # Deploy to Vercel
```

## 🔧 **Environment Configuration**

### **Local Development (.env.local)**

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gustavo_dev
DB_USER=gus
DB_PASSWORD=yellow_shirt_dev
REACT_APP_API_URL=http://localhost:3001/api
PORT=3001
```

### **Vercel Production (Dashboard Settings)**

Set these in Vercel Dashboard → Settings → Environment Variables:

```env
NODE_ENV=production
DB_HOST=your-production-db-host.com
DB_PORT=5432
DB_NAME=your_production_db_name
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
```

## 🌐 **Deployment to Vercel**

### **Option 1: Automatic (Recommended)**

```bash
# Connect your GitHub repo to Vercel
# Every push to main branch auto-deploys
git push origin main
```

### **Option 2: Manual Deploy**

```bash
# Install Vercel CLI (already included in devDependencies)
npm install

# Deploy to production
npm run vercel:deploy
```

### **First Time Setup**

1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Set environment variables in Vercel dashboard
4. Deploy!

## 🗄️ **Database Management**

### **Local Database (Docker)**

```bash
# Connect to local database
docker exec -it gustavo-postgres psql -U gus -d gustavo_dev

# Reset local database
npm run docker:db-down
docker volume rm gustavo_postgres_data
npm run docker:db

# Run migrations locally
npm run db:schema-local
```

### **Production Database**

-   Set up your production PostgreSQL (AWS RDS, Railway, Supabase, etc.)
-   Add connection details to Vercel environment variables
-   Your API functions will automatically connect to production DB

## 🔄 **Daily Development Workflow**

### **Starting Your Day**

```bash
# 1. Start database
npm run docker:db

# 2. Start development servers
npm run dev:start

# 3. Start coding! 🎉
```

### **Making Changes**

-   Edit React components → Hot reload at localhost:3000
-   Edit API functions → Server restarts automatically
-   Edit database schema → Run migrations locally

### **Testing Before Deploy**

```bash
# Test production build locally
npm run local:build-and-serve
# Visit http://localhost:3001
```

### **Deploying**

```bash
# Commit your changes
git add .
git commit -m "Your changes"
git push origin main

# Vercel auto-deploys! ✨
```

## 🐛 **Troubleshooting**

### **Database Issues**

```bash
# Check if PostgreSQL is running
docker ps

# View database logs
npm run docker:db-logs

# Reset database
npm run docker:db-down
docker volume rm gustavo_postgres_data
npm run docker:db
```

### **API Issues**

```bash
# Test API health
curl http://localhost:3001/api/health

# Check server logs
# Look for "🚀 Local development server running on port 3001"
```

### **Build Issues**

```bash
# Clear React cache
rm -rf node_modules/.cache
npm start

# Clear all and reinstall
rm -rf node_modules
npm install
```

### **Vercel Deployment Issues**

```bash
# Check Vercel logs
npx vercel logs

# Redeploy
npm run vercel:deploy
```

## 📁 **Project Structure**

```
gustavo/
├── frontend/               # React application (renamed from src/)
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── helpers/          # Utility functions
│   ├── views/            # View components
│   └── routes/           # Routing configuration
├── api/                   # Vercel serverless functions
│   ├── spends.ts         # API endpoints (used by both local & Vercel)
│   └── database.ts       # Database connection
├── database/              # Database schema & migrations
│   ├── migrations/       # Database migrations
│   └── setup/           # Database setup scripts
├── infra/                # Infrastructure & deployment
│   ├── docker-compose.yml    # PostgreSQL for local development
│   ├── docker-compose.override.yml  # Local overrides
│   ├── Dockerfile        # Container configuration
│   └── .dockerignore     # Docker build exclusions
├── config/               # Configuration files
│   └── env.example       # Environment template
├── docs/                 # Documentation
├── scripts/              # Build and utility scripts
├── public/               # Static assets
├── vercel.json           # Vercel configuration
├── .env.local            # Your local environment (create this)
└── package.json          # Scripts and dependencies
```

## 🎯 **Benefits of This Setup**

✅ **Fast Local Development**: Hot reload, instant feedback  
✅ **Isolated Local Data**: Test without affecting production  
✅ **Easy Deployment**: Push to deploy  
✅ **Same Codebase**: API functions work locally and on Vercel  
✅ **Consistent Database**: Same PostgreSQL version everywhere  
✅ **Simple Debugging**: All logs visible locally  
✅ **Organized Structure**: Clear separation of concerns

## 🚀 **Next Steps**

1. **Set up your production database** (AWS RDS, Railway, Supabase)
2. **Configure Vercel environment variables**
3. **Connect your GitHub repo to Vercel**
4. **Start developing!**

Your local environment is completely separate from production, so you can
experiment freely! 🎉
