from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import core modules
from app.core.config import settings, get_cors_config
from app.core.error_handlers import setup_error_handlers
from app.core.middleware import setup_middleware, health_check_with_metrics
from app.core.caching import cache_manager
from app.core.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    print("🚀 Starting LocalGhost API...")
    
    # Initialize database
    await init_db()
    print("✅ Database initialized")
    
    # Initialize cache
    await cache_manager.connect()
    print("✅ Cache system initialized")
    
    # Initialize Sentry if configured
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[
                FastApiIntegration(auto_enabling_instrumentations=False),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
            environment=settings.ENVIRONMENT,
        )
        print("✅ Sentry monitoring initialized")
    
    print(f"🎯 LocalGhost API v{settings.APP_VERSION} ready!")
    print(f"🌍 Environment: {settings.ENVIRONMENT}")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down LocalGhost API...")
    await cache_manager.disconnect()
    print("✅ Cache system disconnected")
    print("👋 LocalGhost API shutdown complete")

# Create FastAPI app instance with lifespan management
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="A peer-to-peer travel connection platform API",
    debug=settings.DEBUG,
    lifespan=lifespan
)

# Configure CORS
cors_config = get_cors_config()
app.add_middleware(
    CORSMiddleware,
    **cors_config
)

# Setup error handlers
setup_error_handlers(app)

# Setup custom middleware
setup_middleware(app)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "LocalGhost API is running!",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "api": "/api/v1",
        "health": "/health"
    }

# Enhanced health check endpoint
@app.get("/health")
async def health_check():
    return await health_check_with_metrics()

# Include API routes
from app.api.v1.router import api_router
app.include_router(api_router, prefix="/api/v1")