# LocalGhost 🌟

> A peer-to-peer travel connection platform where travelers connect directly with locals for authentic guidance, recommendations, and companionship in exploring destinations.

## 🎯 Vision

Making travel more personal, authentic, and connected by bridging the gap between explorers and the people who know a place best.

## 🏗️ Architecture

```
localghost/
├── frontend/          # Next.js + TailwindCSS
├── backend/           # FastAPI + PostgreSQL
├── docs/              # Documentation
├── scripts/           # Development & deployment scripts
└── .env.example       # Environment variables template
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (via Supabase)

### Development Setup

1. **Clone and setup**
   ```bash
   git clone <your-repo-url>
   cd localghost
   ./scripts/dev/setup.sh
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Fill in your environment variables
   ```

3. **Start Development Servers**
   ```bash
   # Terminal 1 - Frontend
   cd frontend
   npm run dev

   # Terminal 2 - Backend
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

## 📁 Project Structure

### Frontend (`/frontend`)
```
frontend/
├── components/        # React components
│   ├── ui/           # Reusable UI components
│   ├── forms/        # Form components
│   ├── layout/       # Layout components
│   ├── chat/         # Chat-related components
│   ├── profile/      # Profile components
│   └── search/       # Search components
├── pages/            # Next.js pages
├── lib/              # Utilities and configurations
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── styles/           # Global styles
```

### Backend (`/backend`)
```
backend/
├── app/
│   ├── api/          # API routes
│   │   └── v1/       # API version 1
│   ├── core/         # Core configurations
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Business logic
│   ├── utils/        # Helper functions
│   └── websockets/   # Real-time functionality
├── alembic/          # Database migrations
├── tests/            # Test suite
└── requirements/     # Dependencies
```

## 🔧 Development

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
npm test             # Run tests
```

### Backend Development
```bash
cd backend
uvicorn app.main:app --reload    # Start development server
pytest                          # Run tests
black .                         # Format code
alembic upgrade head            # Run migrations
```

## 📋 Available Scripts

- `./scripts/dev/setup.sh` - Initial development setup
- `./scripts/database/migrate.sh` - Run database migrations
- `./scripts/deployment/deploy.sh` - Deploy to production

## 🗃️ Database

- **Database**: PostgreSQL via Supabase
- **ORM**: SQLAlchemy (async)
- **Migrations**: Alembic

See `DATABASE_SCHEMA.md` for complete schema documentation.

## 🎨 UI/UX

- **Framework**: Next.js 14
- **Styling**: TailwindCSS
- **Design System**: Airbnb-inspired modern interface
- **Components**: Headless UI + Custom components

See `UX_SPECIFICATION.md` for complete UI/UX documentation.

## 🔐 Authentication

- **Method**: JWT-based authentication
- **Storage**: HTTP-only cookies (planned)
- **Signup**: Email + Password + Role selection
- **No complex authorization**: Simple role-based access (traveler/local)

## 🚀 Deployment

### Frontend (Vercel)
- Automatic deployment from `main` branch
- Environment variables configured in Vercel dashboard

### Backend (Render)
- Automatic deployment from `main` branch
- Environment variables configured in Render dashboard

### Database (Supabase)
- Managed PostgreSQL instance
- Connection via environment variables

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm test              # Unit tests with Jest
npm run test:coverage # Coverage report
```

### Backend Testing
```bash
cd backend
pytest                # All tests
pytest tests/unit     # Unit tests only
pytest tests/integration # Integration tests only
```

## 📚 Documentation

- `UX_SPECIFICATION.md` - Complete UI/UX guide
- `DATABASE_SCHEMA.md` - Database design and schema
- `BACKEND_SPECIFICATION.md` - Backend architecture guide
- `docs/api/` - API documentation
- `docs/deployment/` - Deployment guides

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

---

**Built with ❤️ for authentic travel connections**