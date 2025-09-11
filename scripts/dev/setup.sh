#!/bin/bash
# Development environment setup script

echo "🚀 Setting up LocalGhost development environment..."

# Check if Python 3.11+ is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Backend setup
echo "📦 Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements/dev.txt

# Frontend setup
echo "🎨 Setting up frontend..."
cd ../frontend
npm install

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and fill in your environment variables"
echo "2. Run 'npm run dev' in the frontend directory"
echo "3. Run 'uvicorn app.main:app --reload' in the backend directory"