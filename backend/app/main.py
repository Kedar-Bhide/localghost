from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app instance
app = FastAPI(
    title="LocalGhost API",
    version="1.0.0",
    description="A peer-to-peer travel connection platform API"
)

# Configure CORS origins
allowed_origins = [
    "http://localhost:3000",  # Local development
    "https://trylocalghost.vercel.app",  # Production frontend
]

# Add environment-based origins if specified
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    try:
        import json
        additional_origins = json.loads(env_origins)
        allowed_origins.extend(additional_origins)
    except (json.JSONDecodeError, TypeError):
        pass

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "LocalGhost API is running!", "docs": "/docs", "api": "/api/v1"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "LocalGhost API"}

# Include API routes
from app.api.v1.router import api_router

app.include_router(api_router, prefix="/api/v1")