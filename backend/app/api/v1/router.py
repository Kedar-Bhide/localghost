from fastapi import APIRouter
from app.api.v1.endpoints import auth, profile, users, locals

# Create the main API router for v1
api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Include profile routes (legacy)
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])

# Include user management routes
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Include local guide routes
api_router.include_router(locals.router, prefix="/locals", tags=["local-guides"])

@api_router.get("/")
async def api_root():
    return {
        "message": "LocalGhost API v1", 
        "status": "ready", 
        "endpoints": ["/auth", "/profile", "/users", "/locals"]
    }