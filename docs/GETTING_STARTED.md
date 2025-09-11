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

Happy coding! 🚀