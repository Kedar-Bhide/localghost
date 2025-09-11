# Getting Started with LocalGhost

This guide will help you set up the LocalGhost development environment and get your first instance running.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18.x or higher** - [Download](https://nodejs.org/)
- **Python 3.11 or higher** - [Download](https://python.org/)
- **Git** - [Download](https://git-scm.com/)
- **A code editor** (VS Code recommended)

## 🚀 Quick Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd localghost
```

### 2. Run the Setup Script
```bash
./scripts/dev/setup.sh
```

This script will:
- Install backend dependencies in a virtual environment
- Install frontend dependencies via npm
- Set up the basic project structure

### 3. Configure Environment Variables

#### Root Configuration
```bash
cp .env.example .env
```

#### Frontend Configuration
```bash
cd frontend
cp .env.local.example .env.local
```

#### Backend Configuration
```bash
cd backend
cp .env.example .env
```

### 4. Set Up Your Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your database URL from the project settings
3. Update your `.env` files with the database connection details
4. Run the database migrations:
   ```bash
   cd backend
   source venv/bin/activate
   alembic upgrade head
   ```

### 5. Start the Development Servers

#### Terminal 1 - Backend API
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

### 6. Verify Everything Works

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Manual Setup (Alternative)

If the setup script doesn't work for your system, follow these manual steps:

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements/dev.txt
```

### Frontend Setup
```bash
cd frontend
npm install
```

## 🏗️ Project Architecture Overview

```
localghost/
├── frontend/          # Next.js application
│   ├── components/    # Reusable React components
│   ├── pages/         # Next.js pages/routes
│   ├── lib/           # Utilities and configurations
│   └── styles/        # CSS and styling
├── backend/           # FastAPI application
│   ├── app/           # Main application code
│   │   ├── api/       # API routes
│   │   ├── models/    # Database models
│   │   └── services/  # Business logic
│   ├── tests/         # Test suite
│   └── alembic/       # Database migrations
└── docs/              # Documentation
```

## 🧪 Running Tests

### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📝 Development Workflow

1. **Create a new branch** for your feature
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the project structure

3. **Run tests** to ensure everything works
   ```bash
   # Backend
   cd backend && pytest
   
   # Frontend
   cd frontend && npm test
   ```

4. **Commit and push** your changes
   ```bash
   git add .
   git commit -m "Add your feature description"
   git push origin feature/your-feature-name
   ```

## 🔍 Useful Commands

### Backend Commands
```bash
# Start development server
uvicorn app.main:app --reload

# Run tests with coverage
pytest --cov=app tests/

# Format code
black app/ tests/
isort app/ tests/

# Type checking
mypy app/

# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

### Frontend Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
- Verify your `DATABASE_URL` in the `.env` file
- Ensure your Supabase project is active
- Check if database migrations have been applied

#### 2. CORS Errors
- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Ensure both frontend and backend are running on expected ports

#### 3. Environment Variable Issues
- Double-check all `.env` files are properly configured
- Restart both servers after changing environment variables

#### 4. Port Already in Use
```bash
# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Getting Help

1. Check the [project documentation](../README.md)
2. Review the [UX specification](../UX_SPECIFICATION.md)
3. Check the [database schema](../DATABASE_SCHEMA.md)
4. Look at existing issues in the repository

## 📚 Next Steps

Once you have the development environment running:

1. **Explore the codebase** - Familiarize yourself with the project structure
2. **Read the specifications** - Review the UX and database documentation
3. **Run the tests** - Understand how testing works in the project
4. **Make a small change** - Try adding a simple feature to understand the workflow

---

## 🚀 Production Deployment Setup

Complete these steps to prepare for MVP launch:

### ✅ Pre-Development Checklist

#### 1. Database Setup (Supabase)
- [ ] **Create Production Database**
  ```bash
  # Go to https://supabase.com and create a new project
  # Copy the database URL and service keys
  # Update your .env files with production credentials
  ```

- [ ] **Run Database Migrations**
  ```sql
  -- Copy the complete schema from DATABASE_SCHEMA.md
  -- Run in Supabase SQL Editor or via migrations
  
  -- Core tables (Phase 1)
  CREATE TYPE user_role_enum AS ENUM ('traveler', 'local');
  CREATE TYPE availability_enum AS ENUM ('available', 'busy', 'away', 'offline');
  -- ... (copy all tables from DATABASE_SCHEMA.md)
  ```

- [ ] **Set Row Level Security (RLS)**
  ```sql
  -- Enable RLS on all tables
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  -- ... (enable for all tables)
  ```

#### 2. Frontend Deployment (Vercel)
- [ ] **Connect Repository to Vercel**
  ```bash
  # Go to https://vercel.com
  # Import your GitHub repository
  # Configure build settings:
  # - Framework: Next.js
  # - Build Command: npm run build
  # - Output Directory: .next
  ```

- [ ] **Configure Environment Variables**
  ```bash
  # In Vercel Dashboard → Settings → Environment Variables
  NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
  NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com/ws
  NEXT_PUBLIC_APP_NAME=LocalGhost
  ```

- [ ] **Get Production Domain**
  ```bash
  # Your app will be available at:
  # https://your-project-name.vercel.app
  # 
  # Optional: Configure custom domain in Vercel settings
  ```

#### 3. Backend Deployment (Render)
- [ ] **Create Web Service on Render**
  ```bash
  # Go to https://render.com
  # Create new Web Service from GitHub
  # Configure settings:
  # - Environment: Python 3
  # - Build Command: pip install -r backend/requirements/prod.txt
  # - Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
  # - Root Directory: backend
  ```

- [ ] **Configure Environment Variables**
  ```bash
  # In Render Dashboard → Environment
  DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
  SECRET_KEY=your-production-secret-key-very-long-and-secure
  SUPABASE_URL=https://[PROJECT].supabase.co
  SUPABASE_KEY=your-supabase-anon-key
  SUPABASE_SERVICE_KEY=your-supabase-service-role-key
  ALLOWED_ORIGINS=["https://your-frontend.vercel.app"]
  DEBUG=false
  ```

- [ ] **Generate Secure Secret Key**
  ```bash
  # Generate a secure secret key
  openssl rand -hex 32
  # Use this for your SECRET_KEY environment variable
  ```

#### 4. Security & Configuration
- [ ] **Update CORS Settings**
  ```bash
  # Update backend/app/main.py ALLOWED_ORIGINS
  # Include your production Vercel domain
  ```

- [ ] **Database Connection Testing**
  ```bash
  # Test database connection from Render
  # Check Render logs for any connection issues
  ```

- [ ] **SSL & HTTPS Verification**
  ```bash
  # Verify both frontend and backend use HTTPS
  # Test API calls from frontend to backend
  ```

#### 5. Monitoring & Health Checks
- [ ] **Set Up Health Endpoints**
  ```bash
  # Verify these endpoints work in production:
  # https://your-backend.onrender.com/health
  # https://your-backend.onrender.com/docs
  ```

- [ ] **Configure Uptime Monitoring**
  ```bash
  # Consider using:
  # - Render's built-in monitoring
  # - UptimeRobot (free)
  # - Better Uptime
  ```

#### 6. Domain & DNS (Optional)
- [ ] **Custom Domain Setup**
  ```bash
  # If you have a custom domain:
  # 1. Configure DNS in your domain provider
  # 2. Add domain to Vercel (frontend)
  # 3. Add domain to Render (backend)
  # 4. Update CORS and environment variables
  ```

#### 7. Final Testing Checklist
- [ ] **End-to-End Testing**
  - [ ] Frontend loads at production URL
  - [ ] Backend API responds at production URL
  - [ ] Database queries work (check Supabase logs)
  - [ ] CORS works between frontend and backend
  - [ ] WebSocket connections work (for future chat)

- [ ] **Performance Testing**
  - [ ] Frontend Lighthouse scores (aim for 90+ Performance)
  - [ ] Backend response times under 500ms
  - [ ] Database query performance

- [ ] **Security Testing**
  - [ ] Environment variables are secure
  - [ ] No sensitive data in client-side code
  - [ ] HTTPS enforced on all services

### 🎯 Ready for Development!

Once all checkboxes are completed:

1. ✅ **Database**: Tables created, RLS enabled, connection tested
2. ✅ **Frontend**: Deployed to Vercel with production environment
3. ✅ **Backend**: Deployed to Render with secure configuration  
4. ✅ **Integration**: All services communicate correctly
5. ✅ **Monitoring**: Health checks and monitoring in place

**Your production URLs:**
- Frontend: `https://your-project.vercel.app`
- Backend API: `https://your-backend.onrender.com`
- API Docs: `https://your-backend.onrender.com/docs`

**You are now ready to start building features! 🎉**

---

Happy coding! 🚀