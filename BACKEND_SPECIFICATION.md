# LocalGhost - Backend Specification (FastAPI)

*Complete backend architecture guide for MVP using FastAPI, PostgreSQL, and modern deployment practices.*

---

## 1. Tech Stack Overview

### Core Technologies
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Custom JWT implementation (simple email/password)
- **Real-time**: WebSockets for chat functionality
- **File Storage**: Supabase Storage for profile images/attachments
- **Deployment**: Render (free tier)

### Key Libraries
```python
# Core Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0

# Database & ORM
asyncpg==0.29.0
sqlalchemy[asyncio]==2.0.23
alembic==1.12.1

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# Real-time & WebSockets
websockets==12.0

# Environment & Configuration
pydantic-settings==2.1.0
python-dotenv==1.0.0

# Development & Testing
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
```

---

## 2. Architecture Overview

### Monolithic Structure
```
backend/
├── app/
│   ├── api/                 # API routes
│   ├── core/               # Configuration, security
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   └── websockets/         # Real-time functionality
├── alembic/                # Database migrations
├── tests/                  # Test suite
└── requirements/           # Dependency management
```

### Key Design Principles
- **Async-first**: All database operations async
- **Dependency injection**: FastAPI's DI system
- **Schema validation**: Pydantic for request/response
- **Clean separation**: Routes → Services → Models
- **Type hints**: Full type coverage for maintainability

---

## 3. Database Integration

### Connection Management
```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Async connection pool for Supabase
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

### Model Structure
```python
# app/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class User(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(Enum(UserRole), nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    # ... additional fields
```

---

## 4. Authentication System

### Simple JWT Implementation
```python
# app/core/auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)
```

### Authentication Flow
1. **Signup**: Hash password, store user, return JWT
2. **Login**: Verify credentials, return JWT
3. **Protected routes**: JWT middleware validation
4. **No complex authorization**: Role-based access only (traveler/local)

---

## 5. API Structure

### Route Organization
```python
# app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, locals, chats, itineraries

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(locals.router, prefix="/locals", tags=["locals"])
api_router.include_router(chats.router, prefix="/chats", tags=["chats"])
api_router.include_router(itineraries.router, prefix="/itineraries", tags=["itineraries"])
```

### Endpoint Examples
```python
# app/api/v1/endpoints/auth.py
@router.post("/signup", response_model=schemas.UserResponse)
async def signup(
    user_data: schemas.UserCreate,
    db: AsyncSession = Depends(get_db)
):
    return await auth_service.create_user(db, user_data)

@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    credentials: schemas.UserLogin,
    db: AsyncSession = Depends(get_db)
):
    return await auth_service.authenticate_user(db, credentials)
```

---

## 6. Real-time Chat Implementation

### WebSocket Manager
```python
# app/websockets/chat_manager.py
from typing import Dict, List
from fastapi import WebSocket

class ChatManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)
    
    async def broadcast_message(self, conversation_id: str, message: dict):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                await connection.send_json(message)

chat_manager = ChatManager()
```

### WebSocket Endpoints
```python
# app/websockets/chat.py
@router.websocket("/chats/{conversation_id}/live")
async def chat_websocket(
    websocket: WebSocket,
    conversation_id: str,
    current_user: User = Depends(get_current_user_ws)
):
    await chat_manager.connect(websocket, conversation_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Process and broadcast message
            await chat_manager.broadcast_message(conversation_id, processed_data)
    except WebSocketDisconnect:
        await chat_manager.disconnect(websocket, conversation_id)
```

---

## 7. Business Logic Services

### Service Layer Pattern
```python
# app/services/chat_service.py
class ChatService:
    async def create_conversation(
        self, 
        db: AsyncSession, 
        traveler_id: UUID, 
        local_id: UUID
    ) -> Conversation:
        # Business logic for conversation creation
        # Check if conversation exists, create if not
        pass
    
    async def send_message(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        sender_id: UUID,
        content: str
    ) -> Message:
        # Business logic for message sending
        # Validate, save, trigger notifications
        pass
```

### Error Handling
```python
# app/core/exceptions.py
from fastapi import HTTPException

class LocalGhostException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)

class UserNotFoundError(LocalGhostException):
    def __init__(self):
        super().__init__(status_code=404, detail="User not found")

class ConversationNotFoundError(LocalGhostException):
    def __init__(self):
        super().__init__(status_code=404, detail="Conversation not found")
```

---

## 8. File Upload & Storage

### Supabase Storage Integration
```python
# app/services/storage_service.py
from supabase import create_client

class StorageService:
    def __init__(self):
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    async def upload_profile_image(
        self, 
        user_id: str, 
        file_content: bytes, 
        content_type: str
    ) -> str:
        """Upload profile image and return public URL"""
        bucket = "profile-images"
        file_path = f"{user_id}/{uuid.uuid4()}.jpg"
        
        result = self.supabase.storage.from_(bucket).upload(
            file_path, file_content, {"content-type": content_type}
        )
        
        return self.supabase.storage.from_(bucket).get_public_url(file_path)
```

---

## 9. Configuration & Environment

### Settings Management
```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Configuration
    APP_NAME: str = "LocalGhost API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    # Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:3000"]  # Next.js dev server
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### CORS Configuration
```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 10. Testing Strategy

### Test Structure
```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.main import app
from app.core.database import get_db

@pytest.fixture
async def test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    # Setup test database
    yield session
    # Cleanup

@pytest.fixture
def client(test_db):
    app.dependency_overrides[get_db] = lambda: test_db
    return TestClient(app)
```

### Test Examples
```python
# tests/test_auth.py
def test_signup(client):
    response = client.post("/api/v1/auth/signup", json={
        "email": "test@example.com",
        "password": "testpass123",
        "full_name": "Test User",
        "role": "traveler"
    })
    assert response.status_code == 201
    assert "access_token" in response.json()
```

---

## 11. Deployment Configuration

### Render Deployment
```python
# render.yaml
services:
  - type: web
    name: localghost-api
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        generateValue: true
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
```

### Production Optimizations
```python
# app/main.py
import logging
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database connections
    yield
    # Shutdown: Close connections

app = FastAPI(
    title="LocalGhost API",
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    lifespan=lifespan
)
```

---

## 12. Development Workflow

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "Add users table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Local Development
```bash
# Install dependencies
pip install -r requirements/dev.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v

# Format code
black app/ tests/
isort app/ tests/
```

---

## 13. Security Considerations

### Input Validation
- All inputs validated via Pydantic schemas
- SQL injection prevention via SQLAlchemy
- Password hashing with bcrypt
- Rate limiting on auth endpoints

### Data Protection
- Environment variables for secrets
- HTTPS only in production
- Secure headers middleware
- Input sanitization for XSS prevention

---

## 14. Monitoring & Logging

### Structured Logging
```python
# app/core/logging.py
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("localghost")
```

### Health Checks
```python
# app/api/v1/endpoints/health.py
@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database connection failed")
```

---

*This specification provides a robust, production-ready backend architecture for LocalGhost MVP. The FastAPI implementation ensures rapid development while maintaining scalability and maintainability.*